"use client";

import { CopyIcon, ShareIcon } from "lucide-react";
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
import { rotateInviteCode } from "@/lib/data/rotate-invite";
import { getDb } from "@/lib/firebase/client";

export function InviteDialog({
  listId,
  inviteCode,
  isOwner,
  actor,
}: {
  listId: string;
  inviteCode: string;
  isOwner: boolean;
  actor: { uid: string };
}) {
  const [rotating, setRotating] = useState(false);
  const [open, setOpen] = useState(false);
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${inviteCode}`
      : `/join/${inviteCode}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  async function onRotate() {
    setRotating(true);
    try {
      await rotateInviteCode({ db: getDb(), listId, actor });
      toast.success("Novo código gerado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setRotating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" aria-label="Convidar" />}
      >
        <ShareIcon /> Convidar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar membros</DialogTitle>
          <DialogDescription>
            Partilha este link. Quem o abrir junta-se à lista após iniciar
            sessão.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <Button variant="outline" size="icon" onClick={copy} aria-label="Copiar">
            <CopyIcon />
          </Button>
        </div>
        <DialogFooter>
          {isOwner ? (
            <Button
              variant="outline"
              onClick={onRotate}
              disabled={rotating}
            >
              {rotating ? "A regenerar…" : "Regenerar código"}
            </Button>
          ) : null}
          <DialogClose render={<Button />}>Fechar</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
