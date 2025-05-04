"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/hooks/useGame";
import { useGameListener } from "@/hooks/useGameListener";
import { useAuth } from "@/hooks/useAuth";
import { Game, GamePlayer, PlayerStatus } from "@/types/game";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Copy,
  CheckCircle,
  XCircle,
  UserX,
  Play,
  LogOut,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface GameLobbyProps {
  gameId: string;
}

export function GameLobby({ gameId }: GameLobbyProps) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    game,
    loading: gameLoading,
    error: gameError,
  } = useGameListener(gameId);
  const {
    setPlayerReady,
    startGame,
    kickPlayer,
    leaveGame,
    loading: actionLoading,
    error: actionError,
  } = useGame();

  const [copied, setCopied] = useState(false);
  const [readyStatus, setReadyStatus] = useState(false);

  // Reset ready status when game changes
  useEffect(() => {
    if (game && user) {
      const currentPlayer = game.players[user.uid];
      if (currentPlayer) {
        setReadyStatus(currentPlayer.status === PlayerStatus.READY);
      }
    }
  }, [game, user]);

  // Handle copying invite code
  const copyInviteCode = () => {
    if (game) {
      navigator.clipboard.writeText(game.inviteCode);
      setCopied(true);
      toast.success("Invite code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle ready status change
  const handleReadyToggle = async () => {
    if (game && user) {
      const newStatus = !readyStatus;
      setReadyStatus(newStatus);
      await setPlayerReady(gameId, newStatus);
    }
  };

  // Handle starting the game
  const handleStartGame = async () => {
    if (game && user) {
      const response = await startGame(gameId);
      if (response.success) {
        toast.success("Game started!");
      }
    }
  };

  // Handle kicking a player
  const handleKickPlayer = async (playerId: string) => {
    if (game && user) {
      const response = await kickPlayer(gameId, playerId);
      if (response.success) {
        toast.success("Player kicked from game");
      }
    }
  };

  // Handle leaving the game
  const handleLeaveGame = async () => {
    if (game && user) {
      const response = await leaveGame(gameId);
      if (response.success) {
        toast.success("Left the game");
        router.push("/dashboard");
      }
    }
  };

  // Check if current user is the host
  const isHost = game && user ? game.hostId === user.uid : false;

  // Check if game can be started
  const canStartGame = () => {
    if (!game || !user || !isHost) return false;

    const players = Object.values(game.players);
    if (players.length < 3) return false;

    // All non-host players must be ready
    const nonHostPlayers = players.filter((p) => !p.isHost);
    return nonHostPlayers.every((p) => p.status === PlayerStatus.READY);
  };

  // Render loading state
  if (gameLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    );
  }

  // Render error state
  if (gameError || !game) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {gameError ||
            "Game not found. The game may have been cancelled or ended."}
        </AlertDescription>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard")}
        >
          Return to Dashboard
        </Button>
      </Alert>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Game Lobby</CardTitle>
            <CardDescription>
              Waiting for players to join and ready up
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLeaveGame}
            disabled={actionLoading}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Leave
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Invite code section */}
          <div className="bg-muted p-4 rounded-md flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Invite Code</p>
              <p className="text-2xl font-bold tracking-wider">
                {game.inviteCode}
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={copyInviteCode}>
                    {copied ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy invite code</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Game settings */}
          <div>
            <h3 className="text-sm font-medium mb-2">Game Settings</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Player Limit:</span>
                <span>{game.settings.playerLimit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Rounds Per Player:
                </span>
                <span>{game.settings.roundsPerPlayer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Family Mode:</span>
                <span>{game.settings.familyMode ? "On" : "Off"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Card Deck:</span>
                <span>{game.settings.cardDeckId}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Players list */}
          <div>
            <h3 className="text-sm font-medium mb-2">
              Players ({Object.keys(game.players).length}/
              {game.settings.playerLimit})
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Status</TableHead>
                  {isHost && (
                    <TableHead className="w-[100px]">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(game.players).map((player: GamePlayer) => (
                  <TableRow key={player.uid}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        {player.displayName}
                        {player.isHost && (
                          <Badge variant="outline" className="ml-2">
                            Host
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {player.status === PlayerStatus.READY ? (
                        <div className="flex items-center text-green-500">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Ready
                        </div>
                      ) : (
                        <div className="flex items-center text-yellow-500">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Not Ready
                        </div>
                      )}
                    </TableCell>
                    {isHost && (
                      <TableCell>
                        {player.uid !== user?.uid && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleKickPlayer(player.uid)}
                            disabled={actionLoading}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Error message */}
          {actionError && (
            <Alert variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {user && !isHost && (
          <Button
            onClick={handleReadyToggle}
            variant={readyStatus ? "outline" : "default"}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : readyStatus ? (
              <XCircle className="h-4 w-4 mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {readyStatus ? "Cancel Ready" : "Ready Up"}
          </Button>
        )}

        {isHost && (
          <Button
            onClick={handleStartGame}
            disabled={!canStartGame() || actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Start Game
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
