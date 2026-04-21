"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ListChecksIcon, SettingsIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateListDialog } from "@/components/create-list-dialog";
import { EmptyState } from "@/components/empty-state";
import { JoinListDialog } from "@/components/join-list-dialog";
import { ListCard } from "@/components/list-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth/context";
import { useLists } from "@/lib/data/use-lists";
import type { ListDoc } from "@/lib/domain/types";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/signin");
  }, [authLoading, user, router]);

  const { lists, loading } = useLists(user?.uid ?? null);

  const { active, closed } = useMemo(() => {
    const a: ListDoc[] = [];
    const c: ListDoc[] = [];
    for (const l of lists) (l.status === "active" ? a : c).push(l);
    return { active: a, closed: c };
  }, [lists]);

  if (authLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">A carregar…</p>
      </div>
    );
  }

  const ownerIdentity = {
    uid: user.uid,
    displayName: user.displayName ?? user.email ?? "Membro",
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            As tuas listas
          </h1>
          <p className="text-muted-foreground text-sm">
            Olá, {user.displayName ?? user.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <JoinListDialog />
          <CreateListDialog owner={ownerIdentity} />
          <ThemeToggle />
          <Link
            href="/settings"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            aria-label="Definições"
          >
            <SettingsIcon />
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <EmptyState
          icon={<ListChecksIcon />}
          title="Ainda não tens nenhuma lista"
          description="Cria a primeira e convida família ou amigos a adicionar itens em tempo real."
        >
          <CreateListDialog owner={ownerIdentity} trigger="Criar lista" />
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {active.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                Ativas · {active.length}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((l) => (
                  <ListCard key={l.id} list={l} />
                ))}
              </div>
            </section>
          ) : null}
          {closed.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                Fechadas · {closed.length}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {closed.map((l) => (
                  <ListCard key={l.id} list={l} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
