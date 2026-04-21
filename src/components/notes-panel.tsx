"use client";

import { StickyNoteIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addNote, deleteNote } from "@/lib/data/notes";
import { getDb } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";
import type { NoteDoc } from "@/lib/domain/types";

type Actor = { uid: string; displayName: string; color: string };

export function NotesPanel({
  listId,
  notes,
  actor,
  readOnly,
}: {
  listId: string;
  notes: NoteDoc[];
  actor: Actor;
  readOnly: boolean;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await addNote({ db: getDb(), listId, actor, text });
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  async function onRemove(noteId: string) {
    try {
      await deleteNote({ db: getDb(), listId, noteId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  if (notes.length === 0 && readOnly) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-widest uppercase">
        <StickyNoteIcon className="size-3" /> Notas
      </h2>
      {notes.length === 0 ? null : (
        <div className="grid gap-2 sm:grid-cols-2">
          {notes.map((n) => {
            const mine = n.addedBy === actor.uid;
            return (
              <div
                key={n.id}
                className={cn(
                  "group relative flex items-start gap-2 rounded-xl px-3 py-2.5",
                  "border border-l-4 bg-card shadow-sm",
                )}
                style={{
                  borderLeftColor: n.addedByColor,
                }}
              >
                <p className="min-w-0 flex-1 text-sm whitespace-pre-wrap">
                  {n.text}
                </p>
                <span
                  className="text-muted-foreground shrink-0 text-[10px] tracking-wide"
                  title={n.addedByName}
                >
                  {n.addedByName.split(" ")[0]}
                </span>
                {!readOnly && mine ? (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Apagar nota"
                    onClick={() => onRemove(n.id)}
                    className="absolute right-1.5 top-1.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    <XIcon />
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      {!readOnly ? (
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Adicionar nota…"
            maxLength={200}
            className="min-w-0 flex-1"
            aria-label="Nova nota"
          />
          <Button
            type="submit"
            size="sm"
            disabled={submitting || text.trim().length === 0}
          >
            Adicionar
          </Button>
        </form>
      ) : null}
    </section>
  );
}
