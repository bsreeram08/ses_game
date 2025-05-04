"use client";

import { GamePlayer, PlayerStatus } from "@/types/game";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useState } from "react";
import { Crown, Award, User, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScoreBoardProps {
  players: Record<string, GamePlayer>;
  currentDealerId?: string;
}

export default function ScoreBoard({
  players,
  currentDealerId,
}: ScoreBoardProps) {
  // Get current user
  const { user } = useAuth();
  const [isSettingReady, setIsSettingReady] = useState(false);
  
  // Function to mark player as ready
  const markAsReady = async () => {
    if (!user || isSettingReady) return;
    
    setIsSettingReady(true);
    try {
      // Get the game ID from the URL
      const gameId = window.location.pathname.split('/').pop();
      if (!gameId) throw new Error('Game ID not found');
      
      // Update player status in Firestore
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        [`players.${user.uid}.status`]: PlayerStatus.READY
      });
    } catch (error) {
      console.error('Error marking player as ready:', error);
    } finally {
      setIsSettingReady(false);
    }
  };
  
  // Function to mark player as not ready
  const markAsNotReady = async () => {
    if (!user || isSettingReady) return;
    
    setIsSettingReady(true);
    try {
      // Get the game ID from the URL
      const gameId = window.location.pathname.split('/').pop();
      if (!gameId) throw new Error('Game ID not found');
      
      // Update player status in Firestore
      const gameRef = doc(db, 'games', gameId);
      await updateDoc(gameRef, {
        [`players.${user.uid}.status`]: PlayerStatus.JOINED
      });
    } catch (error) {
      console.error('Error marking player as not ready:', error);
    } finally {
      setIsSettingReady(false);
    }
  };

  // Sort players by score (descending)
  const sortedPlayers = Object.values(players).sort((a, b) => {
    // First by score (descending)
    if ((b.score || 0) !== (a.score || 0)) {
      return (b.score || 0) - (a.score || 0);
    }
    // Then by host status (host first)
    if (a.isHost !== b.isHost) {
      return a.isHost ? -1 : 1;
    }
    // Then by name
    return a.displayName.localeCompare(b.displayName);
  });

  const getStatusLabel = (status: PlayerStatus) => {
    switch (status) {
      case PlayerStatus.JOINED:
        return "Joined";
      case PlayerStatus.READY:
        return "Ready";
      case PlayerStatus.PLAYING:
        return "Playing";
      case PlayerStatus.SPECTATING:
        return "Spectating";
      case PlayerStatus.DISCONNECTED:
        return "Disconnected";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = (status: PlayerStatus) => {
    switch (status) {
      case PlayerStatus.JOINED:
        return "bg-gray-200 text-gray-800";
      case PlayerStatus.READY:
        return "bg-green-100 text-green-800";
      case PlayerStatus.PLAYING:
        return "bg-blue-100 text-blue-800";
      case PlayerStatus.SPECTATING:
        return "bg-purple-100 text-purple-800";
      case PlayerStatus.DISCONNECTED:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  // Count ready players
  const readyPlayersCount = Object.values(players).filter(
    (player) => player.status === PlayerStatus.READY
  ).length;
  const totalPlayersCount = Object.values(players).length;
  
  // Check if current user is ready
  const currentPlayer = user ? players[user.uid] : null;
  const isCurrentPlayerReady = currentPlayer?.status === PlayerStatus.READY;
  
  return (
    <div className="space-y-4">
      {/* Ready players indicator */}
      <div className="flex justify-between items-center mb-2 px-2">
        <div className="text-sm font-medium">
          <span className="text-green-600">{readyPlayersCount}</span>
          <span className="text-gray-600">/{totalPlayersCount} players ready</span>
        </div>
        
        {/* Ready button for current user */}
        {user && currentPlayer && currentPlayer.status !== PlayerStatus.PLAYING && (
          <Button
            size="sm"
            variant={isCurrentPlayerReady ? "outline" : "default"}
            onClick={isCurrentPlayerReady ? markAsNotReady : markAsReady}
            disabled={isSettingReady}
            className={cn(
              isCurrentPlayerReady ? "border-green-500 text-green-700" : "bg-green-600 hover:bg-green-700",
              "min-w-24"
            )}
          >
            {isSettingReady ? (
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                <span>...</span>
              </span>
            ) : isCurrentPlayerReady ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                <span>Ready</span>
              </span>
            ) : (
              "Mark Ready"
            )}
          </Button>
        )}
      </div>
      
      {sortedPlayers.map((player) => (
        <div
          key={player.uid}
          className={cn(
            "flex items-center p-3 rounded-lg",
            currentDealerId === player.uid ? "bg-amber-50" : "bg-white",
            user?.uid === player.uid ? "border-2 border-primary" : "",
            player.status === PlayerStatus.DISCONNECTED && "opacity-60",
            player.status === PlayerStatus.READY && "bg-green-50"
          )}
        >
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage src={player.photoURL || ""} alt={player.displayName} />
            <AvatarFallback>
              {player.displayName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">
                {user?.uid === player.uid ? (
                  <span className="flex items-center gap-1">
                    <span className="text-primary font-semibold">You</span>
                    <span className="text-muted-foreground">
                      ({player.displayName})
                    </span>
                  </span>
                ) : (
                  player.displayName
                )}
              </p>
              {player.isHost && <Crown className="h-4 w-4 text-amber-500" />}
              {currentDealerId === player.uid && (
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-300"
                >
                  Card Czar
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="secondary"
                className={getStatusColor(player.status)}
              >
                {getStatusLabel(player.status)}
              </Badge>

              {player.score !== undefined && player.score > 0 && (
                <div className="flex items-center text-sm text-amber-600">
                  <Award className="h-4 w-4 mr-1" />
                  <span>{player.score}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
