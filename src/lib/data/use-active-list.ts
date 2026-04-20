"use client";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { getDb } from "@/lib/firebase/client";
import type { ItemDoc, ListDoc } from "@/lib/domain/types";

export type UseActiveListResult = {
  list: ListDoc | null;
  items: ItemDoc[];
  loading: boolean;
};

type Cache = {
  householdId: string | null;
  list: ListDoc | null;
  listLoaded: boolean;
  items: ItemDoc[];
  itemsLoaded: boolean;
};

const EMPTY_ITEMS: ItemDoc[] = [];

export function useActiveList(
  householdId: string | null,
): UseActiveListResult {
  const [cache, setCache] = useState<Cache>({
    householdId: null,
    list: null,
    listLoaded: false,
    items: EMPTY_ITEMS,
    itemsLoaded: false,
  });

  useEffect(() => {
    if (!householdId) return;
    const db = getDb();
    const listsQuery = query(
      collection(db, "households", householdId, "lists"),
      where("status", "==", "active"),
    );
    let itemsUnsub: (() => void) | null = null;
    let currentListId: string | null = null;

    const listsUnsub = onSnapshot(
      listsQuery,
      (snap) => {
        const first = snap.docs[0];
        const list = first ? (first.data() as ListDoc) : null;
        setCache((prev) => ({
          ...prev,
          householdId,
          list,
          listLoaded: true,
          items: list && list.id === currentListId ? prev.items : EMPTY_ITEMS,
          itemsLoaded: list
            ? list.id === currentListId
              ? prev.itemsLoaded
              : false
            : true,
        }));

        if (!list) {
          currentListId = null;
          if (itemsUnsub) {
            itemsUnsub();
            itemsUnsub = null;
          }
          return;
        }

        if (list.id === currentListId) return;
        currentListId = list.id;
        if (itemsUnsub) itemsUnsub();
        const itemsQuery = query(
          collection(db, "households", householdId, "lists", list.id, "items"),
          orderBy("createdAt", "asc"),
        );
        itemsUnsub = onSnapshot(
          itemsQuery,
          (itemsSnap) => {
            const items = itemsSnap.docs.map(
              (d: QueryDocumentSnapshot) => d.data() as ItemDoc,
            );
            setCache((prev) => ({
              ...prev,
              householdId,
              items,
              itemsLoaded: true,
            }));
          },
          (err) => {
            console.warn("[useActiveList] items subscription error", err);
            setCache((prev) => ({
              ...prev,
              householdId,
              items: EMPTY_ITEMS,
              itemsLoaded: true,
            }));
          },
        );
      },
      (err) => {
        console.warn("[useActiveList] lists subscription error", err);
        setCache((prev) => ({
          ...prev,
          householdId,
          list: null,
          listLoaded: true,
          items: EMPTY_ITEMS,
          itemsLoaded: true,
        }));
      },
    );

    return () => {
      listsUnsub();
      if (itemsUnsub) itemsUnsub();
    };
  }, [householdId]);

  const fresh = cache.householdId === householdId;
  const list = fresh ? cache.list : null;
  const items = fresh ? cache.items : EMPTY_ITEMS;
  const loading =
    householdId !== null &&
    !(fresh && cache.listLoaded && (list === null || cache.itemsLoaded));
  return { list, items, loading };
}
