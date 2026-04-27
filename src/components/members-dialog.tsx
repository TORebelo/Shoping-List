"use client";

import {
  MoreVerticalIcon,
  ShieldIcon,
  ShieldOffIcon,
  UserMinusIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { removeMember, setMemberRole } from "@/lib/data/admin";
import type { MemberDoc } from "@/lib/domain/types";
import { getDb } from "@/lib/firebase/client";

type Confirmation =
  | { kind: "remove"; uid: string; displayName: string }
  | { kind: "demote"; uid: string; displayName: string }
  | null;

export function MembersDialog({
  listId,
  members,
  currentUid,
  isOwner,
  open,
  onOpenChange,
}: {
  listId: string;
  members: MemberDoc[];
  currentUid: string;
  isOwner: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirmation>(null);

  function close() {
    setConfirm(null);
    onOpenChange(false);
  }

  async function applyRoleChange(target: MemberDoc, role: "owner" | "member") {
    setBusyUid(target.uid);
    try {
      await setMemberRole({
        db: getDb(),
        listId,
        targetUid: target.uid,
        role,
        actor: { uid: currentUid },
      });
      toast.success(
        role === "owner" ? "Promovido a admin." : "Admin removido.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusyUid(null);
      setConfirm(null);
    }
  }

  async function applyRemove(target: MemberDoc) {
    setBusyUid(target.uid);
    try {
      await removeMember({
        db: getDb(),
        listId,
        uidToRemove: target.uid,
        actor: { uid: currentUid },
      });
      toast.success(`${target.displayName} foi removido.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusyUid(null);
      setConfirm(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Membros</DialogTitle>
          <DialogDescription>
            {isOwner
              ? "Promove outro membro a administrador para que possa gerir a lista, ou remove quem já não precisa de acesso."
              : "Apenas administradores podem alterar permissões ou remover membros."}
          </DialogDescription>
        </DialogHeader>

        <ul className="-mx-1 divide-y divide-border">
          {members.map((m) => {
            const isSelf = m.uid === currentUid;
            const canManage = isOwner && !isSelf;
            const isBusy = busyUid === m.uid;

            return (
              <li
                key={m.uid}
                className="flex items-center gap-3 px-1 py-2.5"
              >
                <Avatar size="sm">
                  <AvatarFallback
                    style={{ backgroundColor: m.color, color: "white" }}
                  >
                    {m.displayName.trim().charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.displayName}
                    {isSelf ? (
                      <span className="text-muted-foreground"> (tu)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.role === "owner" ? "Administrador" : "Membro"}
                  </p>
                </div>
                {canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Ações para ${m.displayName}`}
                          disabled={isBusy}
                        />
                      }
                    >
                      <MoreVerticalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {m.role === "member" ? (
                        <DropdownMenuItem
                          onClick={() => applyRoleChange(m, "owner")}
                        >
                          <ShieldIcon /> Tornar admin
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() =>
                            setConfirm({
                              kind: "demote",
                              uid: m.uid,
                              displayName: m.displayName,
                            })
                          }
                        >
                          <ShieldOffIcon /> Remover admin
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() =>
                          setConfirm({
                            kind: "remove",
                            uid: m.uid,
                            displayName: m.displayName,
                          })
                        }
                      >
                        <UserMinusIcon /> Remover da lista
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <DialogClose render={<Button />}>Fechar</DialogClose>
        </DialogFooter>
      </DialogContent>

      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => {
          if (!o) setConfirm(null);
        }}
      >
        <DialogContent>
          {confirm?.kind === "remove" ? (
            <>
              <DialogHeader>
                <DialogTitle>Remover {confirm.displayName}?</DialogTitle>
                <DialogDescription>
                  Esta pessoa deixa de ver a lista. Pode voltar a juntar-se
                  com o código de convite.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={busyUid !== null}
                  onClick={() => {
                    const target = members.find((x) => x.uid === confirm.uid);
                    if (target) void applyRemove(target);
                  }}
                >
                  {busyUid ? "A remover…" : "Remover"}
                </Button>
              </DialogFooter>
            </>
          ) : confirm?.kind === "demote" ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Remover admin a {confirm.displayName}?
                </DialogTitle>
                <DialogDescription>
                  {confirm.uid === currentUid
                    ? "Vais perder a possibilidade de gerir a lista. Outro admin terá de te promover para a recuperares."
                    : "Esta pessoa continua na lista, mas deixa de poder gerir membros, regenerar o convite ou apagar a lista."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button
                  disabled={busyUid !== null}
                  onClick={() => {
                    const target = members.find((x) => x.uid === confirm.uid);
                    if (target) void applyRoleChange(target, "member");
                  }}
                >
                  {busyUid ? "A guardar…" : "Confirmar"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
