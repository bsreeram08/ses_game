import { useState, useCallback } from 'react';
import { GameService } from '@/lib/services/gameService';
import { 
  Game, 
  CreateGameParams, 
  JoinGameParams, 
  CreateGameResponse, 
  GameResponse 
} from '@/types/game';
import { useAuth } from '@/hooks/useAuth';

/**
 * Custom hook for game-related operations
 */
export const useGame = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Initialize the game service
  const gameService = new GameService();
  
  /**
   * Create a new game
   * @param settings Game settings
   * @returns Response with game ID and invite code
   */
  const createGame = useCallback(async (settings: CreateGameParams['settings']): Promise<CreateGameResponse> => {
    if (!user) {
      return {
        gameId: '',
        inviteCode: '',
        success: false,
        error: 'You must be logged in to create a game'
      };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const params: CreateGameParams = {
        hostId: user.uid,
        hostDisplayName: user.displayName || `Guest-${user.uid.substring(0, 5)}`,
        hostPhotoURL: user.photoURL || undefined,
        settings
      };
      
      const response = await gameService.createGame(params);
      
      if (!response.success) {
        setError(response.error || 'Failed to create game');
      }
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      return {
        gameId: '',
        inviteCode: '',
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [user, gameService]);
  
  /**
   * Join a game by ID
   * @param gameId Game ID
   * @param password Optional password for private games
   * @returns Response indicating success or failure
   */
  const joinGameById = useCallback(async (gameId: string, password?: string): Promise<GameResponse> => {
    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to join a game'
      };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const params: JoinGameParams = {
        gameId,
        userId: user.uid,
        displayName: user.displayName || `Guest-${user.uid.substring(0, 5)}`,
        photoURL: user.photoURL || undefined,
        password
      };
      
      const response = await gameService.joinGame(params);
      
      if (!response.success) {
        setError(response.error || 'Failed to join game');
      }
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [user, gameService]);
  
  /**
   * Join a game by invite code
   * @param inviteCode Invite code
   * @param password Optional password for private games
   * @returns Response indicating success or failure
   */
  const joinGameByInviteCode = useCallback(async (inviteCode: string, password?: string): Promise<GameResponse> => {
    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to join a game'
      };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // First, find the game ID from the invite code
      const gameId = await gameService.findGameByInviteCode(inviteCode);
      
      if (!gameId) {
        setError('Invalid invite code');
        return {
          success: false,
          error: 'Invalid invite code'
        };
      }
      
      // Then join the game
      return await joinGameById(gameId, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [user, gameService, joinGameById]);
  
  /**
   * Get a game by ID
   * @param gameId Game ID
   * @returns Game object if found, null otherwise
   */
  const getGame = useCallback(async (gameId: string): Promise<Game | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const game = await gameService.getGame(gameId);
      
      if (!game) {
        setError('Game not found');
      }
      
      return game;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [gameService]);
  
  /**
   * Set player readiness status
   * @param gameId Game ID
   * @param ready Whether the player is ready
   * @returns Response indicating success or failure
   */
  const setPlayerReady = useCallback(async (gameId: string, ready: boolean): Promise<GameResponse> => {
    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to update ready status'
      };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await gameService.setPlayerReady(gameId, user.uid, ready);
      
      if (!response.success) {
        setError(response.error || 'Failed to update ready status');
      }
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [user, gameService]);
  
  /**
   * Start a game (host only)
   * @param gameId Game ID
   * @returns Response indicating success or failure
   */
  const startGame = useCallback(async (gameId: string): Promise<GameResponse> => {
    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to start a game'
      };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await gameService.startGame(gameId, user.uid);
      
      if (!response.success) {
        setError(response.error || 'Failed to start game');
      }
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [user, gameService]);
  
  /**
   * Kick a player from a game (host only)
   * @param gameId Game ID
   * @param playerIdToKick ID of the player to kick
   * @returns Response indicating success or failure
   */
  const kickPlayer = useCallback(async (gameId: string, playerIdToKick: string): Promise<GameResponse> => {
    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to kick a player'
      };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await gameService.kickPlayer(gameId, user.uid, playerIdToKick);
      
      if (!response.success) {
        setError(response.error || 'Failed to kick player');
      }
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [user, gameService]);
  
  /**
   * Leave a game
   * @param gameId Game ID
   * @returns Response indicating success or failure
   */
  const leaveGame = useCallback(async (gameId: string): Promise<GameResponse> => {
    if (!user) {
      return {
        success: false,
        error: 'You must be logged in to leave a game'
      };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await gameService.leaveGame(gameId, user.uid);
      
      if (!response.success) {
        setError(response.error || 'Failed to leave game');
      }
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [user, gameService]);
  
  /**
   * Get active games for the current user
   * @param useListener Whether to use a real-time listener (for dashboard)
   * @param onUpdate Callback for listener updates
   * @param onError Callback for listener errors
   * @returns Either a Promise<Game[]> or an unsubscribe function
   */
  const getActiveGames = useCallback(
    (
      useListener: boolean = false,
      onUpdate?: (games: Game[]) => void,
      onError?: (error: Error) => void
    ): Promise<Game[]> | (() => void) => {
      if (!user) {
        if (useListener && onUpdate) {
          onUpdate([]);
          return () => {}; // Empty unsubscribe function
        }
        return Promise.resolve([]);
      }
      
      if (!useListener) {
        setLoading(true);
        setError(null);
        
        return new Promise<Game[]>(async (resolve) => {
          try {
            const result = await (gameService.getActiveGamesForUser(user.uid, false) as Promise<Game[]>);
            resolve(result);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
            setError(errorMessage);
            resolve([]);
          } finally {
            setLoading(false);
          }
        });
      }
      
      // Use the real-time listener
      return gameService.getActiveGamesForUser(
        user.uid,
        true,
        (games) => {
          if (onUpdate) {
            onUpdate(games);
          }
          setLoading(false);
        },
        (error) => {
          const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
          setError(errorMessage);
          if (onError) {
            onError(error);
          }
          setLoading(false);
        }
      ) as () => void;
    },
    [user, gameService]
  );
  
  return {
    loading,
    error,
    createGame,
    joinGameById,
    joinGameByInviteCode,
    getGame,
    setPlayerReady,
    startGame,
    kickPlayer,
    leaveGame,
    getActiveGames
  };
};
