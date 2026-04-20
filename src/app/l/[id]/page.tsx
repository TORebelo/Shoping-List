"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { AddItemInput } from "@/components/add-item-input";
import { InviteDialog } from "@/components/invite-dialog";
import { ItemRow } from "@/components/item-row";
import { ListMenu } from "@/components/list-menu";
import { MemberAvatars } from "@/components/member-avatars";
import { useAuth } from "@/lib/auth/context";
import { useList } from "@/lib/data/use-list";

export default function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/signin");
  }, [authLoading, user, router]);

  const { list, members, items, loading } = useList(id);
  const myMember = user ? members.find((m) => m.uid === user.uid) : null;
  const isOwner = myMember?.role === "owner";
  const isClosed = list?.status === "closed";

  if (authLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">A carregar…</p>
      </div>
    );
  }

  if (!loading && list && !myMember) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p>Não és membro desta lista.</p>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline" })}
        >
          Voltar ao dashboard
        </Link>
      </main>
    );
  }

  if (loading || !list || !myMember) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">A carregar…</p>
      </div>
    );
  }

  const actor = {
    uid: myMember.uid,
    displayName: myMember.displayName,
    color: myMember.color,
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {list.name}
              </h1>
              {isClosed ? (
                <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-xs font-medium">
                  fechada
                </span>
              ) : null}
            </div>
            <p className="text-muted-foreground text-xs">
              {items.length} {items.length === 1 ? "item" : "itens"} ·{" "}
              <span className="font-mono">{list.inviteCode}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MemberAvatars
            members={members.map((m) => ({
              uid: m.uid,
              displayName: m.displayName,
              color: m.color,
            }))}
          />
          <InviteDialog
            listId={id}
            inviteCode={list.inviteCode}
            isOwner={isOwner}
            actor={{ uid: user.uid }}
          />
          <ListMenu
            listId={id}
            listName={list.name}
            listStatus={list.status}
            isOwner={isOwner}
            actor={{ uid: user.uid }}
          />
        </div>
      </header>

      {!isClosed ? (
        <AddItemInput listId={id} actor={actor} />
      ) : (
        <p className="text-muted-foreground text-sm">
          Esta lista está fechada. Podes ver os itens mas não editá-los.
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {isClosed
            ? "Esta lista foi fechada sem itens."
            : "A lista está vazia. Adiciona o primeiro item."}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              listId={id}
              item={item}
              actor={actor}
              canDelete={isOwner || item.addedBy === user.uid}
              readOnly={isClosed}
            />
          ))}
        </div>
      )}
    </main>
  );
}
