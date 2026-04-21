import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  type UserCredential,
} from "firebase/auth";
import { getAuthClient } from "@/lib/firebase/client";

export const PENDING_EMAIL_KEY = "shoppinglist:pending-email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(getAuthClient(), provider);
}

export async function sendMagicLink(
  email: string,
  redirect?: string,
): Promise<void> {
  if (!EMAIL_RE.test(email)) {
    throw new Error("Email inválido");
  }
  const base = `${window.location.origin}/signin/complete`;
  const url = redirect
    ? `${base}?redirect=${encodeURIComponent(redirect)}`
    : base;
  await sendSignInLinkToEmail(getAuthClient(), email, {
    url,
    handleCodeInApp: true,
  });
  localStorage.setItem(PENDING_EMAIL_KEY, email);
}

export type CompleteEmailSignInResult =
  | { kind: "not-a-link" }
  | { kind: "needs-email" }
  | { kind: "success"; credential: UserCredential };

/**
 * Attempts to finalize an email-link sign-in using the email cached in
 * localStorage. Returns "needs-email" when the link is valid but the
 * caller's storage is empty (typical for cross-device flow: request on
 * desktop, open link on phone) — callers should prompt the user and then
 * call `completeEmailSignInWith(email)` to retry.
 */
export async function completeEmailSignIn(): Promise<CompleteEmailSignInResult> {
  const auth = getAuthClient();
  const href = window.location.href;
  if (!isSignInWithEmailLink(auth, href)) return { kind: "not-a-link" };
  const email = localStorage.getItem(PENDING_EMAIL_KEY);
  if (!email) return { kind: "needs-email" };
  const credential = await signInWithEmailLink(auth, email, href);
  localStorage.removeItem(PENDING_EMAIL_KEY);
  return { kind: "success", credential };
}

export async function completeEmailSignInWith(
  email: string,
): Promise<UserCredential> {
  if (!EMAIL_RE.test(email)) {
    throw new Error("Email inválido");
  }
  const auth = getAuthClient();
  const href = window.location.href;
  if (!isSignInWithEmailLink(auth, href)) {
    throw new Error("Este link não é um link de sessão válido.");
  }
  const credential = await signInWithEmailLink(auth, email, href);
  localStorage.removeItem(PENDING_EMAIL_KEY);
  return credential;
}
