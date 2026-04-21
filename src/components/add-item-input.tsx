"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addItem } from "@/lib/data/items";
import { getDb } from "@/lib/firebase/client";
import { validateItemName, validateQuantity } from "@/lib/domain/helpers";

type Actor = { uid: string; displayName: string; color: string };

export function AddItemInput({
  listId,
  actor,
}: {
  listId: string;
  actor: Actor;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    !submitting && validateItemName(name) && validateQuantity(quantity);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await addItem({ db: getDb(), listId, actor, name, quantity });
      setName("");
      setQuantity("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border-border flex items-center gap-1.5 rounded-xl border p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring/40"
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
  );
}
