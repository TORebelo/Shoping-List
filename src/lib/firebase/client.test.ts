import { beforeEach, describe, expect, it, vi } from "vitest";

describe("firebase client", () => {
  beforeEach(() => vi.resetModules());

  it("initializes a single app instance", async () => {
    const { getFirebaseApp } = await import("./client");
    const a = getFirebaseApp();
    const b = getFirebaseApp();
    expect(a).toBe(b);
  });

  it("exports auth and firestore bound to that app", async () => {
    const { getFirebaseApp, getDb, getAuthClient } = await import("./client");
    expect(getDb().app).toBe(getFirebaseApp());
    expect(getAuthClient().app).toBe(getFirebaseApp());
  });
});
