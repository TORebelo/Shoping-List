"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cloneList } from "@/lib/data/clone-list";
import { getDb } from "@/lib/firebase/client";

export function CloneListDialog({
  open,
  onOpenChange,
  sourceListId,
  sourceListName,
  itemCount,
  owner,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceListId: string;
  sourceListName: string;
  itemCount: number;
  owner: { uid: string; displayName: string };
}) {
  const [name, setName] = useState(`${sourceListName} (cópia)`);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { listId } = await cloneList({
        db: getDb(),
        sourceListId,
        owner,
        newName: name,
      });
      toast.success(`Lista duplicada com ${itemCount} ${itemCount === 1 ? "item" : "itens"}.`);
      // Full navigation so the useList listeners initialize cleanly for the
      // new list id (avoids listener-vs-write races we hit before).
      window.location.assign(`/l/${listId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao duplicar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicar lista</DialogTitle>
          <DialogDescription>
            Cria uma nova lista com os mesmos {itemCount}{" "}
            {itemCount === 1 ? "item" : "itens"} (todos desmarcados). Membros,
            notas e convites não são copiados.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <Label htmlFor="clone-name">Nome da nova lista</Label>
          <Input
            id="clone-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoFocus
            required
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              type="submit"
              disabled={submitting || name.trim().length === 0}
            >
              {submitting ? "A duplicar…" : "Duplicar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
