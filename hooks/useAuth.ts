import { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase/firebase";
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
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

type AuthError = { code: string; message: string };

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDoc = doc(db, "users", currentUser.uid);
        await setDoc(
          userDoc,
          {
            displayName: currentUser.displayName || "",
            email: currentUser.email || "",
            photoURL: currentUser.photoURL || "",
            updatedAt: new Date(),
          },
          { merge: true }
        );
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
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
      const result = await signInAnonymously(auth);

      // Create a basic profile for anonymous user
      if (result.user) {
        const userDoc = doc(db, "users", result.user.uid);
        await setDoc(
          userDoc,
          {
            displayName: `Guest-${result.user.uid.substring(0, 5)}`,
            isAnonymous: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }

      router.push("/dashboard");
      return result;
    } catch (err) {
      const firebaseError = err as FirebaseAuthError;
      setError({
        code: firebaseError.code || "unknown",
        message: firebaseError.message || "Error signing in anonymously",
      });
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
