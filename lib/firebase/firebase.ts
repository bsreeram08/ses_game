import { initializeApp, getApps, getApp, FirebaseError } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
  getAnalytics as getFirebaseAnalytics,
  isSupported,
  Analytics,
  logEvent,
} from "firebase/analytics";
import { getPerformance } from "firebase/performance"; // Import getPerformance
import { getDatabase } from "firebase/database"; // Import RTDB

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
let analytics: Analytics | null = null; // Initialize analytics variable
let performance = null; // Initialize performance variable (type will be inferred)

// Initialize Analytics and Performance only on client-side
if (typeof window !== "undefined") {
  try {
    performance = getPerformance(app); // Initialize Performance Monitoring
    console.log("Firebase Performance Monitoring initialized.");

    // Check if measurementId is provided before attempting to initialize analytics
    if (firebaseConfig.measurementId) {
      isSupported()
        .then((supported) => {
          if (supported) {
            analytics = getFirebaseAnalytics(app);
            console.log("Firebase Analytics initialized.");

            // Log app_initialized event
            logEvent(analytics, "app_initialized");
          } else {
            console.log(
              "Firebase Analytics is not supported in this environment."
            );
          }
        })
        .catch((error) => {
          console.error("Error initializing Firebase Analytics:", error);
        });
    } else {
      console.log(
        "Firebase Analytics not initialized: measurementId not provided."
      );
    }
  } catch (error) {
    console.error("Error initializing Firebase services:", error);
  }
}

/**
 * Get the analytics instance
 * @returns The Firebase Analytics instance or null if not initialized
 */
const getAnalytics = (): Analytics | null => {
  return analytics;
};

/**
 * Track an error in the console and optionally in analytics
 * @param error The error object
 * @param context Additional context about where the error occurred
 */
const trackError = (
  error: unknown,
  context: Record<string, any> = {}
): void => {
  // Always log to console
  console.error("Error occurred:", error, context);

  // If analytics is available, log the error there too
  if (analytics) {
    const errorData: Record<string, any> = {
      timestamp: new Date().toISOString(),
      ...context,
    };

    if (error instanceof FirebaseError) {
      errorData.errorCode = error.code;
      errorData.errorMessage = error.message;
      errorData.errorType = "FirebaseError";
    } else if (error instanceof Error) {
      errorData.errorMessage = error.message;
      errorData.errorStack = error.stack;
      errorData.errorType = error.name;
    } else {
      errorData.errorMessage = String(error);
      errorData.errorType = "Unknown";
    }

    logEvent(analytics, "app_error", errorData);
  }
};

export { auth, db, rtdb, getAnalytics, trackError, performance };
