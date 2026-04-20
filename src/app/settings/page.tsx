"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import {
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth/context";
import { getAuthClient, getDb } from "@/lib/firebase/client";
import type { UserDoc } from "@/lib/domain/types";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const ref = doc(getDb(), "users", user.uid);
    return onSnapshot(ref, (snap) => {
      const data = snap.exists() ? (snap.data() as UserDoc) : null;
      setUserDoc(data);
      if (data && displayName === "") {
        setDisplayName(data.displayName);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  async function onSave() {
    if (!user) return;
    if (displayName.trim().length === 0) {
      toast.error("O nome não pode estar vazio.");
      return;
    }
    setSubmitting(true);
    try {
      await updateDoc(doc(getDb(), "users", user.uid), {
        displayName: displayName.trim(),
      });
      toast.success("Nome atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">A carregar…</p>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 space-y-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            ←
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Definições
          </h1>
        </div>
        <ThemeToggle />
      </header>

      <section className="space-y-2">
        <Label htmlFor="displayName">Nome global</Label>
        <div className="flex gap-2">
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            className="flex-1"
          />
          <Button
            onClick={onSave}
            disabled={
              submitting ||
              !userDoc ||
              displayName.trim() === userDoc.displayName
            }
          >
            Guardar
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Este nome aparece como valor predefinido nas listas onde és membro.
        </p>
      </section>

      <section className="space-y-2">
        <Label>Plano</Label>
        <p className="text-sm">
          <span className="bg-muted rounded-md px-2 py-1 text-xs font-medium">
            {userDoc?.plan ?? "free"}
          </span>
        </p>
      </section>

      <section>
        <Button
          variant="outline"
          onClick={() =>
            signOut(getAuthClient()).then(() => router.replace("/"))
          }
        >
          Terminar sessão
        </Button>
      </section>
    </main>
  );
}
