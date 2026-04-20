import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  docCbs: new Map<
    string,
    (snap: { exists: () => boolean; data: () => unknown }) => void
  >(),
  collCbs: new Map<
    string,
    (snap: { docs: { id: string; data: () => unknown }[] }) => void
  >(),
  collQueryCbs: new Map<
    string,
    (snap: { docs: { id: string; data: () => unknown }[] }) => void
  >(),
}));

const mocks = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, ...parts: string[]) => ({
    __docPath: parts.join("/"),
  })),
  collection: vi.fn((_db: unknown, ...parts: string[]) => ({
    __collPath: parts.join("/"),
  })),
  query: vi.fn((ref: unknown, ...rest: unknown[]) => ({
    __query: { ref, rest },
  })),
  where: vi.fn((f: string, op: string, v: unknown) => ({ __where: [f, op, v] })),
  orderBy: vi.fn((f: string, dir?: string) => ({ __order: [f, dir] })),
  onSnapshot: vi.fn((refOrQuery: unknown, cb: unknown) => {
    // Doc subscription
    if (
      refOrQuery &&
      typeof refOrQuery === "object" &&
      "__docPath" in refOrQuery
    ) {
      state.docCbs.set(
        (refOrQuery as { __docPath: string }).__docPath,
        cb as (snap: { exists: () => boolean; data: () => unknown }) => void,
      );
      return () =>
        state.docCbs.delete(
          (refOrQuery as { __docPath: string }).__docPath,
        );
    }
    // Query subscription — check for active list query
    if (
      refOrQuery &&
      typeof refOrQuery === "object" &&
      "__query" in refOrQuery
    ) {
      const queryObj = refOrQuery as {
        __query: { ref: { __collPath: string }; rest: unknown[] };
      };
      state.collQueryCbs.set(
        queryObj.__query.ref.__collPath,
        cb as (snap: { docs: { id: string; data: () => unknown }[] }) => void,
      );
      return () => state.collQueryCbs.delete(queryObj.__query.ref.__collPath);
    }
    return () => {};
  }),
}));

vi.mock("firebase/firestore", () => mocks);
vi.mock("@/lib/firebase/client", () => ({ getDb: () => ({ __fake: "db" }) }));

import { useActiveList } from "./use-active-list";

function Probe({ householdId }: { householdId: string | null }) {
  const { list, items, loading } = useActiveList(householdId);
  return (
    <div>
      <div data-testid="loading">{loading ? "L" : "R"}</div>
      <div data-testid="list">{list ? `${list.id}:${list.title}` : "none"}</div>
      <div data-testid="items">
        {items.map((i) => `${i.id}=${i.name}`).join(",")}
      </div>
    </div>
  );
}

describe("useActiveList", () => {
  beforeEach(() => {
    state.docCbs.clear();
    state.collCbs.clear();
    state.collQueryCbs.clear();
    vi.clearAllMocks();
  });

  it("starts loading when householdId provided", () => {
    render(<Probe householdId="h1" />);
    expect(screen.getByTestId("loading").textContent).toBe("L");
  });

  it("returns list and items after both snapshots arrive", () => {
    render(<Probe householdId="h1" />);
    const listsCb = state.collQueryCbs.get("households/h1/lists");
    expect(listsCb).toBeDefined();
    act(() =>
      listsCb!({
        docs: [
          {
            id: "l1",
            data: () => ({
              id: "l1",
              title: "Compras",
              status: "active",
            }),
          },
        ],
      }),
    );
    const itemsCb = state.collQueryCbs.get("households/h1/lists/l1/items");
    expect(itemsCb).toBeDefined();
    act(() =>
      itemsCb!({
        docs: [
          { id: "i1", data: () => ({ id: "i1", name: "leite" }) },
          { id: "i2", data: () => ({ id: "i2", name: "pão" }) },
        ],
      }),
    );
    expect(screen.getByTestId("loading").textContent).toBe("R");
    expect(screen.getByTestId("list").textContent).toBe("l1:Compras");
    expect(screen.getByTestId("items").textContent).toBe("i1=leite,i2=pão");
  });

  it("no-ops when householdId is null", () => {
    render(<Probe householdId={null} />);
    expect(screen.getByTestId("loading").textContent).toBe("R");
    expect(mocks.onSnapshot).not.toHaveBeenCalled();
  });

  it("unsubscribes when unmounted", () => {
    const { unmount } = render(<Probe householdId="h1" />);
    const listsCb = state.collQueryCbs.get("households/h1/lists");
    act(() =>
      listsCb!({
        docs: [
          { id: "l1", data: () => ({ id: "l1", title: "t", status: "active" }) },
        ],
      }),
    );
    expect(state.collQueryCbs.size).toBeGreaterThan(0);
    unmount();
    expect(state.collQueryCbs.size).toBe(0);
  });
});
