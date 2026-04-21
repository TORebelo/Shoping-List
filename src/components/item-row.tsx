"use client";

import { CheckIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addItem, deleteItem, toggleItem } from "@/lib/data/items";
import { getDb } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";
import type { ItemDoc } from "@/lib/domain/types";

type Actor = { uid: string; displayName: string; color: string };

const UNDO_MS = 5000;

export function ItemRow({
  listId,
  item,
  actor,
  canDelete,
  readOnly,
}: {
  listId: string;
  item: ItemDoc;
  actor: Actor;
  canDelete: boolean;
  readOnly?: boolean;
}) {
  async function onToggle() {
    if (readOnly) return;
    const wasChecked = item.checked;
    try {
      await toggleItem({
        db: getDb(),
        listId,
        actor,
        itemId: item.id,
        nextChecked: !wasChecked,
      });
      toast(wasChecked ? "Item desmarcado" : "Item marcado", {
        duration: UNDO_MS,
        action: {
          label: "Anular",
          onClick: async () => {
            try {
              await toggleItem({
                db: getDb(),
                listId,
                actor,
                itemId: item.id,
                nextChecked: wasChecked,
              });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Erro ao anular");
            }
          },
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  async function onDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (readOnly) return;
    // Snapshot the fields we need to re-create before the doc is gone.
    const snapshot = {
      name: item.name,
      quantity: item.quantity,
    };
    try {
      await deleteItem({
        db: getDb(),
        listId,
        actor,
        itemId: item.id,
      });
      toast(`"${snapshot.name}" apagado`, {
        duration: UNDO_MS,
        action: {
          label: "Anular",
          onClick: async () => {
            try {
              await addItem({
                db: getDb(),
                listId,
                actor,
                name: snapshot.name,
                quantity: snapshot.quantity,
              });
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Erro ao restaurar",
              );
            }
          },
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div
      className={cn(
        "group border-border bg-card flex items-center gap-3 rounded-xl border px-3 py-3 transition",
        !readOnly && "cursor-pointer hover:bg-muted/40 active:scale-[0.99]",
        item.checked && "bg-muted/30",
      )}
      onClick={onToggle}
      role="checkbox"
      aria-checked={item.checked}
      aria-disabled={readOnly}
      aria-label={item.name}
      tabIndex={readOnly ? -1 : 0}
      onKeyDown={(e) => {
        if (readOnly) return;
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          void onToggle();
        }
      }}
    >
      <span
        className="size-2.5 shrink-0 rounded-full ring-2 ring-transparent transition-[box-shadow] group-hover:ring-background"
        style={{ backgroundColor: item.addedByColor }}
        aria-hidden
        title={item.addedByName}
      />
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span
          className={cn(
            "truncate text-[0.95rem] leading-tight transition-colors",
            item.checked && "text-muted-foreground line-through",
          )}
        >
          {item.name}
        </span>
        {item.quantity ? (
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {item.quantity}
          </span>
        ) : null}
      </div>
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md border transition-all",
          item.checked
            ? "bg-primary text-primary-foreground border-primary scale-100"
            : "border-border bg-background scale-95 [&>svg]:opacity-0",
        )}
        aria-hidden
      >
        <CheckIcon className="size-3.5" />
      </span>
      {canDelete && !readOnly ? (
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onDelete}
          aria-label={`Apagar ${item.name}`}
          className="text-muted-foreground hover:text-destructive opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <Trash2Icon className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
