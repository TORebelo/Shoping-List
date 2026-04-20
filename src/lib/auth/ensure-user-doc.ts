import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";

type Input = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
};

function resolveDisplayName(input: Input): string {
  if (input.displayName && input.displayName.trim().length > 0) {
    return input.displayName;
  }
  const local = input.email.split("@")[0];
  return local || input.uid;
}

export async function ensureUserDoc(input: Input): Promise<void> {
  const db = getDb();
  const ref = doc(db, "users", input.uid);
  const snap = await getDoc(ref);
  const displayName = resolveDisplayName(input);

  if (!snap.exists()) {
    const base: Record<string, unknown> = {
      uid: input.uid,
      email: input.email,
      displayName,
      listIds: [],
      plan: "free",
      createdAt: serverTimestamp(),
    };
    if (input.photoURL) base.photoURL = input.photoURL;
    await setDoc(ref, base);
    return;
  }

  const profile: Record<string, unknown> = {
    email: input.email,
    displayName,
  };
  if (input.photoURL) profile.photoURL = input.photoURL;
  await updateDoc(ref, profile);
}
