"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">A carregar…</p>
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Lista de Compras
        </h1>
        <p className="text-muted-foreground">
          Listas partilhadas em tempo real. Cada membro tem a sua cor; o
          histórico guarda o que compraram.
        </p>
      </div>
      <Link
        href="/signin"
        className={buttonVariants({ size: "lg", className: "w-full" })}
      >
        Entrar
      </Link>
    </main>
  );
}
