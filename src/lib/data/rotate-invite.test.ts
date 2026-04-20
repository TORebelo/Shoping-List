import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  ops: [] as { op: string; path: string; data?: unknown }[],
  household: null as null | {
    createdBy: string;
    inviteCode: string;
  },
  failTx: null as Error | null,
  deletedPaths: [] as string[],
}));

const mocks = vi.hoisted(() => ({
  doc: vi.fn((first: unknown, ...rest: unknown[]) => {
    if (first && typeof first === "object" && "__path" in (first as object)) {
      return {
        __path: `${(first as { __path: string }).__path}/${rest.join("/")}`,
      };
    }
    return { __path: rest.join("/") };
  }),
  serverTimestamp: vi.fn(() => ({ __ts: true })),
  deleteDoc: vi.fn(async (ref: { __path: string }) => {
    state.deletedPaths.push(ref.__path);
  }),
  runTransaction: vi.fn(
    async (
      _db: unknown,
      fn: (tx: {
        get: (ref: { __path: string }) => Promise<{
          exists: () => boolean;
          data: () => unknown;
        }>;
        update: (ref: { __path: string }, data: unknown) => void;
        set: (ref: { __path: string }, data: unknown) => void;
      }) => Promise<unknown>,
    ) => {
      if (state.failTx) throw state.failTx;
      const tx = {
        get: async (ref: { __path: string }) => {
          state.ops.push({ op: "get", path: ref.__path });
          if (ref.__path.startsWith("households/") && state.household) {
            return {
              exists: () => true,
              data: () => state.household,
            };
          }
          return { exists: () => false, data: () => undefined };
        },
        update: (ref: { __path: string }, data: unknown) => {
          state.ops.push({ op: "update", path: ref.__path, data });
        },
        set: (ref: { __path: string }, data: unknown) => {
          state.ops.push({ op: "set", path: ref.__path, data });
        },
      };
      return fn(tx);
    },
  ),
}));

vi.mock("firebase/firestore", () => mocks);

import { rotateInviteCode } from "./rotate-invite";

const db = { __fake: "db" } as never;

describe("rotateInviteCode", () => {
  beforeEach(() => {
    state.ops = [];
    state.deletedPaths = [];
    state.failTx = null;
    state.household = {
      createdBy: "owner-uid",
      inviteCode: "old-code",
    };
  });

  it("writes new invite code and removes old mapping (owner)", async () => {
    const code = await rotateInviteCode({
      db,
      householdId: "h1",
      actor: { uid: "owner-uid" },
    });
    expect(code).toMatch(/^[a-z0-9]{6,8}$/);

    const hhUpdate = state.ops.find(
      (o) => o.op === "update" && o.path === "households/h1",
    );
    expect(hhUpdate!.data).toEqual({ inviteCode: code });

    const inviteSet = state.ops.find(
      (o) => o.op === "set" && o.path === `inviteCodes/${code}`,
    );
    expect(inviteSet).toBeDefined();

    expect(state.deletedPaths).toContain("inviteCodes/old-code");
  });

  it("rejects non-owner actors", async () => {
    await expect(
      rotateInviteCode({
        db,
        householdId: "h1",
        actor: { uid: "other" },
      }),
    ).rejects.toThrow(/dono/i);
  });

  it("throws when the household is missing", async () => {
    state.household = null;
    await expect(
      rotateInviteCode({
        db,
        householdId: "h1",
        actor: { uid: "owner-uid" },
      }),
    ).rejects.toThrow();
  });
});
