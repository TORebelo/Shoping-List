"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  MailCheckIcon,
  ShoppingBasketIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/context";
import { sendMagicLink, signInWithGoogle } from "@/lib/auth/sign-in";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function AppMark() {
  return (
    <div className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-2xl shadow-sm">
      <ShoppingBasketIcon className="size-6" />
    </div>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<"google" | "email" | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

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
      await sendMagicLink(
        email,
        redirect === "/dashboard" ? undefined : redirect,
      );
      setSentTo(email);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível enviar o link",
      );
    } finally {
      setPending(null);
    }
  }

  if (sentTo) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
            <MailCheckIcon className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Verifica o teu email
            </h1>
            <p className="text-muted-foreground text-sm">
              Enviámos um link de entrada para{" "}
              <strong className="text-foreground break-all">{sentTo}</strong>.
              Clica nele para iniciar sessão (pode ir para a pasta spam).
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={() => setSentTo(null)}
          >
            Usar outro email
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            size="sm"
            onClick={async () => {
              setPending("email");
              try {
                await sendMagicLink(
                  sentTo,
                  redirect === "/dashboard" ? undefined : redirect,
                );
                toast.success("Link reenviado.");
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Erro a reenviar",
                );
              } finally {
                setPending(null);
              }
            }}
            disabled={pending !== null}
          >
            {pending === "email" ? "A reenviar…" : "Reenviar"}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-10">
      <Link
        href="/"
        className={
          buttonVariants({ variant: "ghost", size: "sm" }) +
          " text-muted-foreground -ml-2 self-start"
        }
        aria-label="Voltar"
      >
        <ArrowLeftIcon /> Voltar
      </Link>

      <div className="flex flex-col items-center gap-4 text-center">
        <AppMark />
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Bem-vindo
          </h1>
          <p className="text-muted-foreground text-sm">
            Entra para ver e partilhar as tuas listas.
          </p>
        </div>
      </div>

      <div className="bg-card border-border space-y-5 rounded-2xl border p-5 shadow-sm">
        <Button
          onClick={onGoogle}
          disabled={pending !== null}
          variant="outline"
          className="w-full gap-3"
          size="lg"
        >
          <GoogleGlyph />
          {pending === "google" ? "A abrir…" : "Continuar com Google"}
        </Button>

        <div className="text-muted-foreground flex items-center gap-3 text-xs tracking-wider uppercase">
          <span className="border-border h-px flex-1 border-t" />
          ou por email
          <span className="border-border h-px flex-1 border-t" />
        </div>

        <form className="space-y-3" onSubmit={onEmail}>
          <Label htmlFor="email" className="sr-only">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@example.com"
            className="h-10"
          />
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={pending !== null || email.length === 0}
          >
            {pending === "email" ? "A enviar…" : "Enviar link mágico"}
          </Button>
        </form>
      </div>

      <p className="text-muted-foreground text-center text-xs">
        Ao entrares concordas em partilhar apenas o nome e o email com os
        outros membros das tuas listas.
      </p>
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
