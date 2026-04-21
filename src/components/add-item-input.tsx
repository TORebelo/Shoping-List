"use client";

import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addItem } from "@/lib/data/items";
import { useFrequentItems } from "@/lib/data/use-frequent-items";
import { getDb } from "@/lib/firebase/client";
import { validateItemName, validateQuantity } from "@/lib/domain/helpers";
import type { ItemDoc } from "@/lib/domain/types";

type Actor = { uid: string; displayName: string; color: string };

const MIN_SUGGESTIONS_TO_SHOW = 3;
const MAX_SUGGESTIONS = 8;

export function AddItemInput({
  listId,
  actor,
  existingItems,
}: {
  listId: string;
  actor: Actor;
  existingItems: ItemDoc[];
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);

  const existingNames = useMemo(
    () => new Set(existingItems.map((i) => i.name.trim().toLowerCase())),
    [existingItems],
  );
  const frequent = useFrequentItems(actor.uid, listId, existingNames);

  const canSubmit =
    !submitting && validateItemName(name) && validateQuantity(quantity);

  async function addWith(input: { name: string; quantity: string }) {
    const trimmed = input.name.trim();
    await addItem({
      db: getDb(),
      listId,
      actor,
      name: trimmed,
      quantity: input.quantity,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await addWith({ name, quantity });
      setName("");
      setQuantity("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSuggestionTap(suggestion: {
    name: string;
    quantity: string;
  }) {
    if (addingSuggestion) return;
    setAddingSuggestion(suggestion.name);
    try {
      await addWith(suggestion);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setAddingSuggestion(null);
    }
  }

  const suggestions = frequent.slice(0, MAX_SUGGESTIONS);
  const showSuggestions = suggestions.length >= MIN_SUGGESTIONS_TO_SHOW;

  return (
    <div className="space-y-2">
      <form
        onSubmit={handleSubmit}
        className="bg-card border-border focus-within:ring-ring/40 flex items-center gap-1.5 rounded-xl border p-1.5 shadow-sm focus-within:ring-2"
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Adicionar item…"
          maxLength={80}
          required
          className="min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
          aria-label="Nome do item"
        />
        <Input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="qtd"
          maxLength={20}
          className="w-16 shrink-0 border-0 bg-transparent text-center text-xs shadow-none focus-visible:ring-0"
          aria-label="Quantidade"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!canSubmit}
          aria-label="Adicionar item"
          className="shrink-0"
        >
          <PlusIcon />
        </Button>
      </form>
      {showSuggestions ? (
        <div
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="toolbar"
          aria-label="Sugestões de items"
        >
          {suggestions.map((s) => (
            <button
              key={s.name.toLowerCase()}
              type="button"
              onClick={() =>
                onSuggestionTap({ name: s.name, quantity: s.quantity })
              }
              disabled={addingSuggestion !== null}
              className="border-border bg-card hover:bg-muted/40 text-foreground inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs transition disabled:opacity-50"
            >
              <PlusIcon className="size-3 opacity-60" />
              <span className="max-w-[10rem] truncate">{s.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
