import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/60 bg-card/40 flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="text-muted-foreground/70 [&>svg]:size-10">{icon}</div>
      ) : null}
      <div className="space-y-1">
        <h2 className="text-base font-medium tracking-tight">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mx-auto max-w-xs text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
