import {
  collection,
  doc,
  runTransaction,
  getDoc,
  getDocs,
  query,
  limit,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  WriteBatch,
  DocumentReference,
  DocumentSnapshot,
  QuerySnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import {
  GameState,
  GameRound,
  RoundPhase,
  GameResponse,
} from "@/types/gameplay";
import { Game, GamePlayer, GameSettings, GameStatus } from "@/types/game";
import { CardDeck, CardType, WhiteCard, BlackCard } from "@/types/cards";
import {
  ErrorTrackingService,
  GameEvents,
} from "@/lib/services/errorTrackingService";

// Constants
const DEFAULT_MIN_PLAYERS = 3;
const DEFAULT_CARDS_PER_PLAYER = 7; // Or fetch from game settings if dynamic per game
const DEFAULT_SUBMISSION_TIME_LIMIT_SECONDS = 60;
const DEFAULT_JUDGE_TIME_LIMIT_SECONDS = 60;

export class GameplayService {
  private gamesCollection = "games";
  private cardDecksCollection = "decks";
  private cardsSubcollection = "cards";

  // Helper to shuffle an array
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  // This is inside your GameplayService class in lib/services/gameplayService.ts

  async startGame(gameId: string, hostId: string): Promise<GameResponse> {
    console.log(
      `[GameplayService.startGame] Attempting to start game ${gameId} by host ${hostId}`
    );

    // Phase 1: Pre-Transaction Validations and Data Fetching (Non-transactional reads)
    let gameDocSnapshot: DocumentSnapshot<GameState>;
    let game: GameState;
    let cardDeckData: CardDeck;
    let allBlackCardIds: string[] = [];
    let allWhiteCardIds: string[] = [];
    let effectiveDeckId: string | undefined;

    try {
      const gameRef = doc(
        db,
        this.gamesCollection,
        gameId
      ) as DocumentReference<GameState>;
      gameDocSnapshot = await getDoc(gameRef);

      if (!gameDocSnapshot.exists()) {
        console.error(
          `[GameplayService.startGame] Pre-TX: Game ${gameId} not found.`
        );
        return { success: false, error: `Game ${gameId} not found.` };
      }
      game = gameDocSnapshot.data();

      // 1. Validate Host
      if (game.hostId !== hostId) {
        console.warn(
          `[GameplayService.startGame] Pre-TX: User ${hostId} is not the host of game ${gameId}.`
        );
        return { success: false, error: "Only the host can start the game." };
      }

      // 2. Check Game Status (initial check, will be re-checked in transaction)
      // if (game.status === GameStatus.PLAYING) {
      //   console.log(
      //     `[GameplayService.startGame] Pre-TX: Game ${gameId} is already in progress.`
      //   );
      //   return {
      //     success: true,
      //     message: "Game is already in progress.",
      //     alreadyPlaying: true,
      //     gameStatus: game.status,
      //   }; // Idempotency - return success but indicate game is already playing
      // }
      // if (game.status !== GameStatus.LOBBY) {
      //   console.warn(
      //     `[GameplayService.startGame] Pre-TX: Game ${gameId} is not in LOBBY status (current: ${game.status}).`
      //   );
      //   return {
      //     success: false,
      //     error: `Game is not in LOBBY state. Current status: ${game.status}`,
      //   };
      // }

      // 3. Validate Player Count
      const playerIds = Object.keys(game.players || {});
      const numPlayers = playerIds.length;
      const minPlayers = game.settings.minPlayers || DEFAULT_MIN_PLAYERS;
      if (numPlayers < minPlayers) {
        console.warn(
          `[GameplayService.startGame] Pre-TX: Not enough players in game ${gameId}. Need ${minPlayers}, have ${numPlayers}.`
        );
        return {
          success: false,
          error: `Not enough players. Need at least ${minPlayers} players to start.`,
        };
      }

      /*  // 4. Validate Player Readiness (initial check)
      for (const playerId of playerIds) {
        if (!game.players[playerId]?.isReady) {
          console.warn(
            `[GameplayService.startGame] Pre-TX: Player ${
              game.players[playerId]?.name || playerId
            } in game ${gameId} is not ready.`
          );
          return {
            success: false,
            error: `Player ${
              game.players[playerId]?.name || playerId
            } is not ready.`,
          };
        }
      } */

      // 5. Fetch Card Deck Data and All Card IDs
      effectiveDeckId = game.settings.deckId || game.settings.cardDeckId;
      if (!effectiveDeckId) {
        console.error(
          `[GameplayService.startGame] Pre-TX: No card deck selected for game ${gameId}.`
        );
        return { success: false, error: "No card deck selected for the game." };
      }

      const deckRef = doc(
        db,
        this.cardDecksCollection,
        effectiveDeckId
      ) as DocumentReference<CardDeck>;
      const deckDocSnapshot = await getDoc(deckRef);
      if (!deckDocSnapshot.exists()) {
        console.error(
          `[GameplayService.startGame] Pre-TX: Card deck ${effectiveDeckId} not found for game ${gameId}.`
        );
        return {
          success: false,
          error: `Card deck ${effectiveDeckId} not found.`,
        };
      }
      cardDeckData = deckDocSnapshot.data();

      const blackCardsQuery = query(
        collection(db, this.cardsSubcollection, effectiveDeckId, "black")
      );
      const whiteCardsQuery = query(
        collection(db, this.cardsSubcollection, effectiveDeckId, "white")
      );

      const [blackCardsSnapshot, whiteCardsSnapshot] = await Promise.all([
        getDocs(blackCardsQuery),
        getDocs(whiteCardsQuery),
      ]);

      allBlackCardIds = blackCardsSnapshot.docs.map((d) => d.id);
      allWhiteCardIds = whiteCardsSnapshot.docs.map((d) => d.id);

      if (allBlackCardIds.length === 0) {
        console.error(
          `[GameplayService.startGame] Pre-TX: Deck ${effectiveDeckId} for game ${gameId} has no black cards.`
        );
        return {
          success: false,
          error: `Deck ${effectiveDeckId} has no black cards.`,
        };
      }
      const cardsPerPlayerSetting =
        game.settings.cardsPerPlayer || DEFAULT_CARDS_PER_PLAYER;
      if (allWhiteCardIds.length < numPlayers * cardsPerPlayerSetting) {
        console.error(
          `[GameplayService.startGame] Pre-TX: Deck ${effectiveDeckId} for game ${gameId} has insufficient white cards.`
        );
        return {
          success: false,
          error: `Deck ${effectiveDeckId} has insufficient white cards for ${numPlayers} players (need ${
            numPlayers * cardsPerPlayerSetting
          }).`,
        };
      }

      // 6. Shuffle Cards
      this.shuffleArray(allBlackCardIds);
      this.shuffleArray(allWhiteCardIds);

      // Phase 2: Firestore Transaction
      console.log(
        `[GameplayService.startGame] Starting transaction for game ${gameId}.`
      );
      await runTransaction(db, async (transaction) => {
        console.log(`[GameplayService.startGame TX_START] Game: ${gameId}`);

        // 1. Re-fetch game state for transactional consistency
        const currentTxGameDoc = await transaction.get(gameRef);
        if (!currentTxGameDoc.exists()) {
          console.error(
            `[GameplayService.startGame TX_ERROR] Game ${gameId} ceased to exist mid-transaction.`
          );
          throw new Error(`[TX] Game ${gameId} not found during transaction.`); // This aborts the transaction
        }
        const currentTxGame = currentTxGameDoc.data();

        // // 2. Validate Game Status within Transaction
        // if (currentTxGame.status !== GameStatus.LOBBY) {
        //   // If it's already PLAYING, this isn't an error for the client, but the transaction shouldn't proceed.
        //   // However, if we throw, the client might get a generic error.
        //   // The pre-transaction check for PLAYING status should handle idempotency.
        //   // This check ensures we don't corrupt an active game.
        //   console.warn(
        //     `[GameplayService.startGame TX_WARN] Game ${gameId} not in LOBBY (current: ${currentTxGame.status}). Aborting further TX writes.`
        //   );
        //   throw new Error(
        //     `[TX] Game is not in LOBBY state. Current status: ${currentTxGame.status}`
        //   );
        // }

        // // 3. Validate Player Readiness within Transaction
        const txPlayerIds = Object.keys(currentTxGame.players || {});
        // for (const playerId of txPlayerIds) {
        //   if (!currentTxGame.players[playerId]?.isReady) {
        //     console.warn(
        //       `[GameplayService.startGame TX_ERROR] Player ${
        //         currentTxGame.players[playerId]?.name || playerId
        //       } in game ${gameId} is not ready (checked in TX).`
        //     );
        //     throw new Error(
        //       `[TX] Player ${
        //         currentTxGame.players[playerId]?.name || playerId
        //       } is not ready.`
        //     );
        //   }
        // }

        // 4. Prepare Game Updates
        const gameUpdateData: Partial<GameState> = {
          status: GameStatus.PLAYING,
          currentRoundId: null, // Will be set if round setup is successful
          currentRoundNumber: 1,
          currentJudgeId: txPlayerIds[0], // Simplistic: first player in list is first judge
          cardCzarId: txPlayerIds[0],
          playerOrder: txPlayerIds, // Or a shuffled order if needed
          updatedAt: serverTimestamp(),
          players: { ...currentTxGame.players }, // Start with existing players object
        };

        // 5. Deal Cards
        const cardsToDeal =
          currentTxGame.settings.cardsPerPlayer || DEFAULT_CARDS_PER_PLAYER;
        let whiteCardIdx = 0;
        for (const playerId of txPlayerIds) {
          const hand: string[] = [];
          for (let i = 0; i < cardsToDeal; i++) {
            if (whiteCardIdx < allWhiteCardIds.length) {
              hand.push(allWhiteCardIds[whiteCardIdx++]);
            }
          }
          gameUpdateData.players![playerId] = {
            ...currentTxGame.players[playerId],
            hand: hand,
            submittedCardIds: [],
            hasSubmitted: false,
            score: currentTxGame.players[playerId]?.score || 0, // Ensure score is preserved or initialized
          };
        }

        // 6. Setup First Round
        const firstBlackCardId = allBlackCardIds[0];
        const firstBlackCardDocRef = doc(
          db,
          this.cardsSubcollection, // Corrected: Use cardsSubcollection
          effectiveDeckId!, // The ID of the deck
          "black", // The 'black' subcollection
          firstBlackCardId // The ID of the black card
        ) as DocumentReference<BlackCard>;

        const firstBlackCardSnap = await transaction.get(firstBlackCardDocRef);
        if (!firstBlackCardSnap.exists()) {
          console.error(
            `[GameplayService.startGame TX_ERROR] First black card ${firstBlackCardId} not found in deck ${effectiveDeckId} during transaction for game ${gameId}.`
          );
          throw new Error(
            `[TX] Critical: First black card ${firstBlackCardId} could not be fetched during transaction.`
          );
        }
        const firstBlackCardData = firstBlackCardSnap.data() as BlackCard;

        const firstRoundId = doc(collection(db, "games", gameId, "rounds")).id; // Subcollection approach
        const initialRound: GameRound = {
          roundNumber: 1,
          roundId: firstRoundId,
          gameId: gameId,
          blackCard: {
            id: firstBlackCardId,
            text: firstBlackCardData.text,
            pick: firstBlackCardData.pick || 1,
            draw: firstBlackCardData.draw || 0,
            pack: effectiveDeckId!,
            type: CardType.BLACK,
            isNsfw: firstBlackCardData.isNsfw || false,
          },
          judgeId: gameUpdateData.cardCzarId!,
          dealerId: gameUpdateData.cardCzarId!, // Judge is often also the dealer of the black card
          phase: RoundPhase.SUBMITTING, // Changed from SUBMISSION to SUBMITTING to match enum
          submissions: {},
          winnerId: null,
          winningCardIds: [],
          startedAt: serverTimestamp(),
        };

        // Set the first round data in its own document
        const roundDocRef = doc(
          db,
          this.gamesCollection,
          gameId,
          "rounds",
          firstRoundId
        );
        transaction.set(roundDocRef, initialRound);

        // Also set the round in the root rounds collection for easier querying (if needed)
        // This isn't necessary if you only access rounds as subcollections of games
        // const globalRoundRef = doc(db, "rounds", firstRoundId);
        // transaction.set(globalRoundRef, initialRound);

        gameUpdateData.currentRoundId = firstRoundId;
        gameUpdateData.currentRoundNumber = 1;

        // Perform the main game update
        transaction.update(gameRef, gameUpdateData);
        console.log(
          `[GameplayService.startGame TX_SUCCESS] Game ${gameId} state and first round prepared for commit.`
        );
      }); // End of runTransaction

      // If runTransaction completes without throwing, it was successful.
      console.log(
        `[GameplayService.startGame] Transaction for game ${gameId} completed successfully. Preparing to return success.`
      );

      // Track event AFTER successful transaction, but protect the return
      try {
        ErrorTrackingService.trackGameEvent(GameEvents.GAME_STARTED, {
          gameId,
          userId: hostId,
          playerCount: numPlayers,
        });
      } catch (trackingError: any) {
        console.error(
          `[GameplayService.startGame] Non-critical error tracking game event for ${gameId} after successful start:`,
          trackingError
        );
      }

      console.log(
        `[GameplayService.startGame] FINAL RETURN (SUCCESS) for game ${gameId}.`
      );
      return {
        success: true,
        message: "Game started successfully and first round is set up!",
      };
    } catch (error: any) {
      console.error(
        `[GameplayService.startGame] CAUGHT ERROR for game ${gameId}:`,
        error.message,
        error.stack
      );
      // Attempt to track the error before returning a failure response
      try {
        ErrorTrackingService.trackGameError(error, {
          gameId,
          userId: hostId,
          action: GameEvents.GAME_START_FAILED,
          details: `Error in startGame: ${error.message}`,
        });
      } catch (trackingError: any) {
        console.error(
          `[GameplayService.startGame] Non-critical error tracking failed startGame event for ${gameId}:`,
          trackingError
        );
      }

      // Check if error originated from transaction (will have [TX] prefix if we added it)
      const errorMessage = error.message?.includes("[TX]")
        ? error.message
        : `Failed to start game due to an unexpected error: ${error.message}`;
      console.log(
        `[GameplayService.startGame] FINAL RETURN (FAILURE) for game ${gameId}: ${errorMessage}`
      );
      return { success: false, error: errorMessage };
    }
  }
  async getPlayerHand(gameId: string, playerId: string): Promise<WhiteCard[]> {
    console.log(`getPlayerHand called for game ${gameId}, player ${playerId}`);
    const gameRef = doc(
      db,
      this.gamesCollection,
      gameId
    ) as DocumentReference<GameState>;
    const gameDoc = await getDoc(gameRef);
    if (!gameDoc.exists()) {
      throw new Error("Game not found in getPlayerHand");
    }
    const game = gameDoc.data();
    const player = game.players?.[playerId];
    const handCardIds = player?.hand || [];

    if (handCardIds.length === 0) {
      return [];
    }

    // Assuming game.settings.deckId is valid and accessible here
    const effectiveDeckId = game.settings.deckId || game.settings.cardDeckId;
    if (!effectiveDeckId) {
      console.error("Deck ID not found in game settings for getPlayerHand");
      throw new Error("Deck ID missing in game settings.");
    }

    const cardPromises = handCardIds.map((cardId) =>
      getDoc(doc(db, this.cardsSubcollection, effectiveDeckId, "white", cardId))
    );
    const cardDocs = await Promise.all(cardPromises);

    return cardDocs
      .filter((cardDoc) => cardDoc.exists())
      .map((cardDoc) => ({ id: cardDoc.id, ...cardDoc.data() } as WhiteCard));
  }

  async submitCards(
    gameId: string,
    playerId: string,
    roundNumber: number,
    cardIds: string[]
  ): Promise<GameResponse> {
    console.log(
      `submitCards called for game ${gameId}, player ${playerId}, round ${roundNumber}, cards ${cardIds.join(
        ", "
      )}`
    );
    // Full implementation needed
    return { success: false, error: "submitCards not fully implemented" };
  }

  async selectWinner(
    gameId: string,
    dealerId: string,
    roundNumber: number,
    winnerId: string
  ): Promise<GameResponse> {
    console.log(
      `selectWinner called for game ${gameId}, dealer ${dealerId}, round ${roundNumber}, winner ${winnerId}`
    );
    // Full implementation needed
    return { success: false, error: "selectWinner not fully implemented" };
  }
}

export const gameplayService = new GameplayService();
