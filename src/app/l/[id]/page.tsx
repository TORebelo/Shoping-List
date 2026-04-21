"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { ArrowLeftIcon, LockIcon, ShoppingBasketIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddItemInput } from "@/components/add-item-input";
import { EmptyState } from "@/components/empty-state";
import { InviteDialog } from "@/components/invite-dialog";
import { ItemRow } from "@/components/item-row";
import { ListMenu } from "@/components/list-menu";
import { MemberAvatars } from "@/components/member-avatars";
import { NotesPanel } from "@/components/notes-panel";
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

  const { list, members, items, notes, loading } = useList(id);
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
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-12 rounded-xl" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  const actor = {
    uid: myMember.uid,
    displayName: myMember.displayName,
    color: myMember.color,
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-6 sm:px-6">
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className={buttonVariants({
              variant: "ghost",
              size: "icon-sm",
            })}
            aria-label="Voltar ao dashboard"
          >
            <ArrowLeftIcon />
          </Link>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {list.name}
            </h1>
            {isClosed ? (
              <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                <LockIcon className="size-3" /> fechada
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <MemberAvatars
              members={members.map((m) => ({
                uid: m.uid,
                displayName: m.displayName,
                color: m.color,
              }))}
            />
            <p className="text-muted-foreground text-xs">
              {items.length} {items.length === 1 ? "item" : "itens"}
              {list.inviteCode ? (
                <>
                  <span className="mx-1.5 opacity-40">·</span>
                  <code className="font-mono">{list.inviteCode}</code>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-1">
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
              itemCount={items.length}
              isOwner={isOwner}
              actor={{
                uid: user.uid,
                displayName: user.displayName ?? user.email ?? "Membro",
              }}
            />
          </div>
        </div>
      </header>

      <NotesPanel
        listId={id}
        notes={notes}
        actor={actor}
        readOnly={isClosed}
      />

      {!isClosed ? <AddItemInput listId={id} actor={actor} /> : null}

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBasketIcon />}
          title={
            isClosed ? "Lista fechada sem itens" : "A lista está vazia"
          }
          description={
            isClosed
              ? "Esta lista foi fechada sem nada dentro."
              : "Adiciona o primeiro item acima."
          }
        />
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
