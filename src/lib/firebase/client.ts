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
} from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

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
  db = getFirestore(getFirebaseApp());
  if (
    process.env.NEXT_PUBLIC_USE_EMULATORS === "true" &&
    typeof window !== "undefined"
  ) {
    try {
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    } catch {
      /* already connected */
    }
  }
  return db;
}

export function getAuthClient(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  if (
    process.env.NEXT_PUBLIC_USE_EMULATORS === "true" &&
    typeof window !== "undefined"
  ) {
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
