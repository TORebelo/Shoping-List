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

export function useHouseholds(uid: string | null): UseHouseholdsResult {
  const [households, setHouseholds] = useState<HouseholdDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(uid !== null);

  useEffect(() => {
    if (!uid) {
      setHouseholds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(getDb(), "households"),
      where("memberIds", "array-contains", uid),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(
        (d: QueryDocumentSnapshot) => d.data() as HouseholdDoc,
      );
      setHouseholds(docs);
      setLoading(false);
    });
  }, [uid]);

  return { households, loading };
}
