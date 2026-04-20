import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  txOps: [] as {
    op: "set" | "update" | "get";
    path: string;
    data?: unknown;
  }[],
  txFail: null as Error | null,
}));

const mocks = vi.hoisted(() => ({
  doc: vi.fn((first: unknown, ...rest: unknown[]) => {
    if (
      first &&
      typeof first === "object" &&
      "__path" in (first as object)
    ) {
      const base = (first as { __path: string }).__path;
      const path = rest.length > 0 ? `${base}/${rest.join("/")}` : base;
      return { __path: path };
    }
    return { __path: rest.join("/") };
  }),
  collection: vi.fn((_db: unknown, ...parts: string[]) => ({
    __path: parts.join("/"),
  })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn((ref: unknown, ...rest: unknown[]) => ({
    __query: { ref, rest },
  })),
  where: vi.fn((f: string, op: string, v: unknown) => ({ __w: [f, op, v] })),
  arrayUnion: vi.fn((...items: unknown[]) => ({ __arrayUnion: items })),
  serverTimestamp: vi.fn(() => ({ __ts: true })),
  runTransaction: vi.fn(),
}));

vi.mock("firebase/firestore", () => mocks);

import { findListByCode, joinList } from "./join";

const db = { __fake: "db" } as never;

describe("findListByCode", () => {
  beforeEach(() => {
    mocks.getDoc.mockReset();
  });

  it("returns the list when invite code exists", async () => {
    mocks.getDoc.mockImplementation(async (ref: { __path: string }) => {
      if (ref.__path === "inviteCodes/abc123") {
        return { exists: () => true, data: () => ({ listId: "l1" }) };
      }
      if (ref.__path === "lists/l1") {
        return {
          exists: () => true,
          data: () => ({ id: "l1", name: "Compras" }),
        };
      }
      return { exists: () => false };
    });
    const result = await findListByCode(db, "abc123");
    expect(result).toMatchObject({ id: "l1", name: "Compras" });
  });

  it("returns null when invite code is unknown", async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => false });
    const result = await findListByCode(db, "nope");
    expect(result).toBeNull();
  });

  it("returns null when invite points to a missing list", async () => {
    mocks.getDoc.mockImplementation(async (ref: { __path: string }) => {
      if (ref.__path === "inviteCodes/x") {
        return { exists: () => true, data: () => ({ listId: "gone" }) };
      }
      return { exists: () => false };
    });
    const result = await findListByCode(db, "x");
    expect(result).toBeNull();
  });
});

function setupTx(reads: Record<string, unknown>) {
  mocks.runTransaction.mockImplementation(
    async (
      _db: unknown,
      fn: (tx: {
        get: (ref: { __path: string }) => Promise<{
          exists: () => boolean;
          data: () => unknown;
        }>;
        set: (ref: { __path: string }, data: unknown) => void;
        update: (ref: { __path: string }, data: unknown) => void;
      }) => Promise<unknown>,
    ) => {
      if (state.txFail) throw state.txFail;
      const tx = {
        get: async (ref: { __path: string }) => {
          state.txOps.push({ op: "get", path: ref.__path });
          const found = reads[ref.__path];
          return {
            exists: () => found !== undefined,
            data: () => found,
          };
        },
        set: (ref: { __path: string }, data: unknown) => {
          state.txOps.push({ op: "set", path: ref.__path, data });
        },
        update: (ref: { __path: string }, data: unknown) => {
          state.txOps.push({ op: "update", path: ref.__path, data });
        },
      };
      return fn(tx);
    },
  );
}

describe("joinList", () => {
  beforeEach(() => {
    state.txOps = [];
    state.txFail = null;
    mocks.runTransaction.mockReset();
  });

  const user = { uid: "u2", displayName: "Beatriz" };

  it("adds member, creates member doc, updates user listIds", async () => {
    setupTx({
      "inviteCodes/abc": { listId: "l1" },
      "lists/l1": { id: "l1", memberIds: ["u1"], name: "Compras" },
    });
    const result = await joinList({ db, code: "abc", user });
    expect(result.listId).toBe("l1");
    expect(result.alreadyMember).toBe(false);

    const listUpdate = state.txOps.find(
      (o) => o.op === "update" && o.path === "lists/l1",
    );
    expect(listUpdate!.data).toMatchObject({
      memberIds: { __arrayUnion: ["u2"] },
    });

    const memberSet = state.txOps.find(
      (o) => o.op === "set" && o.path === "lists/l1/members/u2",
    );
    expect(memberSet).toBeDefined();
    expect(memberSet!.data).toMatchObject({
      uid: "u2",
      displayName: "Beatriz",
      role: "member",
    });

    const userUpdate = state.txOps.find(
      (o) => o.op === "update" && o.path === "users/u2",
    );
    expect(userUpdate!.data).toMatchObject({
      listIds: { __arrayUnion: ["l1"] },
    });
  });

  it("is idempotent when the user already is a member", async () => {
    setupTx({
      "inviteCodes/abc": { listId: "l1" },
      "lists/l1": { id: "l1", memberIds: ["u1", "u2"], name: "Compras" },
    });
    const result = await joinList({ db, code: "abc", user });
    expect(result.listId).toBe("l1");
    expect(result.alreadyMember).toBe(true);

    const writes = state.txOps.filter((o) => o.op !== "get");
    expect(writes).toEqual([]);
  });

  it("throws when invite code does not exist", async () => {
    setupTx({});
    await expect(
      joinList({ db, code: "nope", user }),
    ).rejects.toThrow(/código/i);
  });

  it("throws when invite points to a missing list", async () => {
    setupTx({ "inviteCodes/x": { listId: "gone" } });
    await expect(joinList({ db, code: "x", user })).rejects.toThrow();
  });
});
