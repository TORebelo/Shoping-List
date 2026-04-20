"use client";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { getDb } from "@/lib/firebase/client";
import type { ListDoc } from "@/lib/domain/types";

type Cache = {
  householdId: string | null;
  lists: ListDoc[];
  loaded: boolean;
};

const EMPTY: ListDoc[] = [];

export type UseHistoryResult = {
  lists: ListDoc[];
  loading: boolean;
};

export function useHistory(householdId: string | null): UseHistoryResult {
  const [cache, setCache] = useState<Cache>({
    householdId: null,
    lists: EMPTY,
    loaded: false,
  });

  useEffect(() => {
    if (!householdId) return;
    const q = query(
      collection(getDb(), "households", householdId, "lists"),
      where("status", "==", "closed"),
      orderBy("closedAt", "desc"),
    );
    return onSnapshot(q, (snap) => {
      const lists = snap.docs.map((d) => d.data() as ListDoc);
      setCache({ householdId, lists, loaded: true });
    });
  }, [householdId]);

  const fresh = cache.householdId === householdId;
  return {
    lists: fresh ? cache.lists : EMPTY,
    loading: householdId !== null && !(fresh && cache.loaded),
  };
}
