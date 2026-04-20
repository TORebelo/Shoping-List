"use client";

import {
  collection,
  onSnapshot,
  query,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { getDb } from "@/lib/firebase/client";
import type { ListDoc } from "@/lib/domain/types";

export type UseListsResult = {
  lists: ListDoc[];
  loading: boolean;
};

type Cache = {
  uid: string | null;
  lists: ListDoc[];
  loaded: boolean;
};

const EMPTY: ListDoc[] = [];

export function useLists(uid: string | null): UseListsResult {
  const [cache, setCache] = useState<Cache>({
    uid: null,
    lists: EMPTY,
    loaded: false,
  });

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(getDb(), "lists"),
      where("memberIds", "array-contains", uid),
    );
    return onSnapshot(
      q,
      (snap) => {
        const lists = snap.docs
          .map((d: QueryDocumentSnapshot) => d.data() as ListDoc)
          .sort((a, b) => {
            const at = (a.createdAt as unknown as { toMillis?(): number })
              ?.toMillis?.();
            const bt = (b.createdAt as unknown as { toMillis?(): number })
              ?.toMillis?.();
            if (at == null && bt == null) return 0;
            if (at == null) return 1;
            if (bt == null) return -1;
            return bt - at;
          });
        setCache({ uid, lists, loaded: true });
      },
      (err) => {
        console.warn("[useLists] subscription error", err);
        setCache({ uid, lists: EMPTY, loaded: true });
      },
    );
  }, [uid]);

  const fresh = cache.uid === uid;
  return {
    lists: fresh ? cache.lists : EMPTY,
    loading: uid !== null && !(fresh && cache.loaded),
  };
}
