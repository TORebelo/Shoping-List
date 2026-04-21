// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPopup: vi.fn(),
  sendSignInLinkToEmail: vi.fn(),
  signInWithEmailLink: vi.fn(),
  isSignInWithEmailLink: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  signInWithPopup: mocks.signInWithPopup,
  sendSignInLinkToEmail: mocks.sendSignInLinkToEmail,
  signInWithEmailLink: mocks.signInWithEmailLink,
  isSignInWithEmailLink: mocks.isSignInWithEmailLink,
  GoogleAuthProvider: mocks.GoogleAuthProvider,
}));

vi.mock("@/lib/firebase/client", () => ({
  getAuthClient: () => ({ __fake: "auth" }),
}));

import {
  PENDING_EMAIL_KEY,
  completeEmailSignIn,
  sendMagicLink,
  signInWithGoogle,
} from "./sign-in";

describe("signInWithGoogle", () => {
  beforeEach(() => {
    mocks.signInWithPopup.mockReset();
    mocks.GoogleAuthProvider.mockReset();
  });

  it("calls signInWithPopup with GoogleAuthProvider", async () => {
    mocks.signInWithPopup.mockResolvedValue({ user: { uid: "u1" } });
    await signInWithGoogle();
    expect(mocks.GoogleAuthProvider).toHaveBeenCalledTimes(1);
    expect(mocks.signInWithPopup).toHaveBeenCalledTimes(1);
  });
});

describe("sendMagicLink", () => {
  beforeEach(() => {
    mocks.sendSignInLinkToEmail.mockReset();
    localStorage.clear();
  });

  it("stores email in localStorage under stable key", async () => {
    mocks.sendSignInLinkToEmail.mockResolvedValue(undefined);
    await sendMagicLink("user@example.com");
    expect(localStorage.getItem(PENDING_EMAIL_KEY)).toBe("user@example.com");
  });

  it("uses origin + /signin/complete as the continue URL", async () => {
    mocks.sendSignInLinkToEmail.mockResolvedValue(undefined);
    await sendMagicLink("user@example.com");
    const [, email, settings] = mocks.sendSignInLinkToEmail.mock.calls[0];
    expect(email).toBe("user@example.com");
    expect(settings.url).toBe(`${window.location.origin}/signin/complete`);
    expect(settings.handleCodeInApp).toBe(true);
  });

  it("forwards an optional redirect path via query string", async () => {
    mocks.sendSignInLinkToEmail.mockResolvedValue(undefined);
    await sendMagicLink("u@example.com", "/join/abc123");
    const [, , settings] = mocks.sendSignInLinkToEmail.mock.calls[0];
    expect(settings.url).toBe(
      `${window.location.origin}/signin/complete?redirect=%2Fjoin%2Fabc123`,
    );
  });

  it("rejects invalid emails without calling Firebase", async () => {
    await expect(sendMagicLink("")).rejects.toThrow();
    await expect(sendMagicLink("not-an-email")).rejects.toThrow();
    expect(mocks.sendSignInLinkToEmail).not.toHaveBeenCalled();
  });
});

describe("completeEmailSignIn", () => {
  beforeEach(() => {
    mocks.isSignInWithEmailLink.mockReset();
    mocks.signInWithEmailLink.mockReset();
    localStorage.clear();
  });

  it("returns kind='not-a-link' when current URL is not a sign-in link", async () => {
    mocks.isSignInWithEmailLink.mockReturnValue(false);
    const result = await completeEmailSignIn();
    expect(result).toEqual({ kind: "not-a-link" });
    expect(mocks.signInWithEmailLink).not.toHaveBeenCalled();
  });

  it("signs in with email from storage and clears it", async () => {
    mocks.isSignInWithEmailLink.mockReturnValue(true);
    mocks.signInWithEmailLink.mockResolvedValue({ user: { uid: "u1" } });
    localStorage.setItem(PENDING_EMAIL_KEY, "u@example.com");
    const result = await completeEmailSignIn();
    expect(mocks.signInWithEmailLink).toHaveBeenCalledWith(
      expect.anything(),
      "u@example.com",
      window.location.href,
    );
    expect(localStorage.getItem(PENDING_EMAIL_KEY)).toBeNull();
    expect(result).toEqual({
      kind: "success",
      credential: { user: { uid: "u1" } },
    });
  });

  it("returns kind='needs-email' when link is valid but storage is empty (cross-device)", async () => {
    mocks.isSignInWithEmailLink.mockReturnValue(true);
    const result = await completeEmailSignIn();
    expect(result).toEqual({ kind: "needs-email" });
    expect(mocks.signInWithEmailLink).not.toHaveBeenCalled();
  });
});
