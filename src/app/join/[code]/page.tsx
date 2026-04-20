"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { joinList } from "@/lib/data/join";
import { getDb } from "@/lib/firebase/client";

export default function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(
        `/signin?redirect=${encodeURIComponent(`/join/${code}`)}`,
      );
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await joinList({
          db: getDb(),
          code,
          user: {
            uid: user.uid,
            displayName: user.displayName ?? user.email ?? "Membro",
          },
        });
        if (cancelled) return;
        if (result.alreadyMember) {
          toast.info("Já fazes parte desta lista.");
        } else {
          toast.success("Entraste na lista!");
        }
        router.replace(`/l/${result.listId}`);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao entrar");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, code, router]);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      {error ? (
        <>
          <p className="text-destructive text-sm">{error}</p>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline" })}
          >
            Voltar ao dashboard
          </Link>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">A juntar à lista…</p>
      )}
    </main>
  );
}
