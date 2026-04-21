"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckCircle2Icon, StickyNoteIcon, UsersIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";

const FEATURES = [
  {
    icon: UsersIcon,
    title: "Em tempo real",
    description:
      "Cada membro tem a sua cor. Itens que alguém marca aparecem a todos.",
  },
  {
    icon: StickyNoteIcon,
    title: "Notas partilhadas",
    description:
      "Post-its para combinar \"traz também batatas\" sem ser preciso mensagem.",
  },
  {
    icon: CheckCircle2Icon,
    title: "Fecha e recomeça",
    description:
      "Quando vais às compras, fecha a lista. Duplica para começar outra igual.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">A carregar…</p>
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-10 px-6 py-12">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Lista de Compras
        </h1>
        <p className="text-muted-foreground mx-auto max-w-md text-base leading-relaxed sm:text-lg">
          Uma lista que tu e a tua família vão actualizando em tempo real.
          Sem grupos de chat, sem &ldquo;alguém já comprou leite?&rdquo;.
        </p>
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="border-border/60 bg-card/40 space-y-1.5 rounded-xl border p-4"
          >
            <f.icon className="text-muted-foreground size-4" />
            <h2 className="text-sm font-medium">{f.title}</h2>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {f.description}
            </p>
          </div>
        ))}
      </div>
      <Link
        href="/signin"
        className={buttonVariants({
          size: "lg",
          className: "w-full sm:w-auto sm:px-10",
        })}
      >
        Entrar
      </Link>
    </main>
  );
}
