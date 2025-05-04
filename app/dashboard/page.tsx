"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { AnonymousConversion } from "@/components/auth/AnonymousConversion";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Debug output to help diagnose the issue
  useEffect(() => {
    console.log("Dashboard render state:", {
      loading,
      userExists: !!user,
      userId: user?.uid,
    });
  }, [loading, user]);

  useEffect(() => {
    // Only redirect if not loading and no user
    if (!loading && !user) {
      console.log("No authenticated user, redirecting to login");
      router.push("/login");
    }
  }, [user, loading, router]);

  // Add a client-side effect to handle potential loading state issues
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  useEffect(() => {
    // If loading takes more than 3 seconds, set loadingTooLong to true
    let timeout: NodeJS.Timeout;
    if (loading) {
      timeout = setTimeout(() => {
        setLoadingTooLong(true);
        console.log("Loading timeout triggered");
      }, 3000);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [loading]);

  // Show loading state while authentication is being determined
  if (loading) {
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
                  // Force reload the page
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
      <div className="flex justify-between items-center">
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
        <Button variant="default">Create Game</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Your Games</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You have not created any games yet.
            </p>
            <Button variant="link" className="p-0">
              Create your first game
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Join a Game</h2>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input type="text" placeholder="Enter game code" />
              <Button>Join</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Recent Activity</h2>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No recent activity to show.</p>
        </CardContent>
      </Card>

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
