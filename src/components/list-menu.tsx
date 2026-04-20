"use client";

import { CheckCircle2Icon, MoreVerticalIcon } from "lucide-react";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteList, leaveList } from "@/lib/data/admin";
import { closeList } from "@/lib/data/close-list";
import { getDb } from "@/lib/firebase/client";

type Mode = null | "close" | "leave" | "delete";

export function ListMenu({
  listId,
  listName,
  listStatus,
  isOwner,
  actor,
}: {
  listId: string;
  listName: string;
  listStatus: "active" | "closed";
  isOwner: boolean;
  actor: { uid: string };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [confirmName, setConfirmName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onClose() {
    setSubmitting(true);
    try {
      await closeList({ db: getDb(), listId, actor });
      toast.success("Lista fechada.");
      setMode(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  async function onLeave() {
    setSubmitting(true);
    try {
      await leaveList({ db: getDb(), listId, uid: actor.uid });
      toast.success("Saíste da lista.");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (confirmName !== listName) {
      toast.error("O nome não coincide.");
      return;
    }
    setSubmitting(true);
    try {
      await deleteList({ db: getDb(), listId, actor });
      toast.success("Lista apagada.");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label="Menu" />}
        >
          <MoreVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {listStatus === "active" ? (
            <DropdownMenuItem onClick={() => setMode("close")}>
              <CheckCircle2Icon /> Fechar lista
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => setMode("leave")}>
            Sair da lista
          </DropdownMenuItem>
          {isOwner ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setMode("delete")}
              >
                Apagar lista
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={mode === "close"}
        onOpenChange={(o) => setMode(o ? "close" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar {listName}?</DialogTitle>
            <DialogDescription>
              A lista fica read-only e aparece no dashboard como fechada. Cria
              uma nova lista quando quiseres começar outra ida às compras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={onClose} disabled={submitting}>
              {submitting ? "A fechar…" : "Fechar lista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={mode === "leave"}
        onOpenChange={(o) => setMode(o ? "leave" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair de {listName}?</DialogTitle>
            <DialogDescription>
              Deixarás de ver esta lista. Podes voltar a juntar-te com o código
              de convite.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              variant="destructive"
              onClick={onLeave}
              disabled={submitting}
            >
              {submitting ? "A sair…" : "Sair"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={mode === "delete"}
        onOpenChange={(o) => {
          setMode(o ? "delete" : null);
          if (!o) setConfirmName("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar {listName}?</DialogTitle>
            <DialogDescription>
              Esta ação apaga a lista e todos os seus itens para todos os
              membros. Não é possível desfazer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-name">
              Escreve <strong>{listName}</strong> para confirmar.
            </Label>
            <Input
              id="confirm-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={submitting || confirmName !== listName}
            >
              {submitting ? "A apagar…" : "Apagar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
