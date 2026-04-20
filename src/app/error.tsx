"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Algo correu mal</h1>
      <p className="text-muted-foreground text-sm">
        {error.message || "Ocorreu um erro inesperado."}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className={buttonVariants({ variant: "default" })}
        >
          Tentar novamente
        </button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Início
        </Link>
      </div>
    </main>
  );
}
