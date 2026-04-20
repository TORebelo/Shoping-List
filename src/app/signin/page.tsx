"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/context";
import { sendMagicLink, signInWithGoogle } from "@/lib/auth/sign-in";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<"google" | "email" | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace(redirect);
  }, [loading, user, router, redirect]);

  async function onGoogle() {
    setPending("google");
    try {
      await signInWithGoogle();
      router.replace(redirect);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falhou a sessão Google",
      );
    } finally {
      setPending(null);
    }
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setPending("email");
    try {
      await sendMagicLink(email, redirect === "/dashboard" ? undefined : redirect);
      toast.success("Verifica o teu email e clica no link para entrar.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível enviar o link",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="text-muted-foreground text-sm">
          Escolhe como queres iniciar sessão.
        </p>
      </div>

      <Button
        onClick={onGoogle}
        disabled={pending !== null}
        variant="outline"
        className="w-full"
      >
        {pending === "google" ? "A abrir…" : "Continuar com Google"}
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase">
        <span className="border-border h-px flex-1 border-t" />
        ou
        <span className="border-border h-px flex-1 border-t" />
      </div>

      <form className="space-y-3" onSubmit={onEmail}>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
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
          disabled={pending !== null || email.length === 0}
        >
          {pending === "email" ? "A enviar…" : "Enviar link mágico"}
        </Button>
      </form>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
