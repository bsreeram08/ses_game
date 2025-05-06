"use client";

import { useState, useEffect } from "react";
import { useGameplay } from "@/hooks/useGameplay";
import { GameState, RoundPhase } from "@/types/gameplay";
import { PlayerStatus, GameStatus } from "@/types/game";
import { toast } from "sonner";
import { ErrorTrackingService, GameEvents } from "@/lib/services/errorTrackingService";
import { BlackCard, WhiteCard } from "@/types/cards";
import { db } from "@/lib/firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, Award, Clock } from "lucide-react";
import PlayerHand from "./PlayerHand";
import BlackCardDisplay from "./BlackCardDisplay";
import SubmissionArea from "./SubmissionArea";
import JudgingArea from "./JudgingArea";
import ScoreBoard from "./ScoreBoard";

interface GamePlayProps {
  gameId: string;
}

export default function GamePlay({ gameId }: GamePlayProps) {
  const { user } = useAuth();
  const {
    gameState,
    playerHand,
    selectedCards,
    loading,
    error,
    isDealer,
    startGame,
    selectCard,
    submitCards,
    selectWinner,
    clearError,
  } = useGameplay(gameId);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startingGame, setStartingGame] = useState(false);
  const [loadingRoundData, setLoadingRoundData] = useState(false);
  
  // Function to manually fetch round data if it's missing
  const loadCurrentRoundData = async () => {
    if (!gameState || !user || !gameId) return;
    
    // Only proceed if we're in PLAYING state
    if (gameState.status !== GameStatus.PLAYING) {
      return;
    }
    
    setLoadingRoundData(true);
    try {
      // First attempt: Look for a currentRoundId property in the game state
      const currentRoundId = (gameState as any).currentRoundId;
      
      if (currentRoundId) {
        console.log("Found currentRoundId in game state:", currentRoundId);
        
        // Attempt to fetch the round using the ID from game state
        const roundRef = doc(db, 'games', gameId, 'rounds', currentRoundId);
        const roundSnap = await getDoc(roundRef);
        
        if (roundSnap.exists()) {
          console.log("Successfully loaded round data:", roundSnap.data());
          toast.success("Round data loaded successfully");
          window.location.reload();
          return;
        }
      }
      
      // Second attempt: If we don't have a valid currentRoundId, let's try to create a new round
      console.log("No valid round ID found. Attempting to create a new round...");
      
      // Get the gameplayService to create a new round for this game
      // We do this by calling startGame again since it's already in PLAYING state
      // it will handle creating the round for us
      const result = await startGame();
      
      if (result.success) {
        toast.success("Game round initialized successfully!");
        setTimeout(() => window.location.reload(), 1000); // Give time for the round data to be created
      } else {
        toast.error(result.error || "Failed to initialize game round");
        setLoadingRoundData(false);
      }
    } catch (error) {
      console.error("Error loading/creating round data:", error);
      toast.error("Failed to load or create round data: " + (error as Error).message);
      setLoadingRoundData(false);
    }
  };
  
  // Handle starting the game
  const handleStartGame = async () => {
    if (!gameState || !user || !gameId) return;

    setStartingGame(true);
    try {
      // If game is already in PLAYING state, try to load the round data instead of starting the game
      if (gameState.status === GameStatus.PLAYING) {
        await loadCurrentRoundData();
        return;
      }
      
      // Call the startGame method from the hook
      const response = await startGame();
      
      // Handle response
      if (response.success) {
        if (response.alreadyPlaying) {
          toast.info(response.message || "Game is already in progress.");
          // If the game is already playing but we don't have round data, try to load it
          await loadCurrentRoundData();
        } else {
          toast.success(response.message || "Game started successfully!");
          ErrorTrackingService.trackGameEvent(GameEvents.GAME_STARTED, {
            gameId,
            userId: user.uid,
            playerCount: Object.keys(gameState.players || {}).length
          });
        }
      } else {
        console.error("[GamePlay.tsx] startGame call failed. Full response:", response);
        toast.error(response.error || "Failed to start game. Please try again.");
        
        // Track the error
        ErrorTrackingService.trackError(
          new Error(response.error || "Failed to start game"),
          {
            component: "GamePlay",
            action: "handleStartGame",
            userId: user.uid,
            gameId: gameId,
          }
        );
      }
    } catch (err) {
      console.error("Error handling game start:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      toast.error(errorMessage);
      
      // Track the error
      ErrorTrackingService.trackError(err, {
        component: "GamePlay",
        action: "handleStartGame",
        userId: user.uid,
        gameId: gameId,
      });
    } finally {
      setStartingGame(false);
    }
  };

  // Timer for round deadlines
  useEffect(() => {
    if (!gameState || !gameState.rounds) return;

    const currentRound = gameState.rounds[gameState.currentRound || 0];
    if (!currentRound) return;

    let deadline: Date | null = null;

    if (
      currentRound.phase === RoundPhase.SUBMITTING &&
      currentRound.submissionDeadline
    ) {
      deadline = currentRound.submissionDeadline.toDate();
    } else if (
      currentRound.phase === RoundPhase.JUDGING &&
      currentRound.judgeDeadline
    ) {
      deadline = currentRound.judgeDeadline.toDate();
    }

    if (!deadline) {
      setTimeLeft(null);
      return;
    }

    const timer = setInterval(() => {
      const now = new Date();
      const diff = Math.max(
        0,
        Math.floor((deadline!.getTime() - now.getTime()) / 1000)
      );

      setTimeLeft(diff);

      if (diff === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Handle player's role in the current round
  const renderPlayerRole = () => {
    if (!gameState || !user) return null;

    const currentRound = gameState.rounds?.[gameState.currentRound || 0];
    if (!currentRound) return null;

    if (currentRound.dealerId === user.uid) {
      return (
        <Alert className="mb-4 bg-amber-50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>You are the Card Czar this round!</AlertTitle>
          <AlertDescription>
            Wait for others to submit their cards, then pick the funniest
            answer.
          </AlertDescription>
        </Alert>
      );
    }

    if (currentRound.submissions[user.uid]) {
      return (
        <Alert className="mb-4 bg-green-50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>You've submitted your cards!</AlertTitle>
          <AlertDescription>
            Wait for the Card Czar to pick the winner.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  // Render the current game phase
  const renderGamePhase = () => {
    if (!gameState || !user) {
      return <Skeleton className="w-full h-64" />;
    }

    const currentRound = gameState.rounds?.[gameState.currentRound || 0];

    // Handle the case where the game is in PLAYING state but no rounds are initialized yet
    if (gameState.status === GameStatus.PLAYING && !currentRound) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <h2 className="text-2xl font-bold mb-4">Game is starting...</h2>
          <div className="mt-4">
            <p className="text-muted-foreground">
              The first round is being set up. Please wait a moment...
            </p>
            <div className="mt-6">
              <Button
                onClick={loadCurrentRoundData}
                size="sm"
                variant="default"
                disabled={loadingRoundData}
              >
                {loadingRoundData ? "Loading..." : "Load Round Data"}
              </Button>
              <p className="text-xs text-gray-600 mt-2">
                If the game doesn't progress automatically, click this button to load the round data.
              </p>
            </div>
            {gameState.hostId === user.uid && (
              <div className="mt-6">
                <Button
                  onClick={handleStartGame}
                  size="sm"
                  variant="default"
                  disabled={startingGame}
                >
                  {startingGame ? "Starting..." : "Retry Starting Game"}
                </Button>
                <p className="text-xs text-gray-600 mt-2">
                  If the game doesn't start automatically, click this button to retry.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ... rest of the code remains the same ...
    // Handle the case where the game is in LOBBY state
    if (!currentRound) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <h2 className="text-2xl font-bold mb-4">
            Waiting for game to start...
          </h2>

          {/* Add start game button for the host */}
          {gameState.hostId === user.uid &&
            gameState.status === GameStatus.LOBBY && (
              <div className="mt-4">
                <div className="space-y-4">
                  {(() => {
                    const allPlayersReady = Object.values(gameState.players).every(
                      (player) => player.status === PlayerStatus.READY || player.isHost
                    );
                    
                    const players = Object.values(gameState.players || {});
                    const totalPlayers = players.length;
                    const readyPlayers = players.filter(
                      (p) => p.status === PlayerStatus.READY || p.isHost
                    ).length;

                    const minPlayersRequired = gameState.settings.minPlayers || 3; // Default to 3 if not set
                    const notEnoughPlayers = totalPlayers < minPlayersRequired;

                    return (
                      <>
                        <Button
                          onClick={handleStartGame}
                          size="lg"
                          variant="default"
                          disabled={!allPlayersReady || startingGame || notEnoughPlayers}
                          className="w-full"
                        >
                          {startingGame ? "Starting..." : "Start Game"}
                        </Button>

                        {notEnoughPlayers && (
                          <div className="mt-2 text-red-600 text-sm">
                            <p>
                              Not enough players to start. Need at least{" "}
                              {minPlayersRequired} players (currently {totalPlayers}).
                            </p>
                          </div>
                        )}

                        {!notEnoughPlayers && !allPlayersReady && (
                          <div className="mt-2 text-amber-600 text-sm">
                            <p>
                              Not all players are ready ({readyPlayers}/
                              {totalPlayers}). Players must click "Ready" before
                              the game can start.
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()} 
                </div>
              </div>
            )}

          {/* Show error message if game is not in lobby state but also not playing */}
          {gameState.status !== GameStatus.LOBBY &&
            gameState.status !== GameStatus.PLAYING && (
              <div className="mt-4">
                <p className="text-amber-600">
                  Game is currently in {gameState.status} state. Please wait for
                  the current round to complete.
                </p>
              </div>
            )}

          {gameState.hostId !== user.uid &&
            gameState.status === GameStatus.LOBBY && (
              <p className="text-muted-foreground">
                Waiting for the host to start the game...
              </p>
            )}
        </div>
      );
    }

    // If game status is not LOBBY and not PLAYING (or PLAYING without currentRound), or some other unexpected state.
    if (gameState.status !== GameStatus.LOBBY && (gameState.status !== GameStatus.PLAYING || !currentRound) ) {
      // This case handles any other game statuses like FINISHED, or unexpected configurations.
      // It might be more robust to explicitly handle GameStatus.FINISHED here if specific UI is needed.
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <h2 className="text-2xl font-bold mb-4">Game Status: {gameState.status}</h2>
          <p className="text-muted-foreground">
            The game is not currently in a playable state or has ended.
          </p>
          {/* Optionally, add a button to return to lobby or view scores if game is finished */}
        </div>
      );
    }

    // Based on the current round phase, render the appropriate content
    // This switch statement should only be reached if gameState.status is PLAYING and currentRound exists.
    switch (currentRound.phase) {
      case RoundPhase.DEALING:
        return (
          <div className="flex flex-col items-center justify-center p-8">
            <h2 className="text-2xl font-bold mb-4">Dealing cards...</h2>
            <p>Round {currentRound.roundNumber}</p>
          </div>
        );

      case RoundPhase.SUBMITTING:
        return (
          <div className="space-y-6">
            <BlackCardDisplay blackCard={currentRound.blackCard} />

            {!isDealer && (
              <SubmissionArea
                selectedCards={selectedCards}
                onSubmit={submitCards}
                blackCard={currentRound.blackCard}
                hasSubmitted={!!currentRound.submissions[user.uid]}
              />
            )}

            {isDealer && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>You are the Card Czar</AlertTitle>
                <AlertDescription>
                  Wait for other players to submit their cards.
                </AlertDescription>
              </Alert>
            )}

            {timeLeft !== null && (
              <div className="flex items-center justify-center gap-2 text-amber-600">
                <Clock className="h-5 w-5" />
                <span>
                  {Math.floor(timeLeft / 60)}:
                  {(timeLeft % 60).toString().padStart(2, "0")}
                </span>
              </div>
            )}
          </div>
        );

      case RoundPhase.JUDGING:
        return (
          <div className="space-y-6">
            <BlackCardDisplay blackCard={currentRound.blackCard} />

            {isDealer ? (
              <JudgingArea
                submissions={Object.values(currentRound.submissions)}
                blackCard={currentRound.blackCard}
                onSelectWinner={(winnerId) => selectWinner(winnerId)}
              />
            ) : (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Waiting for the Card Czar</AlertTitle>
                <AlertDescription>
                  The Card Czar is picking the winner...
                </AlertDescription>
              </Alert>
            )}

            {timeLeft !== null && (
              <div className="flex items-center justify-center gap-2 text-amber-600">
                <Clock className="h-5 w-5" />
                <span>
                  {Math.floor(timeLeft / 60)}:
                  {(timeLeft % 60).toString().padStart(2, "0")}
                </span>
              </div>
            )}
          </div>
        );

      case RoundPhase.REVEALING:
        return (
          <div className="space-y-6">
            <BlackCardDisplay blackCard={currentRound.blackCard} />
            <div className="p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-2">
                Revealing submissions...
              </h3>
              {/* Animation for revealing submissions would go here */}
            </div>
          </div>
        );

      case RoundPhase.COMPLETE:
        return (
          <div className="space-y-6">
            <BlackCardDisplay blackCard={currentRound.blackCard} />

            {currentRound.winnerId && (
              <div className="p-6 bg-amber-50 rounded-lg text-center">
                <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
                  <Award className="h-6 w-6 text-amber-500" />
                  Winner:{" "}
                  {gameState.players[currentRound.winnerId]?.displayName}
                </h3>

                <div className="mt-4 p-4 bg-white rounded-lg">
                  {currentRound.submissions[currentRound.winnerId]?.cards.map(
                    (card, index) => (
                      <div key={index} className="text-lg font-medium">
                        {card.text}
                      </div>
                    )
                  )}
                </div>

                <div className="mt-4">
                  <p>Next round starting soon...</p>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading && !gameState) {
    return (
      <div className="p-8">
        <Skeleton className="w-full h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button
          variant="outline"
          size="sm"
          onClick={clearError}
          className="mt-2"
        >
          Dismiss
        </Button>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Game header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          Game #{gameId.substring(0, 6)}
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Round: {gameState?.currentRound || 0}</span>
          <span>•</span>
          <span>
            Players: {gameState ? Object.keys(gameState.players).length : 0}
          </span>
        </div>
      </div>

      {/* Player role alert */}
      {renderPlayerRole()}

      {/* Main game area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar - Scoreboard */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-xl font-bold mb-4">Players</h2>
              <ScoreBoard
                players={gameState?.players || {}}
                currentDealerId={gameState?.currentDealerId}
              />
            </CardContent>
          </Card>
        </div>

        {/* Main game area */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">{renderGamePhase()}</CardContent>
          </Card>

          {/* Player's hand */}
          {!isDealer && gameState?.status === GameStatus.PLAYING && (
            <div className="mt-6">
              <h2 className="text-xl font-bold mb-4">Your Hand</h2>
              <PlayerHand
                cards={playerHand}
                selectedCards={selectedCards}
                onSelectCard={selectCard}
                disabled={
                  !gameState?.rounds?.[gameState.currentRound || 0] ||
                  gameState.rounds[gameState.currentRound || 0].phase !==
                    RoundPhase.SUBMITTING ||
                  !!gameState.rounds[gameState.currentRound || 0].submissions[
                    user?.uid || ""
                  ]
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
