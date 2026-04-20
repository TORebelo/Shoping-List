import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
  type Auth,
  connectAuthEmulator,
  getAuth,
} from "firebase/auth";
import {
  type Firestore,
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  app = getApps()[0] ?? initializeApp(config);
  return app;
}

export function getDb(): Firestore {
  if (db) return db;
  const firebaseApp = getFirebaseApp();
  if (useEmulators && typeof window !== "undefined") {
    try {
      db = initializeFirestore(firebaseApp, {
        localCache: memoryLocalCache(),
        experimentalAutoDetectLongPolling: true,
        experimentalLongPollingOptions: { timeoutSeconds: 30 },
      });
    } catch (err) {
      console.warn(
        "[firebase/client] initializeFirestore failed; falling back to getFirestore",
        err,
      );
      db = getFirestore(firebaseApp);
    }
    try {
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    } catch {
      /* already connected */
    }
  } else {
    db = getFirestore(firebaseApp);
  }
  return db;
}

export function getAuthClient(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  if (useEmulators && typeof window !== "undefined") {
    try {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
    } catch {
      /* already connected */
    }
  }
  return auth;
}
