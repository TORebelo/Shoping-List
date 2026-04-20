"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getAuthClient } from "@/lib/firebase/client";
import { ensureUserDoc } from "@/lib/auth/ensure-user-doc";

type AuthState = {
  user: User | null;
  /** True until either (a) we confirm no user, or (b) user + ensureUserDoc have both settled. */
  loading: boolean;
};

const AuthCtx = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  const ensuredForUid = useRef<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(getAuthClient(), (user) => {
      if (!user) {
        ensuredForUid.current = null;
        setState({ user: null, loading: false });
        return;
      }

      // Expose the user immediately but keep loading=true until we've written
      // their /users/{uid} doc. Downstream writes (createList, joinList) rely
      // on that doc already existing so they can arrayUnion onto listIds.
      setState({ user, loading: true });
      if (ensuredForUid.current === user.uid) {
        setState({ user, loading: false });
        return;
      }
      ensuredForUid.current = user.uid;
      ensureUserDoc({
        uid: user.uid,
        email: user.email ?? "",
        displayName: user.displayName ?? "",
        photoURL: user.photoURL ?? null,
      })
        .catch((err) => {
          console.warn("[AuthProvider] ensureUserDoc failed", err);
        })
        .finally(() => {
          setState({ user, loading: false });
        });
    });
  }, []);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
