import {
  GoogleAuthProvider,
  GithubAuthProvider, // Add GithubAuthProvider
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "./firebase";

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Initialize GitHub Auth Provider
const githubProvider = new GithubAuthProvider();
// You can add scopes if needed, e.g., githubProvider.addScope('repo');
// githubProvider.setCustomParameters({ ... }); // Add custom parameters if needed

export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw new Error("Failed to sign in with Google");
  }
}

// New function for GitHub sign-in
export async function signInWithGitHub(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, githubProvider);
    // You can access the GitHub OAuth access token if needed:
    // const credential = GithubAuthProvider.credentialFromResult(result);
    // const token = credential?.accessToken;
    return result.user;
  } catch (error) {
    console.error("Error signing in with GitHub:", error);
    // Add specific error handling if needed (e.g., account exists with different credential)
    throw new Error("Failed to sign in with GitHub");
  }
}

export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw new Error("Failed to sign out");
  }
}

export function onAuthChange(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}
