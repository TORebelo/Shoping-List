import { beforeEach, describe, expect, it, vi } from "vitest";

type BatchOp = { op: "set" | "update"; ref: { __path: string }; data: unknown };

const state = vi.hoisted(() => ({
  ops: [] as BatchOp[],
  nextIds: [] as string[],
  commitError: null as Error | null,
}));

const mocks = vi.hoisted(() => {
  const makeRef = (path: string) => ({ __path: path });
  const pathOf = (parts: unknown[]): string =>
    parts
      .map((p) => (typeof p === "object" && p && "__path" in p ? (p as { __path: string }).__path : String(p)))
      .join("/");

  return {
    makeRef,
    pathOf,
    doc: vi.fn((...parts: unknown[]) => {
      if (parts.length === 2 && typeof parts[1] === "object") {
        return makeRef(
          `${(parts[1] as { __path: string }).__path}/__auto`,
        );
      }
      return makeRef(pathOf(parts.slice(1)));
    }),
    collection: vi.fn((...parts: unknown[]) => makeRef(pathOf(parts.slice(1)))),
    writeBatch: vi.fn(() => ({
      set: vi.fn((ref: { __path: string }, data: unknown) => {
        state.ops.push({ op: "set", ref, data });
      }),
      update: vi.fn((ref: { __path: string }, data: unknown) => {
        state.ops.push({ op: "update", ref, data });
      }),
      commit: vi.fn(async () => {
        if (state.commitError) throw state.commitError;
      }),
    })),
    arrayUnion: vi.fn((...items: unknown[]) => ({ __arrayUnion: items })),
    serverTimestamp: vi.fn(() => ({ __ts: true })),
  };
});

// Replace `doc()` behaviour so when called with a collection ref and no id,
// it pulls the next id from the test-controlled queue.
mocks.doc.mockImplementation((...parts: unknown[]) => {
  if (
    parts.length === 2 &&
    typeof parts[1] === "object" &&
    parts[1] &&
    "__path" in (parts[1] as object)
  ) {
    const id = state.nextIds.shift() ?? "auto";
    const path = `${(parts[1] as { __path: string }).__path}/${id}`;
    return { __path: path, id };
  }
  const path = parts
    .slice(1)
    .map((p) =>
      typeof p === "object" && p && "__path" in p
        ? (p as { __path: string }).__path
        : String(p),
    )
    .join("/");
  return { __path: path, id: parts[parts.length - 1] };
});

vi.mock("firebase/firestore", () => ({
  doc: mocks.doc,
  collection: mocks.collection,
  writeBatch: mocks.writeBatch,
  arrayUnion: mocks.arrayUnion,
  serverTimestamp: mocks.serverTimestamp,
}));

import { createHousehold } from "./households";
import { COLOR_POOL } from "@/lib/domain/types";

const db = { __fake: "db" };
const owner = { uid: "owner-uid", displayName: "Ana" };

describe("createHousehold", () => {
  beforeEach(() => {
    state.ops = [];
    state.nextIds = ["hhid-1", "listid-1", "invite-1"];
    state.commitError = null;
  });

  it("writes household, member, list, user update atomically", async () => {
    const result = await createHousehold({
      db: db as never,
      owner,
      name: "  Casa Silva  ",
    });

    expect(result.householdId).toBe("hhid-1");
    expect(result.listId).toBe("listid-1");
    expect(result.inviteCode).toMatch(/^[a-z0-9]{6,8}$/);

    const pathsInOrder = state.ops.map((o) => `${o.op} ${o.ref.__path}`);
    expect(pathsInOrder).toContain("set households/hhid-1");
    expect(pathsInOrder).toContain("set households/hhid-1/members/owner-uid");
    expect(pathsInOrder).toContain("set households/hhid-1/lists/listid-1");
    expect(pathsInOrder).toContain("update users/owner-uid");
    expect(pathsInOrder).toContain("set inviteCodes/" + result.inviteCode);

    const hhDoc = state.ops.find(
      (o) => o.ref.__path === "households/hhid-1",
    )?.data as Record<string, unknown>;
    expect(hhDoc.name).toBe("Casa Silva");
    expect(hhDoc.memberIds).toEqual(["owner-uid"]);
    expect(hhDoc.createdBy).toBe("owner-uid");
    expect(hhDoc.activeListId).toBe("listid-1");
    expect(hhDoc.inviteCode).toBe(result.inviteCode);

    const memberDoc = state.ops.find(
      (o) => o.ref.__path === "households/hhid-1/members/owner-uid",
    )?.data as Record<string, unknown>;
    expect(memberDoc.role).toBe("owner");
    expect(memberDoc.color).toBe(COLOR_POOL[0]);
    expect(memberDoc.uid).toBe("owner-uid");
    expect(memberDoc.displayName).toBe("Ana");

    const listDoc = state.ops.find(
      (o) => o.ref.__path === "households/hhid-1/lists/listid-1",
    )?.data as Record<string, unknown>;
    expect(listDoc.status).toBe("active");
    expect(listDoc.title).toMatch(/^Compras de \d{4}-\d{2}-\d{2}$/);

    const userUpdate = state.ops.find(
      (o) => o.ref.__path === "users/owner-uid",
    )?.data as Record<string, unknown>;
    expect(userUpdate.householdIds).toMatchObject({
      __arrayUnion: ["hhid-1"],
    });

    const inviteDoc = state.ops.find(
      (o) => o.ref.__path === `inviteCodes/${result.inviteCode}`,
    )?.data as Record<string, unknown>;
    expect(inviteDoc.householdId).toBe("hhid-1");
  });

  it("rejects empty names", async () => {
    await expect(
      createHousehold({ db: db as never, owner, name: "   " }),
    ).rejects.toThrow();
  });

  it("rejects names > 60 chars", async () => {
    await expect(
      createHousehold({ db: db as never, owner, name: "a".repeat(61) }),
    ).rejects.toThrow();
  });

  it("surfaces commit failure to caller", async () => {
    state.commitError = new Error("permission-denied");
    await expect(
      createHousehold({ db: db as never, owner, name: "Casa" }),
    ).rejects.toThrow("permission-denied");
  });
});
