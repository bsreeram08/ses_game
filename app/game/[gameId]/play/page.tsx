"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameListener } from "@/hooks/useGameListener";
import { useAuth } from "@/hooks/useAuth";
import { GameStatus } from "@/types/game";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function GamePlayPage({
  params,
}: {
  params: { gameId: string };
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { game, loading, error } = useGameListener(params.gameId);

  // Handle game state changes
  useEffect(() => {
    if (!loading && game) {
      // If game is in lobby state, redirect to the lobby page
      if (game.status === GameStatus.LOBBY) {
        router.push(`/game/${params.gameId}`);
      }

      // If game is cancelled or ended, redirect to dashboard
      if (
        game.status === GameStatus.CANCELLED ||
        game.status === GameStatus.ENDED
      ) {
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
    <main className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          disabled={loading}
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
      ) : game ? (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Game in Progress</CardTitle>
            <CardDescription>
              Game ID: {params.gameId} | Players:{" "}
              {Object.keys(game.players).length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold mb-4">
                Game Play Coming Soon!
              </h2>
              <p className="text-muted-foreground mb-6">
                This is a placeholder for the game play interface. The actual
                gameplay mechanics will be implemented in a future update.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div className="p-4 border rounded-md">
                  <h3 className="font-semibold mb-2">Current Round</h3>
                  <p>{game.currentRound || 1}</p>
                </div>
                <div className="p-4 border rounded-md">
                  <h3 className="font-semibold mb-2">Current Dealer</h3>
                  <p>
                    {game.currentDealerId
                      ? game.players[game.currentDealerId]?.displayName
                      : "None"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Leave Game
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Game Not Found</AlertTitle>
          <AlertDescription>
            The game you're looking for doesn't exist or has been cancelled.
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
