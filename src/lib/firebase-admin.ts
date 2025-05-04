import {
  initializeApp,
  getApps,
  cert,
  ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth"; // Import Auth

// Helper function to format private key
function getPrivateKey(): string {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  // Check if the key is already properly formatted
  if (key?.includes("-----BEGIN PRIVATE KEY-----")) {
    return key.replace(/\\n/g, "\n");
  }
  // If key is base64 encoded (some deployment platforms do this)
  if (key?.includes(" ")) {
    return Buffer.from(key, "base64").toString("ascii");
  }
  throw new Error("Invalid FIREBASE_PRIVATE_KEY format");
}

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: getPrivateKey(),
};

// Function to validate and initialize Firebase
function initializeFirebase() {
  // Validate environment variables
  if (
    !serviceAccount.projectId ||
    !serviceAccount.privateKey ||
    !serviceAccount.clientEmail
  ) {
    const missingVars = [];
    if (!serviceAccount.projectId) missingVars.push("FIREBASE_PROJECT_ID");
    if (!serviceAccount.privateKey) missingVars.push("FIREBASE_PRIVATE_KEY");
    if (!serviceAccount.clientEmail) missingVars.push("FIREBASE_CLIENT_EMAIL");

    throw new Error(
      `Missing required Firebase Admin credentials in environment variables: ${missingVars.join(
        ", "
      )}`
    );
  }

  // Type for Firebase Admin error
  interface FirebaseAdminError extends Error {
    code?: string;
    errorInfo?: {
      code: string;
      message: string;
    };
  }

  try {
    // Get existing apps
    const apps = getApps();

    // Always initialize a new app with a unique name if no default app exists
    if (!apps.find((app) => app.name === "[DEFAULT]")) {
      const app = initializeApp(
        {
          credential: cert(serviceAccount),
        },
        "[DEFAULT]"
      );

      console.log("Firebase Admin initialized successfully:", {
        name: app.name,
      });
    } else {
      console.log("Firebase Admin default app already exists");
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      code:
        error instanceof Error ? (error as FirebaseAdminError).code : undefined,
      errorInfo:
        error instanceof Error
          ? (error as FirebaseAdminError).errorInfo
          : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// Initialize Firebase and get database/auth instances
let _adminDb: ReturnType<typeof getFirestore>;
let _adminAuth: ReturnType<typeof getAuth>; // Variable for Auth instance

function getAdminDb() {
  if (!_adminDb) {
    try {
      initializeFirebase();
      _adminDb = getFirestore();
    } catch (error) {
      console.error("Fatal error initializing Firebase Admin:", error);
      throw error;
    }
  }
  return _adminDb;
}

function getAdminAuth() {
  if (!_adminAuth) {
    try {
      initializeFirebase(); // Ensures app is initialized
      _adminAuth = getAuth();
    } catch (error) {
      console.error("Fatal error initializing Firebase Admin Auth:", error);
      throw error;
    }
  }
  return _adminAuth;
}

// Export proxies to ensure lazy initialization of Firebase Admin
// This pattern ensures:
// 1. Firebase is initialized only when first accessed
// 2. Initialization happens only once
// 3. All Firestore operations use the same instance
// 4. Method calls maintain proper 'this' binding
export const adminDb = new Proxy({} as Firestore, {
  get: (target, prop: string | symbol) => {
    const db = getAdminDb();
    // We know db is a Firestore instance, so we can safely access its properties
    const value = Reflect.get(db, prop);
    if (typeof value === "function") {
      return value.bind(db);
    }
    return value;
  },
});

// Export Auth proxy
export const adminAuth = new Proxy({} as Auth, {
  get: (target, prop: string | symbol) => {
    const auth = getAdminAuth();
    const value = Reflect.get(auth, prop);
    if (typeof value === "function") {
      return value.bind(auth);
    }
    return value;
  },
});
