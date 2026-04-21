"use client";

import {
  collectionGroup,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { getDb } from "@/lib/firebase/client";
import type { ItemDoc } from "@/lib/domain/types";

export type FrequentItem = {
  name: string;
  quantity: string;
  lastUsed: number; // ms
  count: number;
};

const SAMPLE_SIZE = 80;

function itemTimestamp(item: ItemDoc): number {
  const ts = item.createdAt as unknown as { toMillis?(): number } | undefined;
  return ts?.toMillis?.() ?? 0;
}

/**
 * Aggregates the authenticated user's previously-added items across every
 * list they still belong to, deduping by lowercased name and ranking by
 * recency (secondary: frequency). One-shot query (not a realtime listener)
 * to avoid the dashboard-style SDK assertion and because the set changes
 * slowly.
 */
export function useFrequentItems(
  uid: string | null,
  currentListId: string | null,
  currentListNames: Set<string>,
): FrequentItem[] {
  const [items, setItems] = useState<FrequentItem[]>([]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collectionGroup(getDb(), "items"),
            where("addedBy", "==", uid),
            orderBy("createdAt", "desc"),
            limit(SAMPLE_SIZE),
          ),
        );
        const byName = new Map<string, FrequentItem>();
        for (const d of snap.docs) {
          const data = d.data() as ItemDoc;
          const key = data.name.trim().toLowerCase();
          if (!key) continue;
          const existing = byName.get(key);
          if (existing) {
            existing.count += 1;
            const t = itemTimestamp(data);
            if (t > existing.lastUsed) {
              existing.lastUsed = t;
              existing.quantity = data.quantity;
            }
          } else {
            byName.set(key, {
              name: data.name.trim(),
              quantity: data.quantity,
              lastUsed: itemTimestamp(data),
              count: 1,
            });
          }
        }
        const ranked = Array.from(byName.values())
          .filter((i) => !currentListNames.has(i.name.toLowerCase()))
          .sort((a, b) => b.lastUsed - a.lastUsed);
        if (!cancelled) setItems(ranked);
      } catch (err) {
        console.warn("[useFrequentItems] error", err);
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // currentListNames is a new Set on every render; track its size as a
    // cheap proxy for "items changed" so we re-filter without re-querying.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, currentListId, currentListNames.size]);

  return items;
}
