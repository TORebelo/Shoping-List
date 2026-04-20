"use client";

import { use } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function HouseholdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 p-6">
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        ← Dashboard
      </Link>
      <h1 className="text-xl font-semibold">Casa {id}</h1>
      <p className="text-muted-foreground text-sm">
        A lista ativa aparecerá aqui na Fase 4.
      </p>
    </main>
  );
}
