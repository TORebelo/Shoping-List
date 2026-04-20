import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  ops: [] as { op: string; path: string; data?: unknown }[],
  list: null as null | {
    id: string;
    createdBy: string;
    memberIds: string[];
    inviteCode: string;
  },
  members: {} as Record<string, { uid: string; role: "owner" | "member" }>,
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
  collection: vi.fn((_db: unknown, ...parts: string[]) => ({
    __path: parts.join("/"),
  })),
  arrayRemove: vi.fn((...items: unknown[]) => ({ __arrayRemove: items })),
  getDocs: vi.fn(async () => ({ docs: [], empty: true })),
  query: vi.fn((ref: unknown) => ref),
  where: vi.fn((f: string, op: string, v: unknown) => ({ __w: [f, op, v] })),
  runTransaction: vi.fn(
    async (
      _db: unknown,
      fn: (tx: {
        get: (ref: { __path: string }) => Promise<{
          exists: () => boolean;
          data: () => unknown;
        }>;
        update: (ref: { __path: string }, data: unknown) => void;
        delete: (ref: { __path: string }) => void;
      }) => Promise<unknown>,
    ) => {
      const tx = {
        get: async (ref: { __path: string }) => {
          state.ops.push({ op: "get", path: ref.__path });
          if (
            ref.__path.startsWith("lists/") &&
            ref.__path.split("/").length === 2
          ) {
            if (!state.list) {
              return { exists: () => false, data: () => undefined };
            }
            return {
              exists: () => true,
              data: () => state.list,
            };
          }
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
          return { exists: () => false, data: () => undefined };
        },
        update: (ref: { __path: string }, data: unknown) => {
          state.ops.push({ op: "update", path: ref.__path, data });
        },
        delete: (ref: { __path: string }) => {
          state.ops.push({ op: "delete", path: ref.__path });
        },
      };
      return fn(tx);
    },
  ),
  writeBatch: vi.fn(() => ({
    delete: vi.fn((ref: { __path: string }) => {
      state.ops.push({ op: "delete", path: ref.__path });
    }),
    commit: vi.fn(async () => {}),
  })),
}));

vi.mock("firebase/firestore", () => mocks);

import { deleteList, leaveList, removeMember } from "./admin";

const db = { __fake: "db" } as never;

describe("leaveList", () => {
  beforeEach(() => {
    state.ops = [];
    state.list = {
      id: "l1",
      createdBy: "owner",
      memberIds: ["owner", "member2"],
      inviteCode: "abc",
    };
    state.members = {
      owner: { uid: "owner", role: "owner" },
      member2: { uid: "member2", role: "member" },
    };
  });

  it("removes member from list + user doc and deletes member doc", async () => {
    await leaveList({ db, listId: "l1", uid: "member2" });
    const listUpdate = state.ops.find(
      (o) => o.op === "update" && o.path === "lists/l1",
    );
    expect(listUpdate!.data).toEqual({
      memberIds: { __arrayRemove: ["member2"] },
    });
    expect(
      state.ops.find(
        (o) => o.op === "delete" && o.path === "lists/l1/members/member2",
      ),
    ).toBeDefined();
    expect(
      state.ops.find((o) => o.op === "update" && o.path === "users/member2")!
        .data,
    ).toEqual({ listIds: { __arrayRemove: ["l1"] } });
  });

  it("refuses to leave when user is the only owner and members remain", async () => {
    await expect(
      leaveList({ db, listId: "l1", uid: "owner" }),
    ).rejects.toThrow(/ownership|dono/i);
  });

  it("allows last member to leave and deletes the list", async () => {
    state.list = {
      id: "l1",
      createdBy: "owner",
      memberIds: ["owner"],
      inviteCode: "abc",
    };
    state.members = { owner: { uid: "owner", role: "owner" } };
    await leaveList({ db, listId: "l1", uid: "owner" });
    expect(
      state.ops.find((o) => o.op === "delete" && o.path === "lists/l1"),
    ).toBeDefined();
    expect(
      state.ops.find(
        (o) => o.op === "delete" && o.path === "inviteCodes/abc",
      ),
    ).toBeDefined();
  });
});

describe("removeMember", () => {
  beforeEach(() => {
    state.ops = [];
    state.list = {
      id: "l1",
      createdBy: "owner",
      memberIds: ["owner", "member2"],
      inviteCode: "abc",
    };
    state.members = {
      owner: { uid: "owner", role: "owner" },
      member2: { uid: "member2", role: "member" },
    };
  });

  it("owner can remove another member", async () => {
    await removeMember({
      db,
      listId: "l1",
      uidToRemove: "member2",
      actor: { uid: "owner" },
    });
    expect(
      state.ops.find(
        (o) => o.op === "delete" && o.path === "lists/l1/members/member2",
      ),
    ).toBeDefined();
  });

  it("non-owner cannot remove members", async () => {
    await expect(
      removeMember({
        db,
        listId: "l1",
        uidToRemove: "owner",
        actor: { uid: "member2" },
      }),
    ).rejects.toThrow(/dono/i);
  });

  it("owner cannot remove themselves via removeMember", async () => {
    await expect(
      removeMember({
        db,
        listId: "l1",
        uidToRemove: "owner",
        actor: { uid: "owner" },
      }),
    ).rejects.toThrow();
  });
});

describe("deleteList", () => {
  beforeEach(() => {
    state.ops = [];
    state.list = {
      id: "l1",
      createdBy: "owner",
      memberIds: ["owner"],
      inviteCode: "abc",
    };
    state.members = {
      owner: { uid: "owner", role: "owner" },
    };
  });

  it("only owner can delete, removes list + invite mapping", async () => {
    await deleteList({
      db,
      listId: "l1",
      actor: { uid: "owner" },
    });
    expect(
      state.ops.find((o) => o.op === "delete" && o.path === "lists/l1"),
    ).toBeDefined();
    expect(
      state.ops.find(
        (o) => o.op === "delete" && o.path === "inviteCodes/abc",
      ),
    ).toBeDefined();
  });

  it("non-owner cannot delete", async () => {
    await expect(
      deleteList({
        db,
        listId: "l1",
        actor: { uid: "someone-else" },
      }),
    ).rejects.toThrow(/dono/i);
  });
});
