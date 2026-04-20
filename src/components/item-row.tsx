"use client";

import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteItem, toggleItem } from "@/lib/data/items";
import { getDb } from "@/lib/firebase/client";
import type { ItemDoc } from "@/lib/domain/types";

type Actor = { uid: string; displayName: string; color: string };

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
    try {
      await toggleItem({
        db: getDb(),
        listId,
        actor,
        itemId: item.id,
        nextChecked: !item.checked,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  async function onDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (readOnly) return;
    try {
      await deleteItem({
        db: getDb(),
        listId,
        actor,
        itemId: item.id,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div
      className={
        "group flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition " +
        (readOnly ? "" : "cursor-pointer hover:bg-muted/40")
      }
      onClick={onToggle}
      role="checkbox"
      aria-checked={item.checked}
      aria-disabled={readOnly}
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
      {canDelete && !readOnly ? (
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onDelete}
          aria-label="Apagar item"
          className="opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <Trash2Icon />
        </Button>
      ) : null}
    </div>
  );
}
