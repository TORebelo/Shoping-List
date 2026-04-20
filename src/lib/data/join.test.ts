import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  inviteDoc: null as null | { householdId: string },
  householdDoc: null as null | {
    id: string;
    memberIds: string[];
    name: string;
  },
  memberDocs: [] as { uid: string; color: string }[],
  userHouseholdIds: [] as string[],
  txOps: [] as {
    op: "set" | "update" | "get";
    path: string;
    data?: unknown;
  }[],
  txFail: null as Error | null,
}));

const mocks = vi.hoisted(() => ({
  doc: vi.fn((first: unknown, ...rest: unknown[]) => {
    // doc(collectionRef, id) — first arg is a collection ref with __path
    if (
      first &&
      typeof first === "object" &&
      "__path" in (first as object)
    ) {
      const base = (first as { __path: string }).__path;
      const path = rest.length > 0 ? `${base}/${rest.join("/")}` : base;
      return { __path: path };
    }
    // doc(db, ...parts)
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

import { findHouseholdByCode, joinHousehold } from "./join";

const db = { __fake: "db" } as never;

describe("findHouseholdByCode", () => {
  beforeEach(() => {
    mocks.getDoc.mockReset();
  });

  it("returns the household when invite code exists", async () => {
    mocks.getDoc.mockImplementation(async (ref: { __path: string }) => {
      if (ref.__path === "inviteCodes/abc123") {
        return { exists: () => true, data: () => ({ householdId: "h1" }) };
      }
      if (ref.__path === "households/h1") {
        return {
          exists: () => true,
          data: () => ({ id: "h1", name: "Casa" }),
        };
      }
      return { exists: () => false };
    });
    const result = await findHouseholdByCode(db, "abc123");
    expect(result).toMatchObject({ id: "h1", name: "Casa" });
  });

  it("returns null when invite code is unknown", async () => {
    mocks.getDoc.mockResolvedValue({ exists: () => false });
    const result = await findHouseholdByCode(db, "nope");
    expect(result).toBeNull();
  });

  it("returns null when invite points to a missing household", async () => {
    mocks.getDoc.mockImplementation(async (ref: { __path: string }) => {
      if (ref.__path === "inviteCodes/x") {
        return { exists: () => true, data: () => ({ householdId: "gone" }) };
      }
      return { exists: () => false };
    });
    const result = await findHouseholdByCode(db, "x");
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

describe("joinHousehold", () => {
  beforeEach(() => {
    state.txOps = [];
    state.txFail = null;
    mocks.runTransaction.mockReset();
  });

  const user = { uid: "u2", displayName: "Beatriz" };

  it("adds member, creates member doc, updates user householdIds", async () => {
    setupTx({
      "inviteCodes/abc": { householdId: "h1" },
      "households/h1": { id: "h1", memberIds: ["u1"], name: "Casa" },
    });
    const result = await joinHousehold({ db, code: "abc", user });
    expect(result.householdId).toBe("h1");
    expect(result.alreadyMember).toBe(false);

    const hhUpdate = state.txOps.find(
      (o) => o.op === "update" && o.path === "households/h1",
    );
    expect(hhUpdate!.data).toMatchObject({
      memberIds: { __arrayUnion: ["u2"] },
    });

    const memberSet = state.txOps.find(
      (o) => o.op === "set" && o.path === "households/h1/members/u2",
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
      householdIds: { __arrayUnion: ["h1"] },
    });
  });

  it("is idempotent when the user already is a member", async () => {
    setupTx({
      "inviteCodes/abc": { householdId: "h1" },
      "households/h1": { id: "h1", memberIds: ["u1", "u2"], name: "Casa" },
    });
    const result = await joinHousehold({ db, code: "abc", user });
    expect(result.householdId).toBe("h1");
    expect(result.alreadyMember).toBe(true);

    const writes = state.txOps.filter((o) => o.op !== "get");
    expect(writes).toEqual([]);
  });

  it("throws when invite code does not exist", async () => {
    setupTx({});
    await expect(
      joinHousehold({ db, code: "nope", user }),
    ).rejects.toThrow(/código/i);
  });

  it("throws when invite points to a missing household", async () => {
    setupTx({ "inviteCodes/x": { householdId: "gone" } });
    await expect(joinHousehold({ db, code: "x", user })).rejects.toThrow();
  });
});
