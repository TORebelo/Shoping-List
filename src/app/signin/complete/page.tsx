"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  AlertCircleIcon,
  Loader2Icon,
  MailCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  completeEmailSignIn,
  completeEmailSignInWith,
} from "@/lib/auth/sign-in";

type Status = "working" | "needs-email" | "error";

function Completer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("working");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await completeEmailSignIn();
        if (cancelled) return;
        if (result.kind === "not-a-link") {
          router.replace("/signin");
          return;
        }
        if (result.kind === "needs-email") {
          setStatus("needs-email");
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

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await completeEmailSignInWith(email);
      const redirect = searchParams.get("redirect") ?? "/dashboard";
      router.replace(redirect);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
      setSubmitting(false);
    }
  }

  if (status === "working") {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
        <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
          <Loader2Icon className="size-7 animate-spin" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            A confirmar sessão
          </h1>
          <p className="text-muted-foreground text-sm">Só um instante…</p>
        </div>
      </main>
    );
  }

  if (status === "needs-email") {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-5 px-6 py-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
            <MailCheckIcon className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight">
              Confirma o teu email
            </h1>
            <p className="text-muted-foreground text-sm">
              Como estás a abrir o link noutro dispositivo, escreve o email
              onde recebeste o link para confirmar.
            </p>
          </div>
        </div>
        <form
          className="bg-card border-border space-y-3 rounded-2xl border p-5 shadow-sm"
          onSubmit={onSubmitEmail}
        >
          <Label htmlFor="confirm-email" className="sr-only">
            Email
          </Label>
          <Input
            id="confirm-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@example.com"
          />
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitting || email.length === 0}
          >
            {submitting ? "A confirmar…" : "Entrar"}
          </Button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <div className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-2xl">
        <AlertCircleIcon className="size-7" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">
          Link inválido ou expirado
        </h1>
        <p className="text-muted-foreground text-sm">
          O link mágico é válido apenas uma vez e por alguns minutos. Pede
          um novo.
        </p>
      </div>
      <Link href="/signin" className={buttonVariants({ variant: "default" })}>
        Voltar a entrar
      </Link>
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
