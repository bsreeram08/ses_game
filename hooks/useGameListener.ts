import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { Game } from '@/types/game';

/**
 * Hook to listen for real-time updates to a game
 * @param gameId The ID of the game to listen to
 * @returns The current game state and loading status
 */
export const useGameListener = (gameId: string | null) => {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      setGame(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up the real-time listener
    const unsubscribe = onSnapshot(
      doc(db, 'games', gameId),
      (snapshot) => {
        if (snapshot.exists()) {
          setGame(snapshot.data() as Game);
        } else {
          setGame(null);
          setError('Game not found');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to game updates:', err);
        setError('Failed to listen for game updates');
        setLoading(false);
      }
    );

    // Clean up the listener when the component unmounts or gameId changes
    return () => unsubscribe();
  }, [gameId]);

  return { game, loading, error };
};
