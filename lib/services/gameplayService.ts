import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  runTransaction,
  increment,
  arrayUnion,
  arrayRemove,
  query,
  where,
  limit,
  documentId,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Game, GameStatus, PlayerStatus, GameResponse } from "@/types/game";
import {
  BlackCard,
  CardType,
  PlayerSubmission,
  WhiteCard,
  CardDeck,
} from "@/types/cards";
import {
  GameRound,
  RoundPhase,
  PlayerAction,
  PlayerActionType,
  GameState,
} from "@/types/gameplay";

/**
 * Gameplay Service - Handles all gameplay-related operations with Firestore
 */
export class GameplayService {
  private readonly gamesCollection = "games";
  private readonly cardsCollection = "cards";
  private readonly decksCollection = "decks";

  // Cache for processed cards
  private processedCards: {
    blackCards: BlackCard[];
    whiteCards: WhiteCard[];
    decks: CardDeck[];
  } | null = null;

  /**
   * Load processed cards from the JSON file
   * @returns The processed cards or null if the file doesn't exist
   */
  private loadProcessedCards() {
    if (this.processedCards) {
      return this.processedCards;
    }

    try {
      // In a browser environment, we can't use fs directly
      // This is a workaround for development purposes
      // In production, these cards would be loaded from Firestore

      // For now, we'll return null and fall back to our dynamic card generation
      return null;

      // In a Node.js environment, we could do:
      // const filePath = path.join(process.cwd(), 'data', 'processedCards.json');
      // if (fs.existsSync(filePath)) {
      //   const data = fs.readFileSync(filePath, 'utf8');
      //   this.processedCards = JSON.parse(data);
      //   return this.processedCards;
      // }
      // return null;
    } catch (error) {
      console.error("Error loading processed cards:", error);
      return null;
    }
  }

  /**
   * Start a new game
   * @param gameId The game ID
   * @param hostId The host ID (for verification)
   * @returns Response indicating success or failure
   */
  async startGame(gameId: string, hostId: string): Promise<GameResponse> {
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
          error: "Only the host can start the game",
        };
      }

      // Check if the game is in lobby state
      if (game.status !== GameStatus.LOBBY) {
        return {
          success: false,
          error: "Game is not in lobby state",
        };
      }

      // Check if there are enough players (at least 3)
      const playerCount = Object.keys(game.players).length;
      if (playerCount < 3) {
        return {
          success: false,
          error: "Need at least 3 players to start",
        };
      }

      // Check if all players are ready
      const allReady = Object.values(game.players).every(
        (player) => player.status === PlayerStatus.READY || player.isHost
      );

      if (!allReady) {
        return {
          success: false,
          error: "Not all players are ready",
        };
      }

      // Initialize game state
      await runTransaction(db, async (transaction) => {
        // Get the card deck
        const deckRef = doc(db, this.decksCollection, game.settings.cardDeckId);
        const deckDoc = await transaction.get(deckRef);

        if (!deckDoc.exists()) {
          throw new Error("Card deck not found");
        }

        const deck = deckDoc.data() as CardDeck;
        // Query Firestore for black and white cards by deck ID
        const blackCards: string[] = [];
        const whiteCards: string[] = [];

        try {
          // Get black cards for this deck
          const blackCardsQuery = query(
            collection(db, "blackCards"),
            where("pack", "==", game.settings.cardDeckId),
            // Limit to a reasonable number to avoid excessive reads
            // The deck should tell us how many cards it has
            limit(deck.blackCardsCount || 500)
          );

          const blackCardsSnapshot = await getDocs(blackCardsQuery);
          blackCardsSnapshot.forEach((doc) => {
            blackCards.push(doc.id);
          });

          // Get white cards for this deck
          const whiteCardsQuery = query(
            collection(db, "whiteCards"),
            where("pack", "==", game.settings.cardDeckId),
            // Limit to a reasonable number to avoid excessive reads
            limit(deck.whiteCardsCount || 1000)
          );

          const whiteCardsSnapshot = await getDocs(whiteCardsQuery);
          whiteCardsSnapshot.forEach((doc) => {
            whiteCards.push(doc.id);
          });

          console.log(
            `Found ${blackCards.length} black cards and ${whiteCards.length} white cards for deck ${game.settings.cardDeckId}`
          );

          if (blackCards.length === 0 || whiteCards.length === 0) {
            throw new Error(`No cards found for deck ${game.settings.cardDeckId}`);
          }
        } catch (error) {
          console.error("Error fetching cards from Firestore:", error);
          throw new Error(`Failed to fetch cards for deck ${game.settings.cardDeckId}. Please try again or select a different deck.`);
        }

        // Shuffle the cards
        this.shuffleArray(blackCards);
        this.shuffleArray(whiteCards);

        // Select first dealer randomly
        const playerIds = Object.keys(game.players);
        const firstDealerId =
          playerIds[Math.floor(Math.random() * playerIds.length)];

        // Deal initial hands to players (7 white cards each)
        const playerHands: Record<string, string[]> = {};

        playerIds.forEach((playerId) => {
          const hand = whiteCards.splice(0, 7);
          playerHands[playerId] = hand;
        });

        // Draw first black card
        const firstBlackCard = blackCards.shift() || "";

        // Keep track of played black cards to avoid repeats
        const playedBlackCards: string[] = [firstBlackCard];

        // Create first round
        const blackCard = await this.createBlackCard(firstBlackCard);
        const firstRound: GameRound = {
          roundNumber: 1,
          phase: RoundPhase.DEALING,
          blackCard,
          dealerId: firstDealerId,
          submissions: {},
          submissionsRevealed: false,
          startedAt: Timestamp.now(),
        };

        // Update game state
        transaction.update(gameRef, {
          status: GameStatus.PLAYING,
          currentRound: 1,
          currentDealerId: firstDealerId,
          startedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          rounds: {
            1: firstRound,
          },
          playerHands: playerHands,
          cardDeck: {
            blackCards: blackCards,
            whiteCards: whiteCards,
            discardedBlackCards: [],
            discardedWhiteCards: [],
          },
          playedBlackCards: playedBlackCards,
          // Update all players to playing status
          ...Object.fromEntries(
            Object.keys(game.players).map((playerId) => [
              `players.${playerId}.status`,
              PlayerStatus.PLAYING,
            ])
          ),
        });
      });

      return {
        success: true,
        gameId,
      };
    } catch (error) {
      console.error("Error starting game:", error);
      return {
        success: false,
        error: "Failed to start game. Please try again.",
      };
    }
  }

  /**
   * Submit cards for a round
   * @param gameId The game ID
   * @param playerId The player ID
   * @param roundNumber The round number
   * @param cardIds The IDs of the cards being submitted
   * @returns Response indicating success or failure
   */
  async submitCards(
    gameId: string,
    playerId: string,
    roundNumber: number,
    cardIds: string[]
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

      const game = gameDoc.data() as GameState;

      // Check if the game is in playing state
      if (game.status !== GameStatus.PLAYING) {
        return {
          success: false,
          error: "Game is not in playing state",
        };
      }

      // Check if this is the current round
      if (game.currentRound !== roundNumber) {
        return {
          success: false,
          error: "Not the current round",
        };
      }

      // Check if the player is in the game
      if (!game.players[playerId]) {
        return {
          success: false,
          error: "Player not in game",
        };
      }

      // Check if the player is the dealer (dealers don't submit cards)
      if (game.currentDealerId === playerId) {
        return {
          success: false,
          error: "Dealer cannot submit cards",
        };
      }

      // Check if the round is in submitting phase
      const round = game.rounds?.[roundNumber];
      if (!round || round.phase !== RoundPhase.SUBMITTING) {
        return {
          success: false,
          error: "Round is not in submitting phase",
        };
      }

      // Check if the player has already submitted
      if (round.submissions[playerId]) {
        return {
          success: false,
          error: "Player has already submitted",
        };
      }

      // Check if the player has these cards in their hand
      const playerHand = game.playerHands?.[playerId] || [];
      const hasAllCards = cardIds.every((cardId) =>
        playerHand.includes(cardId)
      );

      if (!hasAllCards) {
        return {
          success: false,
          error: "Player does not have all these cards",
        };
      }

      // Get the black card to check how many cards should be submitted
      const blackCard = round.blackCard;
      if (cardIds.length !== blackCard.pick) {
        return {
          success: false,
          error: `Must submit exactly ${blackCard.pick} cards`,
        };
      }

      // Create the submission
      const cardPromises = cardIds.map((id) => this.createWhiteCard(id));
      const cards = await Promise.all(cardPromises);

      const submission: PlayerSubmission = {
        playerId,
        cards,
        submittedAt: new Date().toISOString(),
      };

      // Update the game state
      await updateDoc(gameRef, {
        [`rounds.${roundNumber}.submissions.${playerId}`]: submission,
        [`playerHands.${playerId}`]: arrayRemove(...cardIds),
        updatedAt: serverTimestamp(),
      });

      // Check if all players have submitted
      const playerIds = Object.keys(game.players);
      const nonDealerPlayerIds = playerIds.filter(
        (id) => id !== game.currentDealerId
      );
      const submittedPlayerIds = Object.keys(round.submissions).concat(
        playerId
      );

      if (submittedPlayerIds.length === nonDealerPlayerIds.length) {
        // All players have submitted, move to judging phase
        await updateDoc(gameRef, {
          [`rounds.${roundNumber}.phase`]: RoundPhase.JUDGING,
          updatedAt: serverTimestamp(),
        });
      }

      return {
        success: true,
        gameId,
      };
    } catch (error) {
      console.error("Error submitting cards:", error);
      return {
        success: false,
        error: "Failed to submit cards. Please try again.",
      };
    }
  }

  /**
   * Select a winner for a round
   * @param gameId The game ID
   * @param dealerId The dealer ID (for verification)
   * @param roundNumber The round number
   * @param winnerId The ID of the winning player
   * @returns Response indicating success or failure
   */
  async selectWinner(
    gameId: string,
    dealerId: string,
    roundNumber: number,
    winnerId: string
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

      const game = gameDoc.data() as GameState;

      // Check if the game is in playing state
      if (game.status !== GameStatus.PLAYING) {
        return {
          success: false,
          error: "Game is not in playing state",
        };
      }

      // Check if this is the current round
      if (game.currentRound !== roundNumber) {
        return {
          success: false,
          error: "Not the current round",
        };
      }

      // Check if the user is the dealer
      if (game.currentDealerId !== dealerId) {
        return {
          success: false,
          error: "Only the dealer can select a winner",
        };
      }

      // Check if the round is in judging phase
      const round = game.rounds?.[roundNumber];
      if (!round || round.phase !== RoundPhase.JUDGING) {
        return {
          success: false,
          error: "Round is not in judging phase",
        };
      }

      // Check if the winner is a valid player who submitted
      if (!round.submissions[winnerId]) {
        return {
          success: false,
          error: "Invalid winner selection",
        };
      }

      // Update the game state
      await runTransaction(db, async (transaction) => {
        // Mark the round as complete
        transaction.update(gameRef, {
          [`rounds.${roundNumber}.phase`]: RoundPhase.COMPLETE,
          [`rounds.${roundNumber}.winnerId`]: winnerId,
          [`rounds.${roundNumber}.endedAt`]: serverTimestamp(),
          [`players.${winnerId}.score`]: increment(1),
          updatedAt: serverTimestamp(),
        });

        // Check if the game should end
        const totalRounds =
          game.settings.roundsPerPlayer * Object.keys(game.players).length;

        if (roundNumber >= totalRounds) {
          // End the game
          transaction.update(gameRef, {
            status: GameStatus.ENDED,
            endedAt: serverTimestamp(),
          });
        } else {
          // Start a new round
          const nextRoundNumber = roundNumber + 1;

          // Determine the next dealer
          const playerIds = Object.keys(game.players);
          const currentDealerIndex = playerIds.indexOf(dealerId);
          const nextDealerIndex = (currentDealerIndex + 1) % playerIds.length;
          const nextDealerId = playerIds[nextDealerIndex];

          // Get a random black card for the next round that hasn't been played yet
          let nextBlackCard = "";
          let attempts = 0;
          const maxAttempts = 50; // Prevent infinite loop if we somehow run out of cards

          // Get all black cards for this deck if we don't have them already
          if (game.cardDeck?.blackCards.length === 0) {
            try {
              const blackCardsQuery = query(
                collection(db, "blackCards"),
                where("pack", "==", game.settings.cardDeckId),
                limit(1000) // Get a large number to have enough options
              );

              const blackCardsSnapshot = await getDocs(blackCardsQuery);
              blackCardsSnapshot.forEach((doc) => {
                // Only add cards that haven't been played yet
                if (!game.playedBlackCards?.includes(doc.id)) {
                  game.cardDeck.blackCards.push(doc.id);
                }
              });

              this.shuffleArray(game.cardDeck.blackCards);
            } catch (error) {
              console.error("Error fetching additional black cards:", error);
              throw new Error("Failed to get more black cards for the game.");
            }
          }

          // Find a black card that hasn't been played yet
          while (attempts < maxAttempts && game.cardDeck.blackCards.length > 0) {
            const randomIndex = Math.floor(Math.random() * game.cardDeck.blackCards.length);
            const candidateCard = game.cardDeck.blackCards[randomIndex];

            // Check if this card has been played already
            if (!game.playedBlackCards?.includes(candidateCard)) {
              nextBlackCard = candidateCard;
              // Remove the card from the array to avoid selecting it again
              game.cardDeck.blackCards.splice(randomIndex, 1);
              break;
            }

            attempts++;
          }

          if (!nextBlackCard) {
            throw new Error("Ran out of unique black cards. Please select a different deck.");
          }

          // Add this card to the played cards list
          const playedBlackCards = game.playedBlackCards || [];
          playedBlackCards.push(nextBlackCard);

          // Create the next round
          const blackCard = await this.createBlackCard(nextBlackCard);
          const nextRound: GameRound = {
            roundNumber: nextRoundNumber,
            phase: RoundPhase.DEALING,
            blackCard,
            dealerId: nextDealerId,
            submissions: {},
            submissionsRevealed: false,
            startedAt: Timestamp.now(),
          };

          // Deal new cards to players who submitted
          const submittedPlayerIds = Object.keys(round.submissions);
          const whiteCards = game.cardDeck?.whiteCards || [];

          submittedPlayerIds.forEach((playerId) => {
            const submission = round.submissions[playerId];
            const cardsToAdd = whiteCards.splice(0, submission.cards.length);

            // Add new cards to player's hand
            const playerHand = game.playerHands?.[playerId] || [];
            transaction.update(gameRef, {
              [`playerHands.${playerId}`]: arrayUnion(...cardsToAdd),
            });
          });

          // Update the game state for the next round
          transaction.update(gameRef, {
            currentRound: nextRoundNumber,
            currentDealerId: nextDealerId,
            [`rounds.${nextRoundNumber}`]: nextRound,
            [`cardDeck.blackCards`]: game.cardDeck?.blackCards || [],
            [`cardDeck.whiteCards`]: game.cardDeck?.whiteCards || [],
            [`cardDeck.discardedBlackCards`]: arrayUnion(round.blackCard.id),
            playedBlackCards: arrayUnion(nextBlackCard),
            updatedAt: serverTimestamp(),
          });
        }
      });

      return {
        success: true,
        gameId,
      };
    } catch (error) {
      console.error("Error selecting winner:", error);
      return {
        success: false,
        error: "Failed to select winner. Please try again.",
      };
    }
  }

  /**
   * Get the current game state
   * @param gameId The game ID
   * @returns The game state
   */
  async getGameState(gameId: string): Promise<GameState | null> {
    try {
      const gameDoc = await getDoc(doc(db, this.gamesCollection, gameId));

      if (gameDoc.exists()) {
        return gameDoc.data() as GameState;
      }

      return null;
    } catch (error) {
      console.error("Error getting game state:", error);
      return null;
    }
  }

  /**
   * Get a player's hand
   * @param gameId The game ID
   * @param playerId The player ID
   * @returns The player's hand of cards
   */
  async getPlayerHand(gameId: string, playerId: string): Promise<WhiteCard[]> {
    try {
      const gameDoc = await getDoc(doc(db, this.gamesCollection, gameId));

      if (!gameDoc.exists()) {
        return [];
      }

      const game = gameDoc.data() as GameState;

      // Check if the player is in the game
      if (!game.players[playerId]) {
        return [];
      }

      // Get the player's hand
      const cardIds = game.playerHands?.[playerId] || [];
      
      if (cardIds.length === 0) {
        return [];
      }
      
      // Fetch all cards in a batch if there are many
      if (cardIds.length > 10) {
        // Split into chunks of 10 to avoid excessive reads
        const chunks = [];
        for (let i = 0; i < cardIds.length; i += 10) {
          chunks.push(cardIds.slice(i, i + 10));
        }
        
        const allCards: WhiteCard[] = [];
        
        for (const chunk of chunks) {
          // Create a query to get multiple cards at once
          const cardsQuery = query(
            collection(db, 'whiteCards'),
            where(documentId(), 'in', chunk)
          );
          
          const cardsSnapshot = await getDocs(cardsQuery);
          cardsSnapshot.forEach(doc => {
            const cardData = doc.data();
            allCards.push({
              id: doc.id,
              type: CardType.WHITE,
              text: cardData.text,
              pack: cardData.pack,
              isNsfw: cardData.isNsfw
            });
          });
        }
        
        // Sort cards to match the original order of cardIds
        const sortedCards = cardIds.map(id => 
          allCards.find(card => card.id === id)
        ).filter(card => card !== undefined) as WhiteCard[];
        
        return sortedCards;
      } else {
        // For a small number of cards, fetch them individually
        const cardPromises = cardIds.map((id) => this.createWhiteCard(id));
        const cards = await Promise.all(cardPromises);
        return cards;
      }
    } catch (error) {
      console.error("Error getting player hand:", error);
      return [];
    }
  }

  /**
   * Create a black card from an ID
   * @param cardId The card ID
   * @returns A black card object
   */
  private async createBlackCard(cardId: string): Promise<BlackCard> {
    try {
      // Try to fetch the card from Firestore first
      const cardRef = doc(db, 'blackCards', cardId);
      const cardDoc = await getDoc(cardRef);
      
      if (cardDoc.exists()) {
        // Return the card data from Firestore
        const cardData = cardDoc.data();
        return {
          id: cardId,
          type: CardType.BLACK,
          text: cardData.text,
          pack: cardData.pack,
          isNsfw: cardData.isNsfw,
          pick: cardData.pick || 1,
          draw: cardData.draw || 0
        };
      }
    } catch (error) {
      console.error(`Error fetching black card ${cardId}:`, error);
      // Continue to fallback if there's an error
    }
    
    // If we get here, the card wasn't found or there was an error
    throw new Error(`Black card ${cardId} not found in Firestore`);
  }

  /**
   * Create a white card from an ID
   * @param cardId The card ID
   * @returns A white card object
   */
  private async createWhiteCard(cardId: string): Promise<WhiteCard> {
    try {
      // Try to fetch the card from Firestore first
      const cardRef = doc(db, 'whiteCards', cardId);
      const cardDoc = await getDoc(cardRef);
      
      if (cardDoc.exists()) {
        // Return the card data from Firestore
        const cardData = cardDoc.data();
        return {
          id: cardId,
          type: CardType.WHITE,
          text: cardData.text,
          pack: cardData.pack,
          isNsfw: cardData.isNsfw
        };
      }
    } catch (error) {
      console.error(`Error fetching white card ${cardId}:`, error);
      // Continue to fallback if there's an error
    }
    
    // If we get here, the card wasn't found or there was an error
    throw new Error(`White card ${cardId} not found in Firestore`);
  }

  /**
   * Utility to shuffle an array in-place
   * @param array The array to shuffle
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private getNextDealerId(game: GameState, roundNumber: number): string {
    // Implement logic to get the next dealer ID
    // For now, just return the first player ID
    return Object.keys(game.players)[0];
  }
}

// Export a singleton instance
export const gameplayService = new GameplayService();
