"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { getAuthClient } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/context";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">A carregar…</p>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Olá, {user.displayName ?? user.email}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => signOut(getAuthClient()).then(() => router.replace("/"))}
        >
          Terminar sessão
        </Button>
      </header>
      <p className="text-muted-foreground text-sm">
        As casas partilhadas aparecerão aqui na Fase 3.
      </p>
    </main>
  );
}
