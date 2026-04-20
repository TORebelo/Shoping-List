"use client";

import { MoreVerticalIcon } from "lucide-react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteHousehold, leaveHousehold } from "@/lib/data/admin";
import { getDb } from "@/lib/firebase/client";

type Mode = null | "leave" | "delete";

export function HouseholdMenu({
  householdId,
  householdName,
  isOwner,
  actor,
}: {
  householdId: string;
  householdName: string;
  isOwner: boolean;
  actor: { uid: string };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [confirmName, setConfirmName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onLeave() {
    setSubmitting(true);
    try {
      await leaveHousehold({
        db: getDb(),
        householdId,
        uid: actor.uid,
      });
      toast.success("Saíste da casa.");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (confirmName !== householdName) {
      toast.error("O nome não coincide.");
      return;
    }
    setSubmitting(true);
    try {
      await deleteHousehold({
        db: getDb(),
        householdId,
        actor,
      });
      toast.success("Casa apagada.");
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
          <DropdownMenuItem onClick={() => setMode("leave")}>
            Sair da casa
          </DropdownMenuItem>
          {isOwner ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setMode("delete")}
            >
              Apagar casa
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={mode === "leave"}
        onOpenChange={(o) => setMode(o ? "leave" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair de {householdName}?</DialogTitle>
            <DialogDescription>
              Deixarás de ver esta lista e os seus itens. Podes voltar a juntar-te
              com o código de convite.
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
            <DialogTitle>Apagar {householdName}?</DialogTitle>
            <DialogDescription>
              Esta ação apaga a casa, todas as listas e o histórico para todos
              os membros. Não é possível desfazer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-name">
              Escreve <strong>{householdName}</strong> para confirmar.
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
              disabled={submitting || confirmName !== householdName}
            >
              {submitting ? "A apagar…" : "Apagar definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
