import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics"; // Import Analytics
import { getPerformance } from "firebase/performance"; // Import getPerformance

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
let analytics: Analytics | null = null; // Initialize analytics variable
let performance = null; // Initialize performance variable (type will be inferred)

// Initialize Analytics and Performance only on client-side
if (typeof window !== "undefined") {
  performance = getPerformance(app); // Initialize Performance Monitoring
  console.log("Firebase Performance Monitoring initialized.");
  // Check if measurementId is provided before attempting to initialize
  if (firebaseConfig.measurementId) {
    isSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
        console.log("Firebase Analytics initialized.");
      } else {
        console.log("Firebase Analytics is not supported in this environment.");
      }
    });
  } else {
    console.warn(
      "Firebase Analytics not initialized: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is missing."
    );
  }
}

export { app, auth, db, analytics, performance }; // Export analytics and performance
