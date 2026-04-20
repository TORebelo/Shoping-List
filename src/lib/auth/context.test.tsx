import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("firebase/auth", () => {
  let cb: ((u: unknown) => void) | null = null;
  return {
    onAuthStateChanged: (_a: unknown, c: (u: unknown) => void) => {
      cb = c;
      return () => {
        cb = null;
      };
    },
    __emit: (u: unknown) => cb?.(u),
  };
});

vi.mock("@/lib/firebase/client", () => ({ getAuthClient: () => ({}) }));

vi.mock("@/lib/auth/ensure-user-doc", () => ({
  ensureUserDoc: vi.fn().mockResolvedValue(undefined),
}));

import { AuthProvider, useAuth } from "./context";

function Probe() {
  const { user, loading } = useAuth();
  return (
    <div data-testid="out">{loading ? "L" : user ? user.uid : "anon"}</div>
  );
}

type FirebaseAuthMock = { __emit: (u: unknown) => void };

describe("AuthProvider", () => {
  it("starts in loading state", () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe("L");
  });

  it("transitions loading → user when auth emits a user", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    const { __emit } = (await import(
      "firebase/auth"
    )) as unknown as FirebaseAuthMock;
    act(() =>
      __emit({
        uid: "u1",
        email: "a@b.c",
        displayName: "A",
        photoURL: null,
      }),
    );
    expect(screen.getByTestId("out").textContent).toBe("u1");
  });

  it("transitions loading → anon when auth emits null", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    const { __emit } = (await import(
      "firebase/auth"
    )) as unknown as FirebaseAuthMock;
    act(() => __emit(null));
    expect(screen.getByTestId("out").textContent).toBe("anon");
  });
});
