import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  lastCallback: null as
    | ((snap: {
        docs: { id: string; data: () => unknown }[];
      }) => void)
    | null,
}));

const mocks = vi.hoisted(() => ({
  onSnapshot: vi.fn((_q, cb: (snap: unknown) => void) => {
    state.lastCallback = cb as typeof state.lastCallback;
    return () => {
      state.lastCallback = null;
    };
  }),
  query: vi.fn((...args: unknown[]) => ({ __query: args })),
  where: vi.fn((field: string, op: string, value: unknown) => ({
    __where: { field, op, value },
  })),
  orderBy: vi.fn((field: string, dir?: string) => ({
    __orderBy: { field, dir },
  })),
  collection: vi.fn((_db: unknown, name: string) => ({ __col: name })),
}));

vi.mock("firebase/firestore", () => mocks);
vi.mock("@/lib/firebase/client", () => ({ getDb: () => ({ __fake: "db" }) }));

import { useHouseholds } from "./use-households";

function Probe({ uid }: { uid: string | null }) {
  const { households, loading } = useHouseholds(uid);
  if (loading) return <div data-testid="out">L</div>;
  return (
    <div data-testid="out">
      {households.map((h) => h.id).join(",") || "empty"}
    </div>
  );
}

describe("useHouseholds", () => {
  beforeEach(() => {
    state.lastCallback = null;
    mocks.onSnapshot.mockClear();
    mocks.query.mockClear();
    mocks.where.mockClear();
  });

  it("subscribes with memberIds array-contains filter and orderBy createdAt desc", () => {
    render(<Probe uid="u1" />);
    expect(mocks.where).toHaveBeenCalledWith(
      "memberIds",
      "array-contains",
      "u1",
    );
    expect(mocks.orderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(mocks.onSnapshot).toHaveBeenCalledTimes(1);
  });

  it("transitions loading → empty when snapshot has no docs", () => {
    render(<Probe uid="u1" />);
    expect(screen.getByTestId("out").textContent).toBe("L");
    act(() => state.lastCallback!({ docs: [] }));
    expect(screen.getByTestId("out").textContent).toBe("empty");
  });

  it("returns household documents from snapshot", () => {
    render(<Probe uid="u1" />);
    act(() =>
      state.lastCallback!({
        docs: [
          {
            id: "h1",
            data: () => ({ id: "h1", name: "Casa", memberIds: ["u1"] }),
          },
          {
            id: "h2",
            data: () => ({ id: "h2", name: "Praia", memberIds: ["u1", "u2"] }),
          },
        ],
      }),
    );
    expect(screen.getByTestId("out").textContent).toBe("h1,h2");
  });

  it("does not subscribe when uid is null", () => {
    render(<Probe uid={null} />);
    expect(mocks.onSnapshot).not.toHaveBeenCalled();
    expect(screen.getByTestId("out").textContent).toBe("empty");
  });

  it("unsubscribes on unmount", () => {
    const unsub = vi.fn();
    mocks.onSnapshot.mockImplementationOnce((_q, cb) => {
      state.lastCallback = cb as typeof state.lastCallback;
      return unsub;
    });
    const { unmount } = render(<Probe uid="u1" />);
    unmount();
    expect(unsub).toHaveBeenCalled();
  });
});
