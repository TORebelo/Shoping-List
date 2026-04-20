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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createList } from "@/lib/data/lists";
import { getDb } from "@/lib/firebase/client";

export function CreateListDialog({
  owner,
  trigger,
}: {
  owner: { uid: string; displayName: string };
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await createList({
        db: getDb(),
        owner,
        name,
      });
      toast.success(`Lista "${name.trim()}" criada.`);
      setOpen(false);
      setName("");
      // Full navigation (not router.push) to give the Firestore SDK a fresh
      // page-load boundary — the in-flight Watch stream on the dashboard's
      // useLists query is what trips the known `Unexpected state ve:-1`
      // internal assertion when a new doc lands mid-stream against the
      // emulator. Side effect: we reset React state too, which is fine here
      // since we immediately leave the dashboard.
      window.location.assign(`/l/${result.listId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar lista");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ? undefined : <Button />}>
        {trigger ?? "Criar lista"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar lista</DialogTitle>
          <DialogDescription>
            Dá um nome à tua lista. Podes partilhar o link depois para
            adicionar outras pessoas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Compras da semana"
            autoFocus
            maxLength={60}
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
              {submitting ? "A criar…" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
