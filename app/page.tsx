"use client";

import Link from "next/link";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { useAuth } from "../hooks/useAuth";
import { useRouter } from "next/navigation";

export default function Home() {
  const { signInAnonymous, loading } = useAuth();
  const router = useRouter();

  const handleGuestLogin = async () => {
    try {
      await signInAnonymous();
      router.push("/dashboard");
    } catch (error) {
      console.error("Anonymous login failed:", error);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl w-full space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            <span className="block text-primary">
              Samudhayam Ethirkum Attai
            </span>
            <span className="block text-muted-foreground text-2xl sm:text-3xl mt-2">
              Indian Cards Against Humanity
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-muted-foreground">
            A party game for horrible people, with an Indian twist.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button asChild size="lg">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/signup">Create Account</Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={handleGuestLogin}
              disabled={loading}
            >
              Play as Guest
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Create Games</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Create custom game rooms, invite friends, and set your own
                rules.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Play Together</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Enjoy real-time gameplay with friends, no matter where they are.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Indian Content</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Cards designed specifically for Indian humor and cultural
                references.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How to Play */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">How to Play</CardTitle>
            <CardDescription>Quick guide to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <span className="font-bold text-primary">1</span>
              </div>
              <div>
                <h3 className="font-medium">Create an account</h3>
                <p className="text-muted-foreground">
                  Sign up to access all features
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <span className="font-bold text-primary">2</span>
              </div>
              <div>
                <h3 className="font-medium">Create or join a game</h3>
                <p className="text-muted-foreground">
                  Start a new game or use an invite code
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <span className="font-bold text-primary">3</span>
              </div>
              <div>
                <h3 className="font-medium">Play and have fun</h3>
                <p className="text-muted-foreground">
                  Take turns being the judge and submitting answers
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground pt-8 border-t border-border">
          <p>© 2025 Samudhayam Ethirkum Attai. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
