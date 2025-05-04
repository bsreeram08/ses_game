import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  updateProfile,
  signInAnonymously,
  User,
  UserCredential,
  AuthError as FirebaseAuthError,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { generateRandomName } from "@/lib/utils/nameGenerator";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

type AuthError = { code: string; message: string };

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const router = useRouter();

  // Separate function to update user document to avoid blocking auth flow
  const updateUserDocument = async (
    currentUser: User,
    customDisplayName?: string
  ) => {
    try {
      const userDoc = doc(db, "users", currentUser.uid);
      const displayName =
        customDisplayName ||
        currentUser.displayName ||
        `Guest-${currentUser.uid.substring(0, 5)}`;

      // For anonymous users, ensure isAnonymous flag is set
      if (currentUser.isAnonymous) {
        await setDoc(
          userDoc,
          {
            displayName,
            email: currentUser.email || "",
            photoURL: currentUser.photoURL || "",
            isAnonymous: true,
            createdAt: new Date(), // Include createdAt for consistency
            updatedAt: new Date(),
          },
          { merge: true }
        );
      } else {
        await setDoc(
          userDoc,
          {
            displayName,
            email: currentUser.email || "",
            photoURL: currentUser.photoURL || "",
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }
      console.log("User document updated successfully");
    } catch (err) {
      console.error(
        "Error updating user document, but auth flow continues:",
        err
      );
      // Don't rethrow - we want to silently fail here to prevent auth flow issues
    }
  };

  useEffect(() => {
    // Set loading state immediately
    setLoading(true);

    // Set up persistence to LOCAL (browser localStorage)
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Error setting persistence:", error);
      // If persistence fails, we should still continue with the auth flow
      setLoading(false);
    });

    // Create a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
      console.log("Auth loading timed out after 5 seconds");
    }, 5000);

    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      // Clear the timeout since we got a response
      clearTimeout(loadingTimeout);

      if (currentUser) {
        console.log("Auth state changed: User logged in", currentUser.uid);
        // Set user state immediately - don't wait for Firestore operations
        setUser(currentUser);

        // Handle Firestore operations separately and don't block auth flow
        // This prevents the infinite loop if Firestore operations fail
        setTimeout(() => {
          updateUserDocument(currentUser).catch((err) => {
            console.error("Background user document update failed:", err);
          });
        }, 0);

        // Set loading to false immediately after setting user
        setLoading(false);
      } else {
        console.log("Auth state changed: No user");
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    setError(null);
    try {
      const userCredential: UserCredential =
        await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });

      // Create user document in Firestore
      const userDoc = doc(db, "users", userCredential.user.uid);
      await setDoc(userDoc, {
        displayName,
        email,
        photoURL: userCredential.user.photoURL || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      router.push("/dashboard");
      return userCredential;
    } catch (err) {
      const firebaseError = err as FirebaseAuthError;
      setError({
        code: firebaseError.code || "unknown",
        message: firebaseError.message || "An error occurred during sign up",
      });
      throw err;
    }
  };

  const logIn = async (email: string, password: string) => {
    setError(null);
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      router.push("/dashboard");
      return userCredential;
    } catch (err) {
      const firebaseError = err as FirebaseAuthError;
      setError({
        code: firebaseError.code || "unknown",
        message: firebaseError.message || "Invalid email or password",
      });
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      router.push("/dashboard");
      return result;
    } catch (err) {
      const firebaseError = err as FirebaseAuthError;
      setError({
        code: firebaseError.code || "unknown",
        message: firebaseError.message || "Error signing in with Google",
      });
      throw err;
    }
  };

  const signInWithFacebook = async () => {
    setError(null);
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      router.push("/dashboard");
      return result;
    } catch (err) {
      const firebaseError = err as FirebaseAuthError;
      setError({
        code: firebaseError.code || "unknown",
        message: firebaseError.message || "Error signing in with Facebook",
      });
      throw err;
    }
  };

  const signInAnonymous = async () => {
    setError(null);
    try {
      // Set loading state to true before attempting sign in
      setLoading(true);

      // Generate a random Indian-themed name for the anonymous user
      const randomName = generateRandomName();

      // Attempt anonymous sign in
      const result = await signInAnonymously(auth);
      console.log("Anonymous sign in successful", result.user.uid);

      try {
        // Update the user profile with the random name
        await updateProfile(result.user, {
          displayName: randomName,
        });
        console.log("Profile updated with random name:", randomName);

        // Create a basic profile for anonymous user in a non-blocking way
        if (result.user) {
          // Use the updateUserDocument function to handle Firestore operations
          // This prevents blocking the auth flow if Firestore operations fail
          updateUserDocument(result.user, randomName);
        }
      } catch (profileError) {
        // Log the error but continue with authentication
        console.error("Error updating profile, but continuing:", profileError);
      }

      // Set loading to false before navigation
      setLoading(false);

      // Explicitly navigate to dashboard after successful login
      router.push("/dashboard");
      return result;
    } catch (err) {
      const firebaseError = err as FirebaseAuthError;
      setError({
        code: firebaseError.code || "unknown",
        message: firebaseError.message || "Error signing in anonymously",
      });
      // Set loading to false on error
      setLoading(false);
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    signUp,
    logIn,
    signInWithGoogle,
    signInWithFacebook,
    signInAnonymous,
  };
};
