import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { gameplayService } from '@/lib/services/gameplayService';
import { GameState, RoundPhase, GameResponse } from '@/types/gameplay';
import { WhiteCard } from '@/types/cards';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

/**
 * Hook for gameplay functionality
 */
export function useGameplay(gameId: string) {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerHand, setPlayerHand] = useState<WhiteCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<WhiteCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to game state changes
  useEffect(() => {
    if (!gameId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'games', gameId),
      (doc) => {
        if (doc.exists()) {
          const gameData = doc.data() as GameState;
          console.log("Game state snapshot received:", { 
            status: gameData.status,
            currentRound: gameData.currentRound,
            // Access any custom properties safely with type casting
            currentRoundId: (gameData as any).currentRoundId
          });
          setGameState(gameData);
          setLoading(false);
        } else {
          setError('Game not found');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error subscribing to game:', err);
        setError('Failed to load game data');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [gameId]);
  
  // Subscribe to rounds collection when game is playing
  useEffect(() => {
    if (!gameId || !gameState || gameState.status !== 'playing') return;
    
    // Extract current round ID from the game data
    // First check if the rounds collection exists and has the current round
    let currentRoundId: string | null = null;
    
    if (gameState.rounds && gameState.currentRound !== undefined && 
        gameState.rounds[gameState.currentRound]) {
      // Try to get the round ID from the round data
      const roundData = gameState.rounds[gameState.currentRound];
      if (roundData && typeof roundData === 'object' && 'id' in roundData) {
        currentRoundId = roundData.id as string;
      }
    }
    
    // Fallback to direct currentRoundId property if it exists in the data structure
    if (!currentRoundId && 'currentRoundId' in gameState) {
      currentRoundId = (gameState as any).currentRoundId;  
    }
    
    if (!currentRoundId) {
      console.log("No current round ID available yet for game", gameId);
      return; // Exit if no round ID is available
    }
    
    console.log("Setting up rounds listener for game", gameId, "round ID", currentRoundId);
    
    // Create a reference to the specific round document
    const roundRef = doc(db, 'games', gameId, 'rounds', currentRoundId);
    
    const unsubscribeRounds = onSnapshot(
      roundRef,
      (roundDoc) => {
        if (roundDoc.exists()) {
          console.log("Round data received:", roundDoc.id);
          // Update game state with the round data
          setGameState(prevState => {
            if (!prevState) return prevState;
            
            // Clone the previous state
            const newState = {...prevState};
            
            // Initialize rounds object if it doesn't exist
            if (!newState.rounds) {
              newState.rounds = {};
            }
            
            // Add the round data to the rounds object using currentRound (index) or defaulting to 1
            const roundIndex = prevState.currentRound || 1;
            newState.rounds[roundIndex] = roundDoc.data() as any;
            
            return newState;
          });
        } else {
          console.warn("Round document doesn't exist:", currentRoundId);
        }
      },
      (err) => {
        console.error("Error subscribing to round:", err);
      }
    );
    
    return () => unsubscribeRounds();
  }, [gameId, gameState?.status, gameState?.currentRound, gameState?.rounds]);

  // Load player's hand when game state changes
  useEffect(() => {
    if (!gameState || !user) return;

    const loadPlayerHand = async () => {
      try {
        const hand = await gameplayService.getPlayerHand(gameId, user.uid);
        setPlayerHand(hand);
      } catch (err) {
        console.error('Error loading player hand:', err);
      }
    };

    loadPlayerHand();
  }, [gameState, gameId, user]);

  // Start the game (host only)
  const startGame = useCallback(async (): Promise<GameResponse> => {
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    setLoading(true);
    try {
      const response = await gameplayService.startGame(gameId, user.uid);
      if (!response.success) {
        setError(response.error || 'Failed to start game');
      }
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [gameId, user]);

  // Select a card from the player's hand
  const selectCard = useCallback((card: WhiteCard) => {
    if (!gameState || !user) return;

    const currentRound = gameState.rounds?.[gameState.currentRound || 0];
    if (!currentRound) return;

    // If player is the dealer, they don't select cards
    if (currentRound.dealerId === user.uid) return;

    // If round is not in submitting phase, can't select cards
    if (currentRound.phase !== RoundPhase.SUBMITTING) return;

    // If player has already submitted, can't select cards
    if (currentRound.submissions[user.uid]) return;

    // Check if the card is already selected
    const isSelected = selectedCards.some(c => c.id === card.id);

    if (isSelected) {
      // Deselect the card
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      // Check if we've reached the limit of cards to select
      const blackCard = currentRound.blackCard;
      if (selectedCards.length >= blackCard.pick) {
        // Replace the first selected card
        setSelectedCards([...selectedCards.slice(1), card]);
      } else {
        // Add the card to selected cards
        setSelectedCards([...selectedCards, card]);
      }
    }
  }, [gameState, user, selectedCards]);

  // Submit selected cards
  const submitCards = useCallback(async (): Promise<GameResponse> => {
    if (!gameState || !user) {
      return {
        success: false,
        error: 'User not authenticated or game not loaded'
      };
    }

    const currentRound = gameState.rounds?.[gameState.currentRound || 0];
    if (!currentRound) {
      return {
        success: false,
        error: 'No active round'
      };
    }

    // Check if we have the right number of cards
    const blackCard = currentRound.blackCard;
    if (selectedCards.length !== blackCard.pick) {
      return {
        success: false,
        error: `Must select exactly ${blackCard.pick} cards`
      };
    }

    setLoading(true);
    try {
      const response = await gameplayService.submitCards(
        gameId,
        user.uid,
        currentRound.roundNumber,
        selectedCards.map(card => card.id)
      );

      if (response.success) {
        // Clear selected cards after successful submission
        setSelectedCards([]);
      } else {
        setError(response.error || 'Failed to submit cards');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [gameId, gameState, user, selectedCards]);

  // Select a winner (dealer only)
  const selectWinner = useCallback(async (winnerId: string): Promise<GameResponse> => {
    if (!gameState || !user) {
      return {
        success: false,
        error: 'User not authenticated or game not loaded'
      };
    }

    const currentRound = gameState.rounds?.[gameState.currentRound || 0];
    if (!currentRound) {
      return {
        success: false,
        error: 'No active round'
      };
    }

    // Check if user is the dealer
    if (currentRound.dealerId !== user.uid) {
      return {
        success: false,
        error: 'Only the dealer can select a winner'
      };
    }

    // Check if round is in judging phase
    if (currentRound.phase !== RoundPhase.JUDGING) {
      return {
        success: false,
        error: 'Round is not in judging phase'
      };
    }

    setLoading(true);
    try {
      const response = await gameplayService.selectWinner(
        gameId,
        user.uid,
        currentRound.roundNumber,
        winnerId
      );

      if (!response.success) {
        setError(response.error || 'Failed to select winner');
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [gameId, gameState, user]);

  // Clear any error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    gameState,
    playerHand,
    selectedCards,
    loading,
    error,
    isDealer: gameState?.currentDealerId === user?.uid,
    startGame,
    selectCard,
    submitCards,
    selectWinner,
    clearError
  };
}
