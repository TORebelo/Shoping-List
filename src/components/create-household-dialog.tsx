"use client";

import { useRouter } from "next/navigation";
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
import { createHousehold } from "@/lib/data/households";
import { getDb } from "@/lib/firebase/client";

export function CreateHouseholdDialog({
  owner,
  trigger,
}: {
  owner: { uid: string; displayName: string };
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await createHousehold({
        db: getDb(),
        owner,
        name,
      });
      toast.success(`Casa "${name.trim()}" criada.`);
      setOpen(false);
      setName("");
      router.push(`/h/${result.householdId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar casa");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ? undefined : <Button />}>
        {trigger ?? "Criar casa"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar lista partilhada</DialogTitle>
          <DialogDescription>
            Dá um nome à tua casa. Podes partilhar o link com a família depois.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Casa dos Silva"
            autoFocus
            maxLength={60}
            required
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={submitting || name.trim().length === 0}>
              {submitting ? "A criar…" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
