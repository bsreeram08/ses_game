'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { CreateGameForm } from '@/components/game/CreateGameForm';
import { JoinGameForm } from '@/components/game/JoinGameForm';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Metadata is now handled in layout.tsx for client components

export default function CreateGamePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Show loading state while authentication is being determined
  if (loading) {
    return (
      <main className="container max-w-5xl mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </main>
    );
  }

  // If not loading and no user, show a simple message (will redirect in useEffect)
  if (!user) {
    return (
      <main className="container max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-lg">Redirecting to login...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Play Samudhayam Ethirkum Attai</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="w-full">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-semibold mb-4">Create a New Game</h2>
            <p className="text-muted-foreground mb-6">
              Set up a new game room with your preferred settings and invite friends to join.
            </p>
            <CreateGameForm />
          </CardContent>
        </Card>
        
        <Card className="w-full">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-semibold mb-4">Join a Game</h2>
            <p className="text-muted-foreground mb-6">
              Have an invite code? Join an existing game created by your friends.
            </p>
            <JoinGameForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
