"use client";

import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardHeader, CardContent } from "../../components/ui/card";
import { AnonymousConversion } from "../../components/auth/AnonymousConversion";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-lg">Loading...</div>
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
