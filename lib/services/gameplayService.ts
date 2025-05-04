import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  Timestamp,
  runTransaction,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { nanoid } from 'nanoid';
import { 
  Game, 
  GameStatus, 
  PlayerStatus, 
  GameResponse
} from '@/types/game';
import {
  BlackCard,
  CardType,
  PlayerSubmission,
  WhiteCard
} from '@/types/cards';
import {
  GameRound,
  RoundPhase,
  PlayerAction,
  PlayerActionType,
  GameState
} from '@/types/gameplay';

/**
 * Gameplay Service - Handles all gameplay-related operations with Firestore
 */
export class GameplayService {
  private readonly gamesCollection = 'games';
  private readonly cardsCollection = 'cards';
  private readonly decksCollection = 'decks';
  
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
          error: 'Game not found'
        };
      }
      
      const game = gameDoc.data() as Game;
      
      // Verify the user is the host
      if (game.hostId !== hostId) {
        return {
          success: false,
          error: 'Only the host can start the game'
        };
      }
      
      // Check if the game is in lobby state
      if (game.status !== GameStatus.LOBBY) {
        return {
          success: false,
          error: 'Game is not in lobby state'
        };
      }
      
      // Check if there are enough players (at least 3)
      const playerCount = Object.keys(game.players).length;
      if (playerCount < 3) {
        return {
          success: false,
          error: 'Need at least 3 players to start'
        };
      }
      
      // Check if all players are ready
      const allReady = Object.values(game.players).every(player => 
        player.status === PlayerStatus.READY || player.isHost
      );
      
      if (!allReady) {
        return {
          success: false,
          error: 'Not all players are ready'
        };
      }
      
      // Initialize game state
      await runTransaction(db, async (transaction) => {
        // Get the card deck
        const deckRef = doc(db, this.decksCollection, game.settings.cardDeckId);
        const deckDoc = await transaction.get(deckRef);
        
        if (!deckDoc.exists()) {
          throw new Error('Card deck not found');
        }
        
        const deck = deckDoc.data();
        
        // Get black and white cards
        // In a real implementation, you would query for cards by deck ID
        // For now, we'll create some dummy cards for demonstration
        const blackCards: string[] = [];
        const whiteCards: string[] = [];
        
        // Generate some dummy card IDs
        for (let i = 0; i < 50; i++) {
          blackCards.push(`black-card-${i}`);
        }
        
        for (let i = 0; i < 200; i++) {
          whiteCards.push(`white-card-${i}`);
        }
        
        // Shuffle the cards
        this.shuffleArray(blackCards);
        this.shuffleArray(whiteCards);
        
        // Select first dealer randomly
        const playerIds = Object.keys(game.players);
        const firstDealerId = playerIds[Math.floor(Math.random() * playerIds.length)];
        
        // Deal initial hands to players (7 white cards each)
        const playerHands: Record<string, string[]> = {};
        
        playerIds.forEach(playerId => {
          const hand = whiteCards.splice(0, 7);
          playerHands[playerId] = hand;
        });
        
        // Draw first black card
        const firstBlackCard = blackCards.shift();
        
        if (!firstBlackCard) {
          throw new Error('No black cards available');
        }
        
        // Create first round
        const firstRound: GameRound = {
          roundNumber: 1,
          phase: RoundPhase.DEALING,
          blackCard: { id: firstBlackCard } as BlackCard, // In real implementation, get full card data
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
            1: firstRound
          },
          playerHands: playerHands,
          cardDeck: {
            blackCards: blackCards,
            whiteCards: whiteCards,
            discardedBlackCards: [],
            discardedWhiteCards: []
          },
          // Update all players to playing status
          ...Object.fromEntries(
            Object.keys(game.players).map(playerId => [
              `players.${playerId}.status`, 
              PlayerStatus.PLAYING
            ])
          )
        });
      });
      
      return {
        success: true,
        gameId
      };
    } catch (error) {
      console.error('Error starting game:', error);
      return {
        success: false,
        error: 'Failed to start game. Please try again.'
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
          error: 'Game not found'
        };
      }
      
      const game = gameDoc.data() as GameState;
      
      // Check if the game is in playing state
      if (game.status !== GameStatus.PLAYING) {
        return {
          success: false,
          error: 'Game is not in playing state'
        };
      }
      
      // Check if this is the current round
      if (game.currentRound !== roundNumber) {
        return {
          success: false,
          error: 'Not the current round'
        };
      }
      
      // Check if the player is in the game
      if (!game.players[playerId]) {
        return {
          success: false,
          error: 'Player not in game'
        };
      }
      
      // Check if the player is the dealer (dealers don't submit cards)
      if (game.currentDealerId === playerId) {
        return {
          success: false,
          error: 'Dealer cannot submit cards'
        };
      }
      
      // Check if the round is in submitting phase
      const round = game.rounds?.[roundNumber];
      if (!round || round.phase !== RoundPhase.SUBMITTING) {
        return {
          success: false,
          error: 'Round is not in submitting phase'
        };
      }
      
      // Check if the player has already submitted
      if (round.submissions[playerId]) {
        return {
          success: false,
          error: 'Player has already submitted'
        };
      }
      
      // Check if the player has these cards in their hand
      const playerHand = game.playerHands?.[playerId] || [];
      const hasAllCards = cardIds.every(cardId => playerHand.includes(cardId));
      
      if (!hasAllCards) {
        return {
          success: false,
          error: 'Player does not have all these cards'
        };
      }
      
      // Get the black card to check how many cards should be submitted
      const blackCard = round.blackCard;
      if (cardIds.length !== blackCard.pick) {
        return {
          success: false,
          error: `Must submit exactly ${blackCard.pick} cards`
        };
      }
      
      // Create the submission
      const submission: PlayerSubmission = {
        playerId,
        cards: cardIds.map(id => ({ id }) as WhiteCard), // In real implementation, get full card data
        submittedAt: new Date().toISOString()
      };
      
      // Update the game state
      await updateDoc(gameRef, {
        [`rounds.${roundNumber}.submissions.${playerId}`]: submission,
        [`playerHands.${playerId}`]: arrayRemove(...cardIds),
        updatedAt: serverTimestamp()
      });
      
      // Check if all players have submitted
      const playerIds = Object.keys(game.players);
      const nonDealerPlayerIds = playerIds.filter(id => id !== game.currentDealerId);
      const submittedPlayerIds = Object.keys(round.submissions).concat(playerId);
      
      if (submittedPlayerIds.length === nonDealerPlayerIds.length) {
        // All players have submitted, move to judging phase
        await updateDoc(gameRef, {
          [`rounds.${roundNumber}.phase`]: RoundPhase.JUDGING,
          updatedAt: serverTimestamp()
        });
      }
      
      return {
        success: true,
        gameId
      };
    } catch (error) {
      console.error('Error submitting cards:', error);
      return {
        success: false,
        error: 'Failed to submit cards. Please try again.'
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
          error: 'Game not found'
        };
      }
      
      const game = gameDoc.data() as GameState;
      
      // Check if the game is in playing state
      if (game.status !== GameStatus.PLAYING) {
        return {
          success: false,
          error: 'Game is not in playing state'
        };
      }
      
      // Check if this is the current round
      if (game.currentRound !== roundNumber) {
        return {
          success: false,
          error: 'Not the current round'
        };
      }
      
      // Check if the user is the dealer
      if (game.currentDealerId !== dealerId) {
        return {
          success: false,
          error: 'Only the dealer can select a winner'
        };
      }
      
      // Check if the round is in judging phase
      const round = game.rounds?.[roundNumber];
      if (!round || round.phase !== RoundPhase.JUDGING) {
        return {
          success: false,
          error: 'Round is not in judging phase'
        };
      }
      
      // Check if the winner is a valid player who submitted
      if (!round.submissions[winnerId]) {
        return {
          success: false,
          error: 'Invalid winner selection'
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
          updatedAt: serverTimestamp()
        });
        
        // Check if the game should end
        const totalRounds = game.settings.roundsPerPlayer * Object.keys(game.players).length;
        
        if (roundNumber >= totalRounds) {
          // End the game
          transaction.update(gameRef, {
            status: GameStatus.ENDED,
            endedAt: serverTimestamp()
          });
        } else {
          // Start a new round
          const nextRoundNumber = roundNumber + 1;
          
          // Determine the next dealer
          const playerIds = Object.keys(game.players);
          const currentDealerIndex = playerIds.indexOf(dealerId);
          const nextDealerIndex = (currentDealerIndex + 1) % playerIds.length;
          const nextDealerId = playerIds[nextDealerIndex];
          
          // Draw a new black card
          const blackCards = game.cardDeck?.blackCards || [];
          const nextBlackCard = blackCards.shift();
          
          if (!nextBlackCard) {
            throw new Error('No black cards available');
          }
          
          // Create the next round
          const nextRound: GameRound = {
            roundNumber: nextRoundNumber,
            phase: RoundPhase.DEALING,
            blackCard: { id: nextBlackCard } as BlackCard, // In real implementation, get full card data
            dealerId: nextDealerId,
            submissions: {},
            submissionsRevealed: false,
            startedAt: Timestamp.now()
          };
          
          // Deal new cards to players who submitted
          const submittedPlayerIds = Object.keys(round.submissions);
          const whiteCards = game.cardDeck?.whiteCards || [];
          
          submittedPlayerIds.forEach(playerId => {
            const submission = round.submissions[playerId];
            const cardsToAdd = whiteCards.splice(0, submission.cards.length);
            
            // Add new cards to player's hand
            const playerHand = game.playerHands?.[playerId] || [];
            transaction.update(gameRef, {
              [`playerHands.${playerId}`]: arrayUnion(...cardsToAdd)
            });
          });
          
          // Update the game state for the next round
          transaction.update(gameRef, {
            currentRound: nextRoundNumber,
            currentDealerId: nextDealerId,
            [`rounds.${nextRoundNumber}`]: nextRound,
            [`cardDeck.blackCards`]: blackCards,
            [`cardDeck.whiteCards`]: whiteCards,
            [`cardDeck.discardedBlackCards`]: arrayUnion(round.blackCard.id),
            updatedAt: serverTimestamp()
          });
        }
      });
      
      return {
        success: true,
        gameId
      };
    } catch (error) {
      console.error('Error selecting winner:', error);
      return {
        success: false,
        error: 'Failed to select winner. Please try again.'
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
      console.error('Error getting game state:', error);
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
      
      // Get the actual card data
      const cards: WhiteCard[] = [];
      
      for (const cardId of cardIds) {
        const cardDoc = await getDoc(doc(db, this.cardsCollection, cardId));
        
        if (cardDoc.exists()) {
          cards.push(cardDoc.data() as WhiteCard);
        }
      }
      
      return cards;
    } catch (error) {
      console.error('Error getting player hand:', error);
      return [];
    }
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
}

// Export a singleton instance
export const gameplayService = new GameplayService();
