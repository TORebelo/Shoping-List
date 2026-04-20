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

type AuthState = { user: User | null; loading: boolean };

const AuthCtx = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  const ensuredForUid = useRef<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(getAuthClient(), (user) => {
      setState({ user, loading: false });
      if (user && ensuredForUid.current !== user.uid) {
        ensuredForUid.current = user.uid;
        void ensureUserDoc({
          uid: user.uid,
          email: user.email ?? "",
          displayName: user.displayName ?? "",
          photoURL: user.photoURL ?? null,
        });
      } else if (!user) {
        ensuredForUid.current = null;
      }
    });
  }, []);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
