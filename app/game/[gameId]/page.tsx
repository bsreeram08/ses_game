"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameLobby } from "@/components/game/GameLobby";
import { useGameListener } from "@/hooks/useGameListener";
import { useAuth } from "@/hooks/useAuth";
import { GameStatus } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function GamePage({ params }: { params: { gameId: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { game, loading, error } = useGameListener(params.gameId);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Handle game state changes
  useEffect(() => {
    if (!loading && game) {
      // If game is in playing state, redirect to the play page
      if (game.status === GameStatus.PLAYING) {
        setIsRedirecting(true);
        router.push(`/game/${params.gameId}/play`);
      }

      // If game is cancelled or ended, redirect to dashboard
      if (
        game.status === GameStatus.CANCELLED ||
        game.status === GameStatus.ENDED
      ) {
        setIsRedirecting(true);
        router.push("/dashboard");
      }
    }
  }, [game, loading, params.gameId, router]);

  // Handle authentication and player verification
  useEffect(() => {
    if (!loading && game && user) {
      // Check if user is a player in this game
      const isPlayerInGame = game.players && game.players[user.uid];

      if (!isPlayerInGame) {
        // If user is not a player in this game, redirect to dashboard
        router.push("/dashboard");
      }
    }
  }, [game, loading, user, router]);

  return (
    <main className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          disabled={loading || isRedirecting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-4">
              <Button onClick={() => router.push("/dashboard")}>
                Return to Dashboard
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : isRedirecting ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-lg">Redirecting...</p>
            </div>
          </CardContent>
        </Card>
      ) : game ? (
        <GameLobby gameId={params.gameId} />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Game Not Found</AlertTitle>
          <AlertDescription>
            The game you&apos;re looking for doesn't exist or has been
            cancelled.
            <div className="mt-4">
              <Button onClick={() => router.push("/dashboard")}>
                Return to Dashboard
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </main>
  );
}
