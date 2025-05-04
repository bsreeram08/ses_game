"use client";

import { useState, useEffect } from "react";
import { useGameplay } from "@/hooks/useGameplay";
import { GameState, RoundPhase } from "@/types/gameplay";
import { PlayerStatus, GameStatus } from "@/types/game";
import { doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { toast } from "sonner";
import { ErrorTrackingService, GameEvents } from "@/lib/services/errorTrackingService";
import { Card as CardType, BlackCard, WhiteCard } from "@/types/cards";
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
  const [showDebug, setShowDebug] = useState(false);
  const [fixingGame, setFixingGame] = useState(false);

  // Function to reset the game to LOBBY state
  const resetGameToLobby = async () => {
    if (!gameState || !user || !gameId) return;

    setFixingGame(true);
    try {
      // Make a direct update to Firestore to reset the game state
      const gameRef = doc(db, "games", gameId);

      await updateDoc(gameRef, {
        status: "lobby",
        currentRound: 0,
        rounds: {},
        updatedAt: serverTimestamp(),
      });

      // Show a success message
      alert("Game reset to lobby state! The page will reload in 2 seconds.");

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error("Error resetting game state:", err);
      alert("Failed to reset game. Please try again or contact support.");
    } finally {
      setFixingGame(false);
    }
  };

  // Nuclear option - completely reset the game to a working state
  const nuclearReset = async () => {
    if (!gameState || !user || !gameId) return;

    setFixingGame(true);
    try {
      // Get a reference to the game document
      const gameRef = doc(db, "games", gameId);

      // First, get all the current players and their statuses
      const players = { ...gameState.players };

      // Update all players to READY status
      Object.keys(players).forEach((playerId) => {
        players[playerId] = {
          ...players[playerId],
          status: PlayerStatus.READY,
        };
      });

      // Complete reset of the game state while preserving players
      await updateDoc(gameRef, {
        status: GameStatus.LOBBY,
        currentRound: 0,
        rounds: {},
        players: players,
        updatedAt: serverTimestamp(),
      });

      // Show a success message
      alert(
        "Game has been completely reset to lobby state. The page will reload in 2 seconds."
      );

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error("Error resetting game state:", err);
      alert(
        "Failed to reset game. Please try refreshing the page or creating a new game."
      );
    } finally {
      setFixingGame(false);
    }
  };

  // Function to directly fix the corrupted game state
  const directFixGameState = async () => {
    if (!gameState || !user || !gameId) return;

    setFixingGame(true);
    try {
      // Get a reference to the game document
      const gameRef = doc(db, "games", gameId);

      // Create a first round object with all required fields
      const firstRound = {
        roundNumber: 1,
        phase: RoundPhase.DEALING,
        blackCard: { id: "black-card-1", text: "Placeholder black card text" },
        dealerId: gameState.currentDealerId,
        submissions: {},
        submissionsRevealed: false,
        startedAt: Timestamp.now(),
        winnerId: null,
        winningSubmission: null,
      };

      // Update all players to PLAYING status
      const players = { ...gameState.players };
      Object.keys(players).forEach((playerId) => {
        players[playerId] = {
          ...players[playerId],
          status: PlayerStatus.PLAYING,
        };
      });

      // Complete update with all necessary fields
      await updateDoc(gameRef, {
        status: GameStatus.PLAYING,
        currentRound: 1,
        rounds: { 1: firstRound },
        players: players,
        updatedAt: serverTimestamp(),
      });

      // Show a success message
      alert(
        "Game state completely rebuilt! The page will reload in 2 seconds."
      );

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error("Error directly fixing game state:", err);
      alert("Failed to fix game state. Please try the Nuclear Reset option.");
    } finally {
      setFixingGame(false);
    }
  };

  // Function to fix the game state when rounds are missing
  const fixGameState = async () => {
    if (!gameState || !user) return;

    setFixingGame(true);
    try {
      // Check if we have the specific issue (currentRound set but rounds object is empty)
      const hasRoundsIssue =
        gameState.currentRound > 0 &&
        (!gameState.rounds || Object.keys(gameState.rounds).length === 0);

      // Track the fix attempt with the issue type
      ErrorTrackingService.trackGameEvent("game_fix_attempt", {
        gameId: gameId,
        userId: user.uid,
        issueType: hasRoundsIssue ? "missing_rounds" : "other",
        gameStatus: gameState.status,
        roundsCount: Object.keys(gameState.rounds || {}).length,
        currentRound: gameState.currentRound,
      });

      if (hasRoundsIssue) {
        console.log("Detected rounds issue, attempting to fix...");
        // For this specific issue, resetting to lobby is more reliable
        return resetGameToLobby();
      }

      // Call startGame which will re-initialize the rounds
      const response = await startGame();

      // Clear any errors that might have been set
      clearError();

      if (!response.success) {
        // Track the failed fix attempt
        ErrorTrackingService.trackError(
          new Error(response.error || "Failed to fix game state"),
          {
            component: "GamePlay",
            action: "fixGameState",
            userId: user.uid,
            gameId: gameId,
            additionalData: {
              gameStatus: gameState.status,
              errorResponse: response.error,
            },
          }
        );

        toast.error(response.error || "Failed to fix game state. Please try again.");
        setFixingGame(false);
        return;
      }

      // Track successful fix
      ErrorTrackingService.trackGameEvent("game_fix_success", {
        gameId: gameId,
        userId: user.uid,
        fixMethod: "startGame",
      });

      // Show a success message
      toast.success("Game state fixed! The page will reload in 2 seconds.");

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      // Track the error
      ErrorTrackingService.trackError(err, {
        component: "GamePlay",
        action: "fixGameState",
        userId: user.uid,
        gameId: gameId,
        additionalData: {
          gameStatus: gameState.status,
          roundsCount: Object.keys(gameState.rounds || {}).length,
        },
      });

      console.error("Error fixing game state:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      toast.error(errorMessage);
      clearError(); // Clear any errors that might have been set
    } finally {
      setFixingGame(false);
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
            {gameState.hostId === user.uid && (
              <div className="mt-6 space-y-4">
                <Button
                  onClick={() => window.location.reload()}
                  size="sm"
                  variant="outline"
                >
                  Refresh Game
                </Button>

                <div>
                  <Button
                    onClick={nuclearReset}
                    size="sm"
                    variant="destructive"
                    disabled={fixingGame}
                    className="bg-red-700 hover:bg-red-800 text-white font-bold"
                  >
                    {fixingGame ? "RESETTING..." : "☢️ NUCLEAR RESET ☢️"}
                  </Button>
                  <p className="text-xs text-red-600 font-semibold mt-2">
                    <strong>GUARANTEED FIX:</strong> Completely resets the game
                    to lobby state while preserving all players.
                  </p>
                </div>

                <div>
                  <Button
                    onClick={directFixGameState}
                    size="sm"
                    variant="default"
                    disabled={fixingGame}
                  >
                    {fixingGame ? "Fixing..." : "Fix Game (Keep Playing)"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Attempts to fix the game while keeping it in playing state.
                  </p>
                </div>

                <div>
                  <Button
                    onClick={resetGameToLobby}
                    size="sm"
                    variant="outline"
                    disabled={fixingGame}
                  >
                    {fixingGame ? "Resetting..." : "Simple Reset to Lobby"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Basic reset to lobby state (try Nuclear Reset instead).
                  </p>
                </div>

                <div>
                  <Button
                    onClick={fixGameState}
                    size="sm"
                    variant="outline"
                    disabled={fixingGame}
                  >
                    {fixingGame ? "Fixing..." : "General Fix Attempt"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Try this if other fixes don't work.
                  </p>
                </div>

                <div>
                  <Button
                    onClick={() => setShowDebug(!showDebug)}
                    size="sm"
                    variant="outline"
                  >
                    {showDebug ? "Hide" : "Show"} Debug Info
                  </Button>

                  {showDebug && (
                    <div className="mt-4 p-4 bg-gray-100 rounded-md text-xs overflow-auto max-h-64">
                      <h4 className="font-bold mb-2">Game State:</h4>
                      <pre className="whitespace-pre-wrap break-all">
                        {JSON.stringify(
                          {
                            gameId,
                            status: gameState.status,
                            currentRound: gameState.currentRound,
                            roundsCount: gameState.rounds
                              ? Object.keys(gameState.rounds).length
                              : 0,
                            playerCount: Object.keys(gameState.players).length,
                            hostId: gameState.hostId,
                            currentDealerId: gameState.currentDealerId,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

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
                {/* Check if all players are ready */}
                {(() => {
                  const players = Object.values(gameState.players || {});
                  const totalPlayers = players.length;
                  const readyPlayers = players.filter(
                    (p) => p.status === PlayerStatus.READY
                  ).length;
                  const allPlayersReady =
                    readyPlayers === totalPlayers && totalPlayers >= 2;

                  return (
                    <>
                      <Button
                        onClick={async () => {
                          try {
                            const response = await startGame();
                            if (!response.success) {
                              // Track the error in analytics
                              ErrorTrackingService.trackError(new Error(response.error || 'Failed to start game'), {
                                component: 'GamePlay',
                                action: 'startGame',
                                userId: user?.uid,
                                gameId: gameId,
                                additionalData: {
                                  gameStatus: gameState?.status,
                                  playerCount: Object.keys(gameState?.players || {}).length,
                                  errorCode: response.error
                                }
                              });
                              
                              // Track as a specific game event
                              ErrorTrackingService.trackGameEvent(GameEvents.ERROR_STARTING_GAME, {
                                errorMessage: response.error,
                                gameId: gameId,
                                userId: user?.uid
                              });
                              
                              // Show error as toast notification
                              toast.error(
                                response.error ||
                                  "Failed to start game. Please try again."
                              );
                              
                              // Clear the error state to prevent the full page error
                              clearError();
                            } else {
                              // Track successful game start
                              ErrorTrackingService.trackGameEvent(GameEvents.GAME_STARTED, {
                                gameId: gameId,
                                userId: user?.uid,
                                playerCount: Object.keys(gameState?.players || {}).length
                              });
                            }
                          } catch (err) {
                            const errorMessage =
                              err instanceof Error
                                ? err.message
                                : "An unknown error occurred";
                            
                            // Track the error in analytics
                            ErrorTrackingService.trackError(err, {
                              component: 'GamePlay',
                              action: 'startGame',
                              userId: user?.uid,
                              gameId: gameId
                            });
                            
                            // Show toast notification
                            toast.error(errorMessage);
                            
                            // Clear the error state to prevent the full page error
                            clearError();
                          }
                        }}
                        disabled={loading || !allPlayersReady}
                        size="lg"
                        className={!allPlayersReady ? "opacity-70" : ""}
                      >
                        Start Game
                      </Button>

                      {!allPlayersReady && (
                        <div className="mt-2 text-amber-600 text-sm">
                          <p>
                            Not all players are ready ({readyPlayers}/
                            {totalPlayers}).
                          </p>
                          <p>
                            Players must click "Mark Ready" before you can start
                            the game.
                          </p>
                        </div>
                      )}

                      {allPlayersReady && (
                        <p className="text-sm text-green-600 mt-2">
                          All players are ready! You can start the game now.
                        </p>
                      )}

                      <p className="text-sm text-muted-foreground mt-2">
                        As the host, you can start the game when all players are
                        ready.
                      </p>
                    </>
                  );
                })()}
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
                onSelectWinner={selectWinner}
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

            <div className="p-4 bg-slate-50 rounded-lg">
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
          {!isDealer && gameState?.status === "playing" && (
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
