"use client";

import { use } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  return (
    <main className="mx-auto w-full max-w-sm flex-1 space-y-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Juntar à casa</h1>
      <p className="text-muted-foreground text-sm">
        Código: <code>{code}</code>
      </p>
      <p className="text-muted-foreground text-sm">
        O fluxo de junção é implementado na Fase 5.
      </p>
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "outline" })}
      >
        Voltar
      </Link>
    </main>
  );
}
