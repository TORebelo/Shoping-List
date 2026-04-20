import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  ops: [] as {
    op: "set" | "update" | "delete";
    ref: { __path: string };
    data?: unknown;
  }[],
  nextIds: [] as string[],
  commitError: null as Error | null,
}));

const mocks = vi.hoisted(() => {
  const makeRef = (path: string) => ({ __path: path });
  return {
    doc: vi.fn(),
    collection: vi.fn((db: unknown, ...parts: string[]) => makeRef(parts.join("/"))),
    writeBatch: vi.fn(() => ({
      set: vi.fn((ref: { __path: string }, data: unknown) =>
        state.ops.push({ op: "set", ref, data }),
      ),
      update: vi.fn((ref: { __path: string }, data: unknown) =>
        state.ops.push({ op: "update", ref, data }),
      ),
      delete: vi.fn((ref: { __path: string }) =>
        state.ops.push({ op: "delete", ref }),
      ),
      commit: vi.fn(async () => {
        if (state.commitError) throw state.commitError;
      }),
    })),
    increment: vi.fn((n: number) => ({ __increment: n })),
    serverTimestamp: vi.fn(() => ({ __ts: true })),
  };
});

mocks.doc.mockImplementation((...parts: unknown[]) => {
  // doc(collectionRef) — auto-generated id
  if (
    parts.length === 1 &&
    typeof parts[0] === "object" &&
    parts[0] &&
    "__path" in (parts[0] as object)
  ) {
    const id = state.nextIds.shift() ?? "auto";
    const path = `${(parts[0] as { __path: string }).__path}/${id}`;
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

vi.mock("firebase/firestore", () => mocks);

import { addItem, deleteItem, toggleItem } from "./items";

const ctx = {
  db: { __fake: "db" } as never,
  listId: "l1",
  actor: {
    uid: "u1",
    displayName: "Ana",
    color: "#ef4444",
  },
};

describe("addItem", () => {
  beforeEach(() => {
    state.ops = [];
    state.nextIds = ["item-1"];
    state.commitError = null;
  });

  it("writes item doc with denormalized author fields and increments itemCount", async () => {
    const { itemId } = await addItem({
      ...ctx,
      name: "  leite  ",
      quantity: "2L",
    });

    expect(itemId).toBe("item-1");
    const itemSet = state.ops.find(
      (o) => o.op === "set" && o.ref.__path.endsWith("/items/item-1"),
    );
    expect(itemSet).toBeDefined();
    const data = itemSet!.data as Record<string, unknown>;
    expect(data).toMatchObject({
      id: "item-1",
      name: "leite",
      quantity: "2L",
      addedBy: "u1",
      addedByName: "Ana",
      addedByColor: "#ef4444",
      checked: false,
      checkedBy: null,
    });
    expect(data.createdAt).toEqual({ __ts: true });

    const listUpdate = state.ops.find(
      (o) => o.op === "update" && o.ref.__path === "lists/l1",
    );
    expect(listUpdate).toBeDefined();
    expect(listUpdate!.data).toEqual({ itemCount: { __increment: 1 } });
  });

  it("rejects empty name", async () => {
    await expect(
      addItem({ ...ctx, name: "   ", quantity: "" }),
    ).rejects.toThrow();
  });

  it("rejects name > 80 chars", async () => {
    await expect(
      addItem({ ...ctx, name: "a".repeat(81), quantity: "" }),
    ).rejects.toThrow();
  });

  it("rejects quantity > 20 chars", async () => {
    await expect(
      addItem({ ...ctx, name: "ok", quantity: "a".repeat(21) }),
    ).rejects.toThrow();
  });
});

describe("toggleItem", () => {
  beforeEach(() => {
    state.ops = [];
    state.commitError = null;
  });

  it("sets checked=true and checkedBy=actor.uid", async () => {
    await toggleItem({ ...ctx, itemId: "item-1", nextChecked: true });
    const update = state.ops.find(
      (o) =>
        o.op === "update" &&
        o.ref.__path === "lists/l1/items/item-1",
    );
    expect(update).toBeDefined();
    expect(update!.data).toEqual({ checked: true, checkedBy: "u1" });
  });

  it("sets checked=false and checkedBy=null", async () => {
    await toggleItem({ ...ctx, itemId: "item-1", nextChecked: false });
    const update = state.ops.find(
      (o) =>
        o.op === "update" &&
        o.ref.__path === "lists/l1/items/item-1",
    );
    expect(update!.data).toEqual({ checked: false, checkedBy: null });
  });
});

describe("deleteItem", () => {
  beforeEach(() => {
    state.ops = [];
    state.commitError = null;
  });

  it("deletes item and decrements itemCount", async () => {
    await deleteItem({ ...ctx, itemId: "item-1" });
    const del = state.ops.find(
      (o) =>
        o.op === "delete" &&
        o.ref.__path === "lists/l1/items/item-1",
    );
    expect(del).toBeDefined();
    const listUpdate = state.ops.find(
      (o) => o.op === "update" && o.ref.__path === "lists/l1",
    );
    expect(listUpdate!.data).toEqual({ itemCount: { __increment: -1 } });
  });
});
