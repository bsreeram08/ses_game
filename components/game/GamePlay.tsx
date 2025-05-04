"use client";

import { useState, useEffect } from "react";
import { useGameplay } from "@/hooks/useGameplay";
import { GameState, RoundPhase } from "@/types/gameplay";
import { PlayerStatus, GameStatus } from "@/types/game";
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

    if (!currentRound) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <h2 className="text-2xl font-bold mb-4">
            Waiting for game to start...
          </h2>
          
          {/* Add start game button for the host */}
          {gameState.hostId === user.uid && gameState.status === GameStatus.LOBBY && (
            <div className="mt-4">
              <Button 
                onClick={() => startGame()}
                disabled={loading}
                size="lg"
              >
                Start Game
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                As the host, you can start the game when all players are ready.
              </p>
            </div>
          )}
          
          {/* Show error message if game is not in lobby state */}
          {gameState.status !== GameStatus.LOBBY && (
            <div className="mt-4">
              <p className="text-amber-600">
                Game is currently in {gameState.status} state. Please wait for the current round to complete.
              </p>
            </div>
          )}
          
          {gameState.hostId !== user.uid && (
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
