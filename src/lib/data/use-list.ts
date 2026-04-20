"use client";

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { getDb } from "@/lib/firebase/client";
import type { ItemDoc, ListDoc, MemberDoc } from "@/lib/domain/types";

export type UseListResult = {
  list: ListDoc | null;
  members: MemberDoc[];
  items: ItemDoc[];
  loading: boolean;
};

type Cache = {
  listId: string | null;
  list: ListDoc | null;
  listLoaded: boolean;
  members: MemberDoc[];
  membersLoaded: boolean;
  items: ItemDoc[];
  itemsLoaded: boolean;
};

const EMPTY_MEMBERS: MemberDoc[] = [];
const EMPTY_ITEMS: ItemDoc[] = [];

export function useList(listId: string | null): UseListResult {
  const [cache, setCache] = useState<Cache>({
    listId: null,
    list: null,
    listLoaded: false,
    members: EMPTY_MEMBERS,
    membersLoaded: false,
    items: EMPTY_ITEMS,
    itemsLoaded: false,
  });

  useEffect(() => {
    if (!listId) return;
    const db = getDb();
    const listRef = doc(db, "lists", listId);
    const listUnsub = onSnapshot(
      listRef,
      (snap) => {
        const list = snap.exists() ? (snap.data() as ListDoc) : null;
        setCache((prev) => ({
          ...prev,
          listId,
          list,
          listLoaded: true,
        }));
      },
      (err) => {
        console.warn("[useList] list subscription error", err);
        setCache((prev) => ({
          ...prev,
          listId,
          list: null,
          listLoaded: true,
        }));
      },
    );

    const membersUnsub = onSnapshot(
      collection(db, "lists", listId, "members"),
      (snap) => {
        const members = snap.docs.map((d) => d.data() as MemberDoc);
        setCache((prev) => ({
          ...prev,
          listId,
          members,
          membersLoaded: true,
        }));
      },
      (err) => {
        console.warn("[useList] members subscription error", err);
        setCache((prev) => ({
          ...prev,
          listId,
          members: EMPTY_MEMBERS,
          membersLoaded: true,
        }));
      },
    );

    const itemsUnsub = onSnapshot(
      query(
        collection(db, "lists", listId, "items"),
        orderBy("createdAt", "asc"),
      ),
      (snap) => {
        const items = snap.docs.map(
          (d: QueryDocumentSnapshot) => d.data() as ItemDoc,
        );
        setCache((prev) => ({
          ...prev,
          listId,
          items,
          itemsLoaded: true,
        }));
      },
      (err) => {
        console.warn("[useList] items subscription error", err);
        setCache((prev) => ({
          ...prev,
          listId,
          items: EMPTY_ITEMS,
          itemsLoaded: true,
        }));
      },
    );

    return () => {
      listUnsub();
      membersUnsub();
      itemsUnsub();
    };
  }, [listId]);

  const fresh = cache.listId === listId;
  return {
    list: fresh ? cache.list : null,
    members: fresh ? cache.members : EMPTY_MEMBERS,
    items: fresh ? cache.items : EMPTY_ITEMS,
    loading:
      listId !== null &&
      !(
        fresh &&
        cache.listLoaded &&
        cache.membersLoaded &&
        cache.itemsLoaded
      ),
  };
}
