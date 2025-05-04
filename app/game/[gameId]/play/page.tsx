'use client';

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import GamePlay from '@/components/game/GamePlay';
import { Loader2 } from 'lucide-react';

interface GamePlayPageProps {
  params: Promise<{ gameId: string }>;
}

export default function GamePlayPage({ params: paramsPromise }: GamePlayPageProps) {
  const { user, loading: authLoading, error: authError } = useAuth();
  const params = use(paramsPromise);
  const { gameId } = params;
  const router = useRouter();

  // Log params for debugging
  console.log('Params:', params);
  console.log('Game ID:', gameId);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in the useEffect
  }

  return <GamePlay gameId={gameId} />;
}
