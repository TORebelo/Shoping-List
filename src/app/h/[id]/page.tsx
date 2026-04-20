"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddItemInput } from "@/components/add-item-input";
import { InviteDialog } from "@/components/invite-dialog";
import { ItemRow } from "@/components/item-row";
import { MemberAvatars } from "@/components/member-avatars";
import { useActiveList } from "@/lib/data/use-active-list";
import { useHousehold } from "@/lib/data/use-household";
import { useAuth } from "@/lib/auth/context";

export default function HouseholdPage({
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

  const { household, members, loading: hhLoading } = useHousehold(id);
  const { list, items, loading: listLoading } = useActiveList(id);

  const myMember = user ? members.find((m) => m.uid === user.uid) : null;
  const isOwner = myMember?.role === "owner";

  if (authLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">A carregar…</p>
      </div>
    );
  }

  if (!hhLoading && household && !myMember) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p>Não és membro desta casa.</p>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline" })}
        >
          Voltar ao dashboard
        </Link>
      </main>
    );
  }

  if (hhLoading || !household || !myMember) {
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
            <h1 className="text-xl font-semibold tracking-tight">
              {household.name}
            </h1>
            <p className="text-muted-foreground text-xs">
              Código: {household.inviteCode}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MemberAvatars
            members={members.map((m) => ({
              uid: m.uid,
              displayName: m.displayName,
              color: m.color,
            }))}
          />
          <InviteDialog
            householdId={id}
            inviteCode={household.inviteCode}
            isOwner={isOwner}
            actor={{ uid: user.uid }}
          />
        </div>
      </header>

      <Tabs defaultValue="active" className="gap-4">
        <TabsList>
          <TabsTrigger value="active">Ativa</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {listLoading ? (
            <p className="text-muted-foreground text-sm">A carregar lista…</p>
          ) : !list ? (
            <p className="text-muted-foreground text-sm">Sem lista ativa.</p>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-sm font-medium">{list.title}</h2>
                <p className="text-muted-foreground text-xs">
                  {items.length} {items.length === 1 ? "item" : "itens"}
                </p>
              </div>
              <AddItemInput
                householdId={id}
                listId={list.id}
                actor={actor}
              />
              {items.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  A lista está vazia. Adiciona o primeiro item.
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <ItemRow
                      key={item.id}
                      householdId={id}
                      listId={list.id}
                      item={item}
                      actor={actor}
                      canDelete={isOwner || item.addedBy === user.uid}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-2">
          <p className="text-muted-foreground text-sm">
            O histórico aparece aqui na Fase 6.
          </p>
        </TabsContent>
      </Tabs>
    </main>
  );
}
