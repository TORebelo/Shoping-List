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
import type { HouseholdDoc } from "@/lib/domain/types";

export type UseHouseholdsResult = {
  households: HouseholdDoc[];
  loading: boolean;
};

type Cache = {
  uid: string | null;
  households: HouseholdDoc[];
  loaded: boolean;
};

const EMPTY: HouseholdDoc[] = [];

export function useHouseholds(uid: string | null): UseHouseholdsResult {
  const [cache, setCache] = useState<Cache>({
    uid: null,
    households: EMPTY,
    loaded: false,
  });

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(getDb(), "households"),
      where("memberIds", "array-contains", uid),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        const households = snap.docs.map(
          (d: QueryDocumentSnapshot) => d.data() as HouseholdDoc,
        );
        setCache({ uid, households, loaded: true });
      },
      (err) => {
        console.warn("[useHouseholds] subscription error", err);
        setCache({ uid, households: EMPTY, loaded: true });
      },
    );
  }, [uid]);

  const fresh = cache.uid === uid && cache.loaded;
  return {
    households: fresh ? cache.households : EMPTY,
    loading: uid !== null && !fresh,
  };
}
