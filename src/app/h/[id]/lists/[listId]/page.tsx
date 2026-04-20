"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";
import { useList } from "@/lib/data/use-list";

export default function ClosedListPage({
  params,
}: {
  params: Promise<{ id: string; listId: string }>;
}) {
  const { id, listId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/signin");
  }, [authLoading, user, router]);

  const { list, items, loading } = useList(id, listId);

  if (authLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">A carregar…</p>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 p-6">
      <header className="flex items-center gap-3">
        <Link
          href={`/h/${id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          ← Voltar
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {list?.title ?? "Lista"}
          </h1>
          <p className="text-muted-foreground text-xs">
            {loading
              ? "A carregar…"
              : `${items.length} ${items.length === 1 ? "item" : "itens"}`}
          </p>
        </div>
      </header>

      {loading ? null : !list ? (
        <p className="text-muted-foreground text-sm">Lista não encontrada.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="border-border flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
            >
              <span
                className="inline-block size-3 shrink-0 rounded-full"
                style={{ backgroundColor: item.addedByColor }}
                aria-hidden
              />
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className={
                    item.checked
                      ? "text-muted-foreground truncate line-through"
                      : "truncate"
                  }
                >
                  {item.name}
                </span>
                {item.quantity ? (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {item.quantity}
                  </span>
                ) : null}
              </div>
              <span
                className={
                  "size-5 shrink-0 rounded border " +
                  (item.checked
                    ? "bg-primary border-primary"
                    : "border-border bg-background")
                }
                aria-hidden
              />
            </div>
          ))}
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sem itens.</p>
          ) : null}
        </div>
      )}
    </main>
  );
}
