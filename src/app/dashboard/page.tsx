"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { HouseholdCard } from "@/components/household-card";
import { CreateHouseholdDialog } from "@/components/create-household-dialog";
import { JoinHouseholdDialog } from "@/components/join-household-dialog";
import { getAuthClient } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/context";
import { useHouseholds } from "@/lib/data/use-households";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/signin");
  }, [authLoading, user, router]);

  const { households, loading: hhLoading } = useHouseholds(user?.uid ?? null);

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
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">As tuas listas</h1>
          <p className="text-muted-foreground text-sm">
            Olá, {user.displayName ?? user.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <JoinHouseholdDialog />
          <CreateHouseholdDialog owner={ownerIdentity} />
          <Button
            variant="ghost"
            onClick={() => signOut(getAuthClient()).then(() => router.replace("/"))}
          >
            Terminar sessão
          </Button>
        </div>
      </header>

      {hhLoading ? (
        <p className="text-muted-foreground text-sm">A carregar casas…</p>
      ) : households.length === 0 ? (
        <EmptyState owner={ownerIdentity} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {households.map((h) => (
            <HouseholdCard key={h.id} household={h} />
          ))}
        </div>
      )}
    </main>
  );
}

function EmptyState({
  owner,
}: {
  owner: { uid: string; displayName: string };
}) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <h2 className="text-lg font-medium">Ainda não tens nenhuma casa</h2>
      <p className="text-muted-foreground text-sm">
        Cria uma lista partilhada e convida família ou amigos.
      </p>
      <CreateHouseholdDialog
        owner={owner}
        trigger="Criar lista partilhada"
      />
    </div>
  );
}
