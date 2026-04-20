"use client";

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { getDb } from "@/lib/firebase/client";
import type { ItemDoc, ListDoc } from "@/lib/domain/types";

type Cache = {
  key: string | null;
  list: ListDoc | null;
  listLoaded: boolean;
  items: ItemDoc[];
  itemsLoaded: boolean;
};

const EMPTY: ItemDoc[] = [];

export type UseListResult = {
  list: ListDoc | null;
  items: ItemDoc[];
  loading: boolean;
};

export function useList(
  householdId: string | null,
  listId: string | null,
): UseListResult {
  const key = householdId && listId ? `${householdId}/${listId}` : null;
  const [cache, setCache] = useState<Cache>({
    key: null,
    list: null,
    listLoaded: false,
    items: EMPTY,
    itemsLoaded: false,
  });

  useEffect(() => {
    if (!householdId || !listId) return;
    const db = getDb();
    const listRef = doc(db, "households", householdId, "lists", listId);
    const listUnsub = onSnapshot(
      listRef,
      (snap) => {
        const list = snap.exists() ? (snap.data() as ListDoc) : null;
        setCache((prev) => ({
          ...prev,
          key: `${householdId}/${listId}`,
          list,
          listLoaded: true,
        }));
      },
      (err) => {
        console.warn("[useList] list subscription error", err);
        setCache((prev) => ({
          ...prev,
          key: `${householdId}/${listId}`,
          list: null,
          listLoaded: true,
        }));
      },
    );
    const itemsQuery = query(
      collection(db, "households", householdId, "lists", listId, "items"),
      orderBy("createdAt", "asc"),
    );
    const itemsUnsub = onSnapshot(
      itemsQuery,
      (snap) => {
        const items = snap.docs.map((d) => d.data() as ItemDoc);
        setCache((prev) => ({
          ...prev,
          key: `${householdId}/${listId}`,
          items,
          itemsLoaded: true,
        }));
      },
      (err) => {
        console.warn("[useList] items subscription error", err);
        setCache((prev) => ({
          ...prev,
          key: `${householdId}/${listId}`,
          items: EMPTY,
          itemsLoaded: true,
        }));
      },
    );
    return () => {
      listUnsub();
      itemsUnsub();
    };
  }, [householdId, listId]);

  const fresh = cache.key === key;
  return {
    list: fresh ? cache.list : null,
    items: fresh ? cache.items : EMPTY,
    loading:
      key !== null && !(fresh && cache.listLoaded && cache.itemsLoaded),
  };
}
