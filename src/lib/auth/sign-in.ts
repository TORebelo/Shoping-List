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

export async function completeEmailSignIn(): Promise<UserCredential | null> {
  const auth = getAuthClient();
  const href = window.location.href;
  if (!isSignInWithEmailLink(auth, href)) return null;
  const email = localStorage.getItem(PENDING_EMAIL_KEY);
  if (!email) {
    throw new Error(
      "Não encontrámos o email usado para iniciar sessão. Tenta novamente.",
    );
  }
  const result = await signInWithEmailLink(auth, email, href);
  localStorage.removeItem(PENDING_EMAIL_KEY);
  return result;
}
