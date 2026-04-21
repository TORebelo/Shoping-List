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
import type {
  ItemDoc,
  ListDoc,
  MemberDoc,
  NoteDoc,
} from "@/lib/domain/types";

export type UseListResult = {
  list: ListDoc | null;
  members: MemberDoc[];
  items: ItemDoc[];
  notes: NoteDoc[];
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
  notes: NoteDoc[];
  notesLoaded: boolean;
};

const EMPTY_MEMBERS: MemberDoc[] = [];
const EMPTY_ITEMS: ItemDoc[] = [];
const EMPTY_NOTES: NoteDoc[] = [];

export function useList(listId: string | null): UseListResult {
  const [cache, setCache] = useState<Cache>({
    listId: null,
    list: null,
    listLoaded: false,
    members: EMPTY_MEMBERS,
    membersLoaded: false,
    items: EMPTY_ITEMS,
    itemsLoaded: false,
    notes: EMPTY_NOTES,
    notesLoaded: false,
  });

  useEffect(() => {
    if (!listId) return;
    const db = getDb();

    const listUnsub = onSnapshot(
      doc(db, "lists", listId),
      (snap) => {
        const list = snap.exists() ? (snap.data() as ListDoc) : null;
        setCache((prev) => ({ ...prev, listId, list, listLoaded: true }));
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

    const notesUnsub = onSnapshot(
      query(
        collection(db, "lists", listId, "notes"),
        orderBy("createdAt", "asc"),
      ),
      (snap) => {
        const notes = snap.docs.map(
          (d: QueryDocumentSnapshot) => d.data() as NoteDoc,
        );
        setCache((prev) => ({
          ...prev,
          listId,
          notes,
          notesLoaded: true,
        }));
      },
      (err) => {
        console.warn("[useList] notes subscription error", err);
        setCache((prev) => ({
          ...prev,
          listId,
          notes: EMPTY_NOTES,
          notesLoaded: true,
        }));
      },
    );

    return () => {
      listUnsub();
      membersUnsub();
      itemsUnsub();
      notesUnsub();
    };
  }, [listId]);

  const fresh = cache.listId === listId;
  return {
    list: fresh ? cache.list : null,
    members: fresh ? cache.members : EMPTY_MEMBERS,
    items: fresh ? cache.items : EMPTY_ITEMS,
    notes: fresh ? cache.notes : EMPTY_NOTES,
    loading:
      listId !== null &&
      !(
        fresh &&
        cache.listLoaded &&
        cache.membersLoaded &&
        cache.itemsLoaded &&
        cache.notesLoaded
      ),
  };
}
