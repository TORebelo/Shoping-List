import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  ops: [] as { op: string; path: string; data?: unknown }[],
  household: null as null | { activeListId: string; memberIds: string[] },
  activeListExists: true,
  nextListId: "new-list",
  failTx: null as Error | null,
}));

const mocks = vi.hoisted(() => ({
  doc: vi.fn((first: unknown, ...rest: unknown[]) => {
    if (first && typeof first === "object" && "__path" in (first as object)) {
      const base = (first as { __path: string }).__path;
      if (rest.length === 0) {
        return { __path: `${base}/${state.nextListId}`, id: state.nextListId };
      }
      return { __path: `${base}/${rest.join("/")}` };
    }
    return { __path: rest.join("/") };
  }),
  collection: vi.fn((_db: unknown, ...parts: string[]) => ({
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
        set: (ref: { __path: string }, data: unknown) => void;
      }) => Promise<unknown>,
    ) => {
      if (state.failTx) throw state.failTx;
      const tx = {
        get: async (ref: { __path: string }) => {
          state.ops.push({ op: "get", path: ref.__path });
          if (ref.__path.startsWith("households/") && ref.__path.split("/").length === 2) {
            if (!state.household) return { exists: () => false, data: () => undefined };
            return {
              exists: () => true,
              data: () => state.household,
            };
          }
          if (
            ref.__path.includes("/lists/") &&
            !ref.__path.endsWith(`/${state.nextListId}`)
          ) {
            return {
              exists: () => state.activeListExists,
              data: () => ({ id: "l-old", status: "active", title: "old" }),
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

import { closeActiveList } from "./close-list";

const db = { __fake: "db" } as never;

describe("closeActiveList", () => {
  beforeEach(() => {
    state.ops = [];
    state.failTx = null;
    state.activeListExists = true;
    state.nextListId = "new-list";
    state.household = {
      activeListId: "l-old",
      memberIds: ["u1"],
    };
  });

  it("closes old list, creates new active list, updates activeListId", async () => {
    const result = await closeActiveList({
      db,
      householdId: "h1",
      actor: { uid: "u1" },
    });
    expect(result.newListId).toBe("new-list");

    const closeUpdate = state.ops.find(
      (o) => o.op === "update" && o.path === "households/h1/lists/l-old",
    );
    expect(closeUpdate!.data).toMatchObject({
      status: "closed",
      closedAt: { __ts: true },
    });

    const listSet = state.ops.find(
      (o) => o.op === "set" && o.path === "households/h1/lists/new-list",
    );
    expect(listSet!.data).toMatchObject({
      id: "new-list",
      status: "active",
      itemCount: 0,
    });
    expect((listSet!.data as Record<string, unknown>).title).toMatch(
      /^Compras de \d{4}-\d{2}-\d{2}$/,
    );

    const hhUpdate = state.ops.find(
      (o) => o.op === "update" && o.path === "households/h1",
    );
    expect(hhUpdate!.data).toEqual({ activeListId: "new-list" });
  });

  it("rejects non-member actors", async () => {
    state.household = { activeListId: "l-old", memberIds: ["other"] };
    await expect(
      closeActiveList({ db, householdId: "h1", actor: { uid: "u1" } }),
    ).rejects.toThrow(/membro/i);
  });

  it("throws when household missing", async () => {
    state.household = null;
    await expect(
      closeActiveList({ db, householdId: "h1", actor: { uid: "u1" } }),
    ).rejects.toThrow();
  });
});
