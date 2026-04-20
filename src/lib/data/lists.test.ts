import { beforeEach, describe, expect, it, vi } from "vitest";

type BatchOp = { op: "set" | "update"; ref: { __path: string }; data: unknown };

const state = vi.hoisted(() => ({
  ops: [] as BatchOp[],
  nextIds: [] as string[],
  commitError: null as Error | null,
}));

const mocks = vi.hoisted(() => ({
  doc: vi.fn(),
  collection: vi.fn((_db: unknown, ...parts: string[]) => ({
    __path: parts.join("/"),
  })),
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
}));

mocks.doc.mockImplementation((...parts: unknown[]) => {
  if (
    parts.length === 1 &&
    typeof parts[0] === "object" &&
    parts[0] &&
    "__path" in (parts[0] as object)
  ) {
    const id = state.nextIds.shift() ?? "auto";
    return { __path: `${(parts[0] as { __path: string }).__path}/${id}`, id };
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

import { createList } from "./lists";
import { COLOR_POOL } from "@/lib/domain/types";

const db = { __fake: "db" };
const owner = { uid: "owner-uid", displayName: "Ana" };

describe("createList", () => {
  beforeEach(() => {
    state.ops = [];
    state.nextIds = ["list-1"];
    state.commitError = null;
  });

  it("writes list doc, owner member, invite mapping, user update atomically", async () => {
    const result = await createList({
      db: db as never,
      owner,
      name: "  Compras  ",
    });

    expect(result.listId).toBe("list-1");
    expect(result.inviteCode).toMatch(/^[a-z0-9]{6,8}$/);

    const byPath = (op: string, path: string) =>
      state.ops.find((o) => o.op === op && o.ref.__path === path);

    const list = byPath("set", "lists/list-1")?.data as Record<string, unknown>;
    expect(list).toMatchObject({
      id: "list-1",
      name: "Compras",
      createdBy: "owner-uid",
      memberIds: ["owner-uid"],
      status: "active",
      itemCount: 0,
      inviteCode: result.inviteCode,
    });

    const member = byPath("set", "lists/list-1/members/owner-uid")
      ?.data as Record<string, unknown>;
    expect(member).toMatchObject({
      uid: "owner-uid",
      displayName: "Ana",
      color: COLOR_POOL[0],
      role: "owner",
    });

    const invite = byPath("set", `inviteCodes/${result.inviteCode}`)
      ?.data as Record<string, unknown>;
    expect(invite).toMatchObject({
      code: result.inviteCode,
      listId: "list-1",
    });

    const userUpdate = byPath("update", "users/owner-uid")?.data as Record<
      string,
      unknown
    >;
    expect(userUpdate).toEqual({
      listIds: { __arrayUnion: ["list-1"] },
    });
  });

  it("rejects empty names", async () => {
    await expect(
      createList({ db: db as never, owner, name: "   " }),
    ).rejects.toThrow();
  });

  it("rejects names > 60 chars", async () => {
    await expect(
      createList({ db: db as never, owner, name: "a".repeat(61) }),
    ).rejects.toThrow();
  });

  it("surfaces commit failure to caller", async () => {
    state.commitError = new Error("permission-denied");
    await expect(
      createList({ db: db as never, owner, name: "Compras" }),
    ).rejects.toThrow("permission-denied");
  });
});
