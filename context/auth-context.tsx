"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import {
  onAuthChange,
  signInWithGoogle,
  signInWithGitHub,
  signOut,
} from "../lib/firebase/auth";
import { Skeleton } from "../components/ui/skeleton";
import { trackEvent, trackUserId } from "../lib/firebase/analytics";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInGoogle: () => Promise<void>; // Rename signIn to signInGoogle
  signInGitHub: () => Promise<void>; // Add signInGitHub
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);

      // Track analytics events based on auth state change
      if (user) {
        // User logged in or state changed to logged in
        trackUserId(user.uid);
        // Attempt to get provider ID for login method
        const providerId = user.providerData?.[0]?.providerId || "unknown";
        trackEvent("login", { method: providerId });
        // console.log(`Analytics: Tracked login for user ${user.uid} via ${providerId}`);
      } else {
        // User logged out or state changed to logged out
        trackUserId(null);
        trackEvent("logout");
        // console.log("Analytics: Tracked logout");
      }
    });

    return () => unsubscribe();
  }, []);

  // Rename handleSignIn to handleSignInGoogle
  const handleSignInGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Error signing in:", error);
      // Check for specific Firebase auth errors
      if (error instanceof Error) {
        if (error.message.includes("auth/configuration-not-found")) {
          console.error(
            "Firebase Auth configuration error. Please check if Google Auth is enabled in Firebase Console."
          );
        } else if (error.message.includes("auth/popup-closed-by-user")) {
          console.error("Sign-in popup was closed by the user.");
        }
      }
      throw error;
    }
  };

  // Add handleSignInGitHub
  const handleSignInGitHub = async () => {
    try {
      await signInWithGitHub();
    } catch (error) {
      console.error("Error signing in with GitHub:", error);
      // Add specific error handling if needed
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signInGoogle: handleSignInGoogle, // Update value object
    signInGitHub: handleSignInGitHub, // Update value object
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Auth guard component
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  // Removed router - no longer redirecting from here

  // console.log("RequireAuth Render:", { loading, user: !!user }); // Keep log for debugging

  // Removed useEffect for redirect

  if (loading) {
    // Show loading indicator while checking auth state
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-[250px] ml-4" />
      </div>
    );
  }

  if (!user) {
    // If not loading and no user, render nothing.
    // This prevents protected content from flashing or rendering.
    // User should be directed to sign in via UI elements (e.g., Header button).
    return null;
  }

  // User is authenticated and loading is done, render children
  return <>{children}</>;
}
