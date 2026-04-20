"use client";

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
      await addItem({
        db: getDb(),
        listId,
        actor,
        name,
        quantity,
      });
      setName("");
      setQuantity("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex: leite"
        maxLength={80}
        required
        className="min-w-0 flex-1"
        aria-label="Nome do item"
      />
      <Input
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="qtd (opcional)"
        maxLength={20}
        className="w-32"
        aria-label="Quantidade"
      />
      <Button type="submit" disabled={!canSubmit}>
        {submitting ? "…" : "Adicionar"}
      </Button>
    </form>
  );
}
