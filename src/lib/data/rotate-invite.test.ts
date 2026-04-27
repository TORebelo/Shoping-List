import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  ops: [] as { op: string; path: string; data?: unknown }[],
  list: null as null | {
    createdBy: string;
    inviteCode: string;
  },
  members: {} as Record<string, { uid: string; role: "owner" | "member" }>,
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
          const memberMatch = ref.__path.match(
            /^lists\/[^/]+\/members\/(.+)$/,
          );
          if (memberMatch) {
            const m = state.members[memberMatch[1]];
            return {
              exists: () => Boolean(m),
              data: () => m,
            };
          }
          if (ref.__path.startsWith("lists/") && state.list) {
            return {
              exists: () => true,
              data: () => state.list,
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
    state.list = {
      createdBy: "owner-uid",
      inviteCode: "old-code",
    };
    state.members = {
      "owner-uid": { uid: "owner-uid", role: "owner" },
    };
  });

  it("writes new invite code and removes old mapping (owner)", async () => {
    const code = await rotateInviteCode({
      db,
      listId: "l1",
      actor: { uid: "owner-uid" },
    });
    expect(code).toMatch(/^[a-z0-9]{6,8}$/);

    const listUpdate = state.ops.find(
      (o) => o.op === "update" && o.path === "lists/l1",
    );
    expect(listUpdate!.data).toEqual({ inviteCode: code });

    const inviteSet = state.ops.find(
      (o) => o.op === "set" && o.path === `inviteCodes/${code}`,
    );
    expect(inviteSet).toBeDefined();

    expect(state.deletedPaths).toContain("inviteCodes/old-code");
  });

  it("rejects non-owner actors", async () => {
    state.members.other = { uid: "other", role: "member" };
    await expect(
      rotateInviteCode({
        db,
        listId: "l1",
        actor: { uid: "other" },
      }),
    ).rejects.toThrow(/administrador/i);
  });

  it("throws when the list is missing", async () => {
    state.list = null;
    await expect(
      rotateInviteCode({
        db,
        listId: "l1",
        actor: { uid: "owner-uid" },
      }),
    ).rejects.toThrow();
  });
});
