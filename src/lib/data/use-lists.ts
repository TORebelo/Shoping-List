"use client";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { getDb } from "@/lib/firebase/client";
import type { ListDoc } from "@/lib/domain/types";

export type UseListsResult = {
  lists: ListDoc[];
  loading: boolean;
  refresh: () => Promise<void>;
};

type Cache = {
  uid: string | null;
  lists: ListDoc[];
  loaded: boolean;
};

const EMPTY: ListDoc[] = [];

function sortByCreatedAtDesc(a: ListDoc, b: ListDoc): number {
  const at = (a.createdAt as unknown as { toMillis?(): number })?.toMillis?.();
  const bt = (b.createdAt as unknown as { toMillis?(): number })?.toMillis?.();
  if (at == null && bt == null) return 0;
  if (at == null) return 1;
  if (bt == null) return -1;
  return bt - at;
}

/**
 * One-shot lookup of lists the user belongs to. Intentionally not a realtime
 * listener: Firefox + Firestore emulator + WebChannel hits an SDK assertion
 * ("Unexpected state ve:-1") on collection listeners that no combination of
 * memoryLocalCache / long-polling settings fully avoids. Callers refresh
 * manually after mutations (creates, joins, leaves).
 */
export function useLists(uid: string | null): UseListsResult {
  const [cache, setCache] = useState<Cache>({
    uid: null,
    lists: EMPTY,
    loaded: false,
  });

  const refresh = useCallback(async () => {
    if (!uid) return;
    try {
      const snap = await getDocs(
        query(
          collection(getDb(), "lists"),
          where("memberIds", "array-contains", uid),
        ),
      );
      const lists = snap.docs
        .map((d) => d.data() as ListDoc)
        .sort(sortByCreatedAtDesc);
      setCache({ uid, lists, loaded: true });
    } catch (err) {
      console.warn("[useLists] refresh error", err);
      setCache({ uid, lists: EMPTY, loaded: true });
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    // Fetch-on-mount; setState happens inside refresh's async callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [uid, refresh]);

  const fresh = cache.uid === uid;
  return {
    lists: fresh ? cache.lists : EMPTY,
    loading: uid !== null && !(fresh && cache.loaded),
    refresh,
  };
}
