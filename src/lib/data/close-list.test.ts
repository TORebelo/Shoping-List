import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  ops: [] as { op: string; path: string; data?: unknown }[],
  list: null as null | {
    memberIds: string[];
    status: "active" | "closed";
  },
}));

const mocks = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, ...parts: string[]) => ({
    __path: parts.join("/"),
  })),
  serverTimestamp: vi.fn(() => ({ __ts: true })),
  runTransaction: vi.fn(
    async (
      _db: unknown,
      fn: (tx: {
        get: (ref: { __path: string }) => Promise<{
          exists: () => boolean;
          data: () => unknown;
        }>;
        update: (ref: { __path: string }, data: unknown) => void;
      }) => Promise<unknown>,
    ) => {
      const tx = {
        get: async (ref: { __path: string }) => {
          state.ops.push({ op: "get", path: ref.__path });
          if (
            ref.__path.startsWith("lists/") &&
            ref.__path.split("/").length === 2
          ) {
            if (!state.list)
              return { exists: () => false, data: () => undefined };
            return { exists: () => true, data: () => state.list };
          }
          return { exists: () => false, data: () => undefined };
        },
        update: (ref: { __path: string }, data: unknown) => {
          state.ops.push({ op: "update", path: ref.__path, data });
        },
      };
      return fn(tx);
    },
  ),
}));

vi.mock("firebase/firestore", () => mocks);

import { closeList } from "./close-list";

const db = { __fake: "db" } as never;

describe("closeList", () => {
  beforeEach(() => {
    state.ops = [];
    state.list = { memberIds: ["u1"], status: "active" };
  });

  it("marks status=closed and stamps closedAt", async () => {
    await closeList({ db, listId: "l1", actor: { uid: "u1" } });
    const update = state.ops.find(
      (o) => o.op === "update" && o.path === "lists/l1",
    );
    expect(update!.data).toEqual({
      status: "closed",
      closedAt: { __ts: true },
    });
  });

  it("rejects non-member actors", async () => {
    state.list = { memberIds: ["other"], status: "active" };
    await expect(
      closeList({ db, listId: "l1", actor: { uid: "u1" } }),
    ).rejects.toThrow(/membro/i);
  });

  it("rejects closing an already-closed list", async () => {
    state.list = { memberIds: ["u1"], status: "closed" };
    await expect(
      closeList({ db, listId: "l1", actor: { uid: "u1" } }),
    ).rejects.toThrow(/fechada/i);
  });

  it("throws when list missing", async () => {
    state.list = null;
    await expect(
      closeList({ db, listId: "l1", actor: { uid: "u1" } }),
    ).rejects.toThrow();
  });
});
