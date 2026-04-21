// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { NoteDoc } from "@/lib/domain/types";
import { NotesPanel } from "./notes-panel";

vi.mock("@/lib/firebase/client", () => ({
  getDb: () => ({ __fake: "db" }),
}));

vi.mock("@/lib/data/notes", () => ({
  addNote: vi.fn(),
  deleteNote: vi.fn(),
}));

const actor = { uid: "u1", displayName: "Ana", color: "#3b82f6" };

function makeNote(id: string, text: string, by = "u2"): NoteDoc {
  return {
    id,
    text,
    addedBy: by,
    addedByName: by === "u1" ? "Ana" : "Bruno",
    addedByColor: by === "u1" ? "#3b82f6" : "#ef4444",
    // `createdAt` is a Firestore Timestamp at runtime — the component never
    // reads it, so the cast is safe for tests.
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as NoteDoc["createdAt"],
  };
}

describe("NotesPanel — collapsible strip", () => {
  it("returns null when read-only and there are zero notes", () => {
    const { container } = render(
      <NotesPanel listId="l1" notes={[]} actor={actor} readOnly />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a collapsed strip by default showing the count when notes exist", () => {
    const notes = [makeNote("n1", "Comprar bio"), makeNote("n2", "Sem glúten")];
    render(
      <NotesPanel
        listId="l1"
        notes={notes}
        actor={actor}
        readOnly={false}
      />,
    );

    const toggle = screen.getByRole("button", { name: /2 notas/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    // Notes are not rendered in the DOM while collapsed
    expect(screen.queryByText("Comprar bio")).not.toBeInTheDocument();
    expect(screen.queryByText("Sem glúten")).not.toBeInTheDocument();
    // Form input also hidden when collapsed
    expect(screen.queryByLabelText("Nova nota")).not.toBeInTheDocument();
  });

  it("singular label for a single note", () => {
    render(
      <NotesPanel
        listId="l1"
        notes={[makeNote("n1", "Só uma")]}
        actor={actor}
        readOnly={false}
      />,
    );
    expect(
      screen.getByRole("button", { name: /^1 nota/i }),
    ).toBeInTheDocument();
  });

  it("expands to reveal all notes and the add-form after click", async () => {
    const user = userEvent.setup();
    const notes = [makeNote("n1", "Uma"), makeNote("n2", "Duas")];
    render(
      <NotesPanel
        listId="l1"
        notes={notes}
        actor={actor}
        readOnly={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: /2 notas/i }));

    expect(
      screen.getByRole("button", { name: /2 notas/i }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Uma")).toBeInTheDocument();
    expect(screen.getByText("Duas")).toBeInTheDocument();
    expect(screen.getByLabelText("Nova nota")).toBeInTheDocument();
  });

  it("when editable and zero notes, shows an add-note strip and still expands to a form", async () => {
    const user = userEvent.setup();
    render(
      <NotesPanel listId="l1" notes={[]} actor={actor} readOnly={false} />,
    );

    const toggle = screen.getByRole("button", { name: /adicionar nota/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Nova nota")).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByLabelText("Nova nota")).toBeInTheDocument();
  });

  it("when read-only and notes exist, expanding shows notes but no form", async () => {
    const user = userEvent.setup();
    render(
      <NotesPanel
        listId="l1"
        notes={[makeNote("n1", "Read-only note")]}
        actor={actor}
        readOnly
      />,
    );
    await user.click(screen.getByRole("button", { name: /1 nota/i }));
    expect(screen.getByText("Read-only note")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nova nota")).not.toBeInTheDocument();
  });

  it("collapses again when the toggle is clicked a second time", async () => {
    const user = userEvent.setup();
    render(
      <NotesPanel
        listId="l1"
        notes={[makeNote("n1", "Dupla")]}
        actor={actor}
        readOnly={false}
      />,
    );
    const toggle = screen.getByRole("button", { name: /1 nota/i });
    await user.click(toggle);
    expect(screen.getByText("Dupla")).toBeInTheDocument();
    await user.click(toggle);
    expect(screen.queryByText("Dupla")).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
