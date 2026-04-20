"use client";

import { doc, onSnapshot, collection } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getDb } from "@/lib/firebase/client";
import type { HouseholdDoc, MemberDoc } from "@/lib/domain/types";

type Cache = {
  householdId: string | null;
  household: HouseholdDoc | null;
  householdLoaded: boolean;
  members: MemberDoc[];
  membersLoaded: boolean;
};

const EMPTY_MEMBERS: MemberDoc[] = [];

export type UseHouseholdResult = {
  household: HouseholdDoc | null;
  members: MemberDoc[];
  loading: boolean;
};

export function useHousehold(householdId: string | null): UseHouseholdResult {
  const [cache, setCache] = useState<Cache>({
    householdId: null,
    household: null,
    householdLoaded: false,
    members: EMPTY_MEMBERS,
    membersLoaded: false,
  });

  useEffect(() => {
    if (!householdId) return;
    const db = getDb();
    const hhRef = doc(db, "households", householdId);
    const hhUnsub = onSnapshot(
      hhRef,
      (snap) => {
        const household = snap.exists() ? (snap.data() as HouseholdDoc) : null;
        setCache((prev) => ({
          ...prev,
          householdId,
          household,
          householdLoaded: true,
        }));
      },
      (err) => {
        console.warn("[useHousehold] household subscription error", err);
        setCache((prev) => ({
          ...prev,
          householdId,
          household: null,
          householdLoaded: true,
        }));
      },
    );
    const membersCol = collection(db, "households", householdId, "members");
    const membersUnsub = onSnapshot(
      membersCol,
      (snap) => {
        const members = snap.docs.map((d) => d.data() as MemberDoc);
        setCache((prev) => ({
          ...prev,
          householdId,
          members,
          membersLoaded: true,
        }));
      },
      (err) => {
        console.warn("[useHousehold] members subscription error", err);
        setCache((prev) => ({
          ...prev,
          householdId,
          members: EMPTY_MEMBERS,
          membersLoaded: true,
        }));
      },
    );
    return () => {
      hhUnsub();
      membersUnsub();
    };
  }, [householdId]);

  const fresh = cache.householdId === householdId;
  return {
    household: fresh ? cache.household : null,
    members: fresh ? cache.members : EMPTY_MEMBERS,
    loading:
      householdId !== null &&
      !(fresh && cache.householdLoaded && cache.membersLoaded),
  };
}
