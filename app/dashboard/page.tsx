"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useGame } from "@/hooks/useGame";
import { Game, GameStatus } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Users, Clock, ArrowRight, Loader2 } from "lucide-react";
import { AnonymousConversion } from "@/components/auth/AnonymousConversion";
import { toast } from "sonner";
import { RelativeTime } from "@/components/ui/RelativeTime";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const {
    getActiveGames,
    joinGameByInviteCode,
    loading: gameLoading,
    error: gameError,
  } = useGame();
  const router = useRouter();

  const [activeGames, setActiveGames] = useState<Game[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [loadingGames, setLoadingGames] = useState(false);
  const [joiningGame, setJoiningGame] = useState(false);
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  // Use a ref to track if the component is mounted
  const isMounted = useRef(true);
  // Use a ref to track if we've already set up the listener
  const listenerSetup = useRef(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Set up cleanup on component unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch active games once on component mount
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupListener = async () => {
      // Only proceed if user exists and we haven't set up the listener yet
      if (!user || listenerSetup.current) return;
      
      try {
        // Mark that we've set up the listener
        listenerSetup.current = true;
        setLoadingGames(true);
        
        // Use a real-time listener for active games
        unsubscribe = getActiveGames(
          true,
          // onUpdate callback
          (games) => {
            // Only update state if component is still mounted
            if (isMounted.current) {
              setActiveGames(games);
              setLoadingGames(false);
            }
          },
          // onError callback
          (error) => {
            // Only update state if component is still mounted
            if (isMounted.current) {
              toast.error("Error loading games");
              setLoadingGames(false);
            }
          }
        ) as () => void;
      } catch (error) {
        if (isMounted.current) {
          setLoadingGames(false);
          toast.error("Failed to load games");
        }
      }
    };
    
    setupListener();
    
    // Return cleanup function to unsubscribe when component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Handle loading timeout
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (authLoading) {
      timeout = setTimeout(() => {
        if (isMounted.current) {
          setLoadingTooLong(true);
        }
      }, 3000);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [authLoading]);

  // Handle join game
  const handleJoinGame = async () => {
    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }

    setJoiningGame(true);
    try {
      const response = await joinGameByInviteCode(
        inviteCode.trim().toUpperCase()
      );
      if (response.success && response.gameId) {
        toast.success("Joined game successfully!");
        router.push(`/game/${response.gameId}`);
      }
    } catch (error) {
      console.error("Error joining game:", error);
    } finally {
      setJoiningGame(false);
    }
  };

  // No longer need the formatRelativeTime function as we're using the RelativeTime component

  // Show loading state while authentication is being determined
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-lg">Loading your dashboard...</p>

          {loadingTooLong && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Taking longer than expected...
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.reload();
                }}
              >
                Reload Page
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If not loading and no user, show a simple message (will redirect in useEffect)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-lg">Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center">
          <h1 className="text-3xl font-bold">Welcome, {user.displayName}</h1>
          {user.isAnonymous && (
            <div className="ml-3 flex items-center">
              <span className="text-sm px-2 py-1 bg-amber-100 text-amber-800 rounded-md">
                Guest
              </span>
              <AnonymousConversion />
            </div>
          )}
        </div>
        <Button variant="default" onClick={() => router.push("/create-game")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Game
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <h2 className="text-xl font-semibold">Your Active Games</h2>
            <CardDescription>
              Games you've created or joined that are still in progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gameError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{gameError}</AlertDescription>
              </Alert>
            )}

            {loadingGames ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : activeGames.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  You don't have any active games.
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push("/create-game")}
                >
                  Create your first game
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Players</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeGames.map((game) => (
                      <TableRow key={game.id}>
                        <TableCell>
                          <Badge
                            variant={
                              game.status === GameStatus.PLAYING
                                ? "default"
                                : "outline"
                            }
                          >
                            {game.status === GameStatus.LOBBY
                              ? "Lobby"
                              : "Playing"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                            {Object.keys(game.players).length}/
                            {game.settings.playerLimit}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <RelativeTime timestamp={game.createdAt} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/game/${game.id}`)}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Join a Game</h2>
            <CardDescription>
              Enter an invite code to join a friend's game
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter 6-letter code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center tracking-wider uppercase"
                />
                <Button
                  onClick={handleJoinGame}
                  disabled={joiningGame || !inviteCode.trim()}
                >
                  {joiningGame ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Join"
                  )}
                </Button>
              </div>

              <Separator />

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Or create your own game
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/create-game")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Game
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {user.isAnonymous && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <h2 className="text-xl font-semibold text-amber-800">
              Playing as Guest
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                You&apos;re currently using a temporary guest account. Your
                progress will be lost if you log out or clear your browser data.
              </p>
              <Button
                onClick={() => {
                  const saveButton = document.querySelector(
                    '[aria-label="Save Account"]'
                  ) as HTMLButtonElement;
                  if (saveButton) saveButton.click();
                }}
              >
                Create Permanent Account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
