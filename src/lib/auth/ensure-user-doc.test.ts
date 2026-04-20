import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn((_db, collection, id) => ({ __path: `${collection}/${id}` })),
  serverTimestamp: vi.fn(() => ({ __ts: true })),
}));

vi.mock("firebase/firestore", () => ({
  getDoc: mocks.getDoc,
  setDoc: mocks.setDoc,
  updateDoc: mocks.updateDoc,
  doc: mocks.doc,
  serverTimestamp: mocks.serverTimestamp,
}));

vi.mock("@/lib/firebase/client", () => ({
  getDb: () => ({ __fake: "db" }),
}));

import { ensureUserDoc } from "./ensure-user-doc";

const input = {
  uid: "u1",
  email: "a@b.c",
  displayName: "Ana",
  photoURL: "https://img/a.png",
};

describe("ensureUserDoc", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset?.());
    mocks.doc.mockImplementation((_db, collection, id) => ({
      __path: `${collection}/${id}`,
    }));
    mocks.serverTimestamp.mockImplementation(() => ({ __ts: true }));
  });

  it("creates a fresh user doc when none exists", async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => false });
    mocks.setDoc.mockResolvedValue(undefined);

    await ensureUserDoc(input);

    expect(mocks.setDoc).toHaveBeenCalledTimes(1);
    const [ref, data] = mocks.setDoc.mock.calls[0];
    expect(ref.__path).toBe("users/u1");
    expect(data).toMatchObject({
      uid: "u1",
      email: "a@b.c",
      displayName: "Ana",
      photoURL: "https://img/a.png",
      listIds: [],
      plan: "free",
    });
    expect(data.createdAt).toEqual({ __ts: true });
    expect(mocks.updateDoc).not.toHaveBeenCalled();
  });

  it("updates only profile fields when doc already exists", async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => true });
    mocks.updateDoc.mockResolvedValue(undefined);

    await ensureUserDoc(input);

    expect(mocks.setDoc).not.toHaveBeenCalled();
    expect(mocks.updateDoc).toHaveBeenCalledTimes(1);
    const [ref, data] = mocks.updateDoc.mock.calls[0];
    expect(ref.__path).toBe("users/u1");
    expect(data).toEqual({
      email: "a@b.c",
      displayName: "Ana",
      photoURL: "https://img/a.png",
    });
  });

  it("omits photoURL when not provided (Firestore rejects undefined)", async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => false });
    mocks.setDoc.mockResolvedValue(undefined);

    await ensureUserDoc({ ...input, photoURL: null });

    const [, data] = mocks.setDoc.mock.calls[0];
    expect("photoURL" in data).toBe(false);
  });

  it("defaults displayName to email local-part when empty", async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => false });
    mocks.setDoc.mockResolvedValue(undefined);

    await ensureUserDoc({ ...input, displayName: "" });

    const [, data] = mocks.setDoc.mock.calls[0];
    expect(data.displayName).toBe("a");
  });
});
