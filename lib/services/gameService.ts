import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  query,
  where,
  getDocs,
  runTransaction,
  increment,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { nanoid } from "nanoid";
import {
  Game,
  GameStatus,
  PlayerStatus,
  CreateGameParams,
  JoinGameParams,
  CreateGameResponse,
  GameResponse,
  GamePlayer,
} from "@/types/game";
import { CardDeck } from "@/types/cards";

/**
 * Game Service - Handles all game-related operations with Firestore
 */
export class GameService {
  private readonly gamesCollection = "games";
  private readonly cardDecksCollection = "decks";

  /**
   * Generate a unique invite code for a game
   * @returns A unique 6-character alphanumeric code
   */
  private generateInviteCode(): string {
    // Generate a 6-character alphanumeric code
    return nanoid(6).toUpperCase();
  }

  /**
   * Create a new game
   * @param params Game creation parameters
   * @returns Response with game ID and invite code
   */
  async createGame(params: CreateGameParams): Promise<CreateGameResponse> {
    try {
      // Generate a unique ID for the game
      const gameId = doc(collection(db, this.gamesCollection)).id;

      // Generate a unique invite code
      const inviteCode = this.generateInviteCode();

      // Create the host player object
      const hostPlayer: GamePlayer = {
        uid: params.hostId,
        displayName: params.hostDisplayName,
        photoURL: params.hostPhotoURL || "",
        status: PlayerStatus.JOINED,
        isHost: true,
        joinedAt: Timestamp.now(),
        lastActive: Timestamp.now(),
      };

      // Create the game object
      const game: Omit<Game, "id"> = {
        status: GameStatus.LOBBY,
        settings: {
          ...params.settings,
          // Ensure player limit is within bounds
          playerLimit: Math.min(Math.max(params.settings.playerLimit, 3), 10),
        },
        players: {
          [params.hostId]: hostPlayer,
        },
        hostId: params.hostId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        inviteCode,
      };

      // Create the game document in Firestore
      await setDoc(doc(db, this.gamesCollection, gameId), {
        id: gameId,
        ...game,
      });

      // Also create an inviteCode -> gameId mapping for easy lookup
      await setDoc(doc(db, "inviteCodes", inviteCode), {
        gameId,
        createdAt: Timestamp.now(),
      });

      return {
        gameId,
        inviteCode,
        success: true,
      };
    } catch (error) {
      console.error("Error creating game:", error);
      return {
        gameId: "",
        inviteCode: "",
        success: false,
        error: "Failed to create game. Please try again.",
      };
    }
  }

  /**
   * Find a game by its invite code
   * @param inviteCode The invite code to look up
   * @returns The game ID if found, or null if not found
   */
  async findGameByInviteCode(inviteCode: string): Promise<string | null> {
    try {
      if (!inviteCode || inviteCode.trim() === "") {
        console.warn("Empty invite code provided");
        return null;
      }

      // Normalize the invite code to uppercase
      const normalizedCode = inviteCode.trim().toUpperCase();

      // Get the invite code document
      const inviteCodeDoc = await getDoc(
        doc(db, "inviteCodes", normalizedCode)
      );

      if (inviteCodeDoc.exists()) {
        const data = inviteCodeDoc.data();
        if (data && data.gameId) {
          // Verify the game still exists
          const gameDoc = await getDoc(
            doc(db, this.gamesCollection, data.gameId)
          );
          if (gameDoc.exists()) {
            const game = gameDoc.data() as Game;
            // Only return active games (lobby or playing)
            if (
              game.status === GameStatus.LOBBY ||
              game.status === GameStatus.PLAYING
            ) {
              return data.gameId;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Error finding game by invite code:", error);
      return null;
    }
  }

  /**
   * Get a game by its ID
   * @param gameId The game ID to look up
   * @returns The game object if found, or null if not found
   */
  async getGame(gameId: string): Promise<Game | null> {
    try {
      const gameDoc = await getDoc(doc(db, this.gamesCollection, gameId));

      if (gameDoc.exists()) {
        return gameDoc.data() as Game;
      }

      return null;
    } catch (error) {
      console.error("Error getting game:", error);
      return null;
    }
  }

  /**
   * Join a game
   * @param params Parameters for joining a game
   * @returns Response indicating success or failure
   */
  async joinGame(params: JoinGameParams): Promise<GameResponse> {
    try {
      // Reference to the game document
      const gameRef = doc(db, this.gamesCollection, params.gameId);

      // Get the current game state
      const gameDoc = await getDoc(gameRef);

      if (!gameDoc.exists()) {
        return {
          success: false,
          error: "Game not found",
        };
      }

      const game = gameDoc.data() as Game;

      // Check if the game is in a joinable state
      if (game.status !== GameStatus.LOBBY) {
        return {
          success: false,
          error: "Game has already started or ended",
        };
      }

      // Check if the player is already in the game
      if (game.players[params.userId]) {
        // Player is rejoining, update their status
        await updateDoc(gameRef, {
          [`players.${params.userId}.status`]: PlayerStatus.JOINED,
          [`players.${params.userId}.lastActive`]: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        return {
          success: true,
          gameId: params.gameId,
        };
      }

      // Check if the game is full
      if (Object.keys(game.players).length >= game.settings.playerLimit) {
        return {
          success: false,
          error: "Game is full",
        };
      }

      // Create the player object
      const player: GamePlayer = {
        uid: params.userId,
        displayName: params.displayName,
        photoURL: params.photoURL || "",
        status: PlayerStatus.JOINED,
        isHost: false,
        joinedAt: Timestamp.now(),
        lastActive: Timestamp.now(),
      };

      // With the updated security rules, any player with the game ID can join
      // Update the game document with the new player
      await updateDoc(gameRef, {
        [`players.${params.userId}`]: player,
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        gameId: params.gameId,
      };
    } catch (error) {
      console.error("Error joining game:", error);
      return {
        success: false,
        error: "Failed to join game. Please try again.",
      };
    }
  }

  /**
   * Set player readiness status
   * @param gameId The game ID
   * @param userId The user ID
   * @param ready Whether the player is ready
   * @returns Response indicating success or failure
   */
  async setPlayerReady(
    gameId: string,
    userId: string,
    ready: boolean
  ): Promise<GameResponse> {
    try {
      // Reference to the game document
      const gameRef = doc(db, this.gamesCollection, gameId);

      // Get the current game state
      const gameDoc = await getDoc(gameRef);

      if (!gameDoc.exists()) {
        return {
          success: false,
          error: "Game not found",
        };
      }

      const game = gameDoc.data() as Game;

      // Check if the player is in the game
      if (!game.players[userId]) {
        return {
          success: false,
          error: "Player not in game",
        };
      }

      // Update the player's status
      await updateDoc(gameRef, {
        [`players.${userId}.status`]: ready
          ? PlayerStatus.READY
          : PlayerStatus.JOINED,
        [`players.${userId}.lastActive`]: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        gameId,
      };
    } catch (error) {
      console.error("Error setting player ready status:", error);
      return {
        success: false,
        error: "Failed to update ready status. Please try again.",
      };
    }
  }

  /**
   * Start the game (host only)
   * @param gameId The game ID
   * @param hostId The host ID (for verification)
   * @returns Response indicating success or failure
   */
  async startGame(gameId: string, hostId: string): Promise<GameResponse> {
    try {
      // Use a transaction to ensure data consistency
      return await runTransaction(db, async (transaction) => {
        // Reference to the game document
        const gameRef = doc(db, this.gamesCollection, gameId);

        // Get the current game state
        const gameDoc = await transaction.get(gameRef);

        if (!gameDoc.exists()) {
          return {
            success: false,
            error: "Game not found",
          };
        }

        const game = gameDoc.data() as Game;

        // Verify the user is the host
        if (game.hostId !== hostId) {
          return {
            success: false,
            error: "Only the host can start the game",
          };
        }

        // Check if the game is in lobby state
        if (game.status !== GameStatus.LOBBY) {
          return {
            success: false,
            error: "Game has already started or ended",
          };
        }

        // Count ready players
        const players = Object.values(game.players);
        const readyPlayers = players.filter(
          (p) => p.status === PlayerStatus.READY
        );

        // Need at least 3 players (including host) and all must be ready
        if (players.length < 3) {
          return {
            success: false,
            error: "Need at least 3 players to start",
          };
        }

        // Check if all non-host players are ready
        const nonHostPlayers = players.filter((p) => !p.isHost);
        const allNonHostReady = nonHostPlayers.every(
          (p) => p.status === PlayerStatus.READY
        );

        if (!allNonHostReady) {
          return {
            success: false,
            error: "All players must be ready to start",
          };
        }

        // Randomly select the first dealer
        const playerIds = Object.keys(game.players);
        const firstDealerId =
          playerIds[Math.floor(Math.random() * playerIds.length)];

        // Update all players to playing status
        const playerUpdates: Record<string, any> = {};
        playerIds.forEach((pid) => {
          playerUpdates[`players.${pid}.status`] = PlayerStatus.PLAYING;
        });

        // Update the game status
        transaction.update(gameRef, {
          status: GameStatus.PLAYING,
          currentRound: 1,
          currentDealerId: firstDealerId,
          startedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...playerUpdates,
        });

        return {
          success: true,
          gameId,
        };
      });
    } catch (error) {
      console.error("Error starting game:", error);
      return {
        success: false,
        error: "Failed to start game. Please try again.",
      };
    }
  }

  /**
   * Kick a player from the game (host only)
   * @param gameId The game ID
   * @param hostId The host ID (for verification)
   * @param playerIdToKick The ID of the player to kick
   * @returns Response indicating success or failure
   */
  async kickPlayer(
    gameId: string,
    hostId: string,
    playerIdToKick: string
  ): Promise<GameResponse> {
    try {
      // Reference to the game document
      const gameRef = doc(db, this.gamesCollection, gameId);

      // Get the current game state
      const gameDoc = await getDoc(gameRef);

      if (!gameDoc.exists()) {
        return {
          success: false,
          error: "Game not found",
        };
      }

      const game = gameDoc.data() as Game;

      // Verify the user is the host
      if (game.hostId !== hostId) {
        return {
          success: false,
          error: "Only the host can kick players",
        };
      }

      // Check if the player to kick is in the game
      if (!game.players[playerIdToKick]) {
        return {
          success: false,
          error: "Player not in game",
        };
      }

      // Cannot kick the host
      if (playerIdToKick === hostId) {
        return {
          success: false,
          error: "Cannot kick the host",
        };
      }

      // Remove the player from the game
      const playerUpdates: Record<string, any> = {};
      playerUpdates[`players.${playerIdToKick}`] = null; // This will remove the field

      await updateDoc(gameRef, {
        ...playerUpdates,
        updatedAt: serverTimestamp(),
      });

      return {
        success: true,
        gameId,
      };
    } catch (error) {
      console.error("Error kicking player:", error);
      return {
        success: false,
        error: "Failed to kick player. Please try again.",
      };
    }
  }

  /**
   * Leave a game
   * @param gameId The game ID
   * @param userId The user ID
   * @returns Response indicating success or failure
   */
  async leaveGame(gameId: string, userId: string): Promise<GameResponse> {
    try {
      // Reference to the game document
      const gameRef = doc(db, this.gamesCollection, gameId);

      // Get the current game state
      const gameDoc = await getDoc(gameRef);

      if (!gameDoc.exists()) {
        return {
          success: false,
          error: "Game not found",
        };
      }

      const game = gameDoc.data() as Game;

      // Check if the player is in the game
      if (!game.players[userId]) {
        return {
          success: false,
          error: "Player not in game",
        };
      }

      // If the player is the host and the game is in lobby, cancel the game
      if (userId === game.hostId && game.status === GameStatus.LOBBY) {
        await updateDoc(gameRef, {
          status: GameStatus.CANCELLED,
          updatedAt: serverTimestamp(),
        });

        return {
          success: true,
          gameId,
        };
      }

      // If the game is in progress, mark the player as disconnected
      if (game.status === GameStatus.PLAYING) {
        await updateDoc(gameRef, {
          [`players.${userId}.status`]: PlayerStatus.DISCONNECTED,
          [`players.${userId}.lastActive`]: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // If the game is in lobby, remove the player
        const playerUpdates: Record<string, any> = {};
        playerUpdates[`players.${userId}`] = null; // This will remove the field

        await updateDoc(gameRef, {
          ...playerUpdates,
          updatedAt: serverTimestamp(),
        });
      }

      return {
        success: true,
        gameId,
      };
    } catch (error) {
      console.error("Error leaving game:", error);
      return {
        success: false,
        error: "Failed to leave game. Please try again.",
      };
    }
  }

  /**
   * Get active games for a user
   * @param userId The user ID
   * @param useListener Whether to use a real-time listener (for dashboard)
   * @param onUpdate Callback for listener updates
   * @param onError Callback for listener errors
   * @returns Either a Promise<Game[]> or an unsubscribe function
   */
  getActiveGamesForUser(
    userId: string,
    useListener: boolean = false,
    onUpdate?: (games: Game[]) => void,
    onError?: (error: Error) => void
  ): Promise<Game[]> | (() => void) {
    if (!userId) {
      console.warn("No user ID provided to getActiveGamesForUser");
      if (useListener && onUpdate) {
        onUpdate([]);
        return () => {}; // Empty unsubscribe function
      }
      return Promise.resolve([]);
    }

    // Create the query for active games
    const gamesQuery = query(
      collection(db, this.gamesCollection),
      where("status", "in", [GameStatus.LOBBY, GameStatus.PLAYING])
    );

    // If using a listener, set up the subscription
    if (useListener) {
      console.log("Setting up real-time listener for active games");

      // Set up the snapshot listener
      const unsubscribe = onSnapshot(
        gamesQuery,
        (querySnapshot: QuerySnapshot<DocumentData>) => {
          // Process the snapshot data
          const games: Game[] = [];

          querySnapshot.forEach((doc) => {
            const gameData = doc.data() as Game;
            if (gameData.players && gameData.players[userId]) {
              games.push(gameData);
            }
          });

          console.log(
            `Real-time update: Found ${games.length} active games for user ${userId}`
          );

          // Call the update callback with the games
          if (onUpdate) {
            onUpdate(games);
          }
        },
        (error) => {
          console.error("Error in active games listener:", error);
          if (onError) {
            onError(error);
          }
        }
      );

      // Return the unsubscribe function
      return unsubscribe;
    }

    // If not using a listener, use the regular promise-based approach
    return new Promise<Game[]>(async (resolve, reject) => {
      try {
        const querySnapshot = await getDocs(gamesQuery);

        // If no active games at all, return empty array
        if (querySnapshot.empty) {
          resolve([]);
          return;
        }

        // Filter for games where the user is a player
        const games: Game[] = [];
        querySnapshot.forEach((doc) => {
          const gameData = doc.data() as Game;
          if (gameData.players && gameData.players[userId]) {
            games.push(gameData);
          }
        });

        resolve(games);
      } catch (error) {
        console.error("Error getting active games for user:", error);
        reject(error);
        return [];
      }
    });
  }

  /**
   * Get all available card decks
   * @returns Array of card decks
   */
  async getCardDecks(): Promise<CardDeck[]> {
    try {
      // Simpler collection fetch without complex queries to work with security rules
      const decksSnapshot = await getDocs(collection(db, this.cardDecksCollection));
      const decks: CardDeck[] = [];

      // Process the results, sorting in memory instead of in the query
      decksSnapshot.forEach((doc) => {
        const deckData = doc.data() as CardDeck;
        decks.push({
          id: doc.id,
          ...deckData,
        });
      });

      // Sort the decks by isNsfw (false first) and then by name
      decks.sort((a, b) => {
        // First by isNsfw (false comes first)
        if (a.isNsfw !== b.isNsfw) {
          return a.isNsfw ? 1 : -1;
        }
        // Then by name
        return a.name.localeCompare(b.name);
      });

      return decks;
    } catch (error) {
      console.error("Error fetching card decks:", error);
      
      // Return an empty array rather than default decks to avoid potential type errors
      return [];
    }
  }
}
