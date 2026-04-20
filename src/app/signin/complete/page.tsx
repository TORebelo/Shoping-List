"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { completeEmailSignIn } from "@/lib/auth/sign-in";

function Completer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"working" | "error">("working");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await completeEmailSignIn();
        if (cancelled) return;
        if (!result) {
          router.replace("/signin");
          return;
        }
        const redirect = searchParams.get("redirect") ?? "/dashboard";
        router.replace(redirect);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        toast.error(
          err instanceof Error ? err.message : "Falhou a confirmação",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      {status === "working" ? (
        <p className="text-muted-foreground text-sm">A confirmar sessão…</p>
      ) : (
        <>
          <p className="text-sm">
            Não foi possível confirmar a sessão. O link pode ter expirado.
          </p>
          <a className="text-primary text-sm underline" href="/signin">
            Voltar a tentar
          </a>
        </>
      )}
    </main>
  );
}

export default function CompleteSignInPage() {
  return (
    <Suspense fallback={null}>
      <Completer />
    </Suspense>
  );
}
