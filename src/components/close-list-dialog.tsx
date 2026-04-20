"use client";

import { CheckCircle2Icon } from "lucide-react";
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
import { closeActiveList } from "@/lib/data/close-list";
import { getDb } from "@/lib/firebase/client";

export function CloseListDialog({
  householdId,
  actor,
  disabled,
}: {
  householdId: string;
  actor: { uid: string };
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onClose() {
    setSubmitting(true);
    try {
      await closeActiveList({ db: getDb(), householdId, actor });
      toast.success("Lista fechada. Nova lista criada.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" disabled={disabled} />
        }
      >
        <CheckCircle2Icon /> Fechar lista
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar a lista?</DialogTitle>
          <DialogDescription>
            A lista atual passa para o histórico e começa uma lista nova vazia.
            Podes sempre consultar os itens desta lista mais tarde.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button onClick={onClose} disabled={submitting}>
            {submitting ? "A fechar…" : "Fechar e começar nova"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
