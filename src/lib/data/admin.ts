import {
  arrayRemove,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { ListDoc, MemberDoc } from "@/lib/domain/types";

type LeaveInput = {
  db: Firestore;
  listId: string;
  uid: string;
};

export async function leaveList(input: LeaveInput): Promise<void> {
  const { db, listId, uid } = input;
  const solo = await runTransaction(db, async (tx) => {
    const listRef = doc(db, "lists", listId);
    const listSnap = await tx.get(listRef);
    if (!listSnap.exists()) throw new Error("A lista não existe.");
    const list = listSnap.data() as ListDoc;

    if (!list.memberIds.includes(uid)) {
      throw new Error("Não és membro desta lista.");
    }

    const memberRef = doc(db, "lists", listId, "members", uid);
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists()) throw new Error("Membro não encontrado.");
    const member = memberSnap.data() as MemberDoc;

    const otherMembers = list.memberIds.filter((id) => id !== uid);
    const isSoleOwner =
      member.role === "owner" &&
      otherMembers.length > 0 &&
      list.createdBy === uid;

    tx.update(doc(db, "users", uid), {
      listIds: arrayRemove(listId),
    });

    if (isSoleOwner) {
      // Auto-promote the first remaining member so the list keeps an owner.
      const heirUid = otherMembers[0];
      tx.update(listRef, {
        memberIds: arrayRemove(uid),
        createdBy: heirUid,
      });
      tx.update(doc(db, "lists", listId, "members", heirUid), {
        role: "owner",
      });
      tx.delete(memberRef);
      return { soloDelete: false };
    }

    tx.update(listRef, { memberIds: arrayRemove(uid) });
    tx.delete(memberRef);

    if (otherMembers.length === 0) {
      tx.delete(listRef);
      if (list.inviteCode) {
        tx.delete(doc(db, "inviteCodes", list.inviteCode));
      }
      return { soloDelete: true };
    }
    return { soloDelete: false };
  });

  if (solo.soloDelete) {
    await cascadeDeleteItems(db, listId).catch(() => {});
  }
}

type RemoveInput = {
  db: Firestore;
  listId: string;
  uidToRemove: string;
  actor: { uid: string };
};

export async function removeMember(input: RemoveInput): Promise<void> {
  const { db, listId, uidToRemove, actor } = input;
  if (uidToRemove === actor.uid) {
    throw new Error("Usa 'sair' para te removeres a ti mesmo.");
  }
  await runTransaction(db, async (tx) => {
    const listRef = doc(db, "lists", listId);
    const listSnap = await tx.get(listRef);
    if (!listSnap.exists()) throw new Error("A lista não existe.");
    const list = listSnap.data() as ListDoc;
    if (list.createdBy !== actor.uid) {
      throw new Error("Apenas o dono pode remover membros.");
    }
    if (!list.memberIds.includes(uidToRemove)) {
      throw new Error("Esse utilizador não faz parte da lista.");
    }
    tx.update(listRef, { memberIds: arrayRemove(uidToRemove) });
    tx.delete(doc(db, "lists", listId, "members", uidToRemove));
    // Rules forbid writing another user's doc; leave their cached listIds
    // stale — harmless because membership is authoritative via memberIds.
  });
}

type DeleteInput = {
  db: Firestore;
  listId: string;
  actor: { uid: string };
};

export async function deleteList(input: DeleteInput): Promise<void> {
  const { db, listId, actor } = input;

  await runTransaction(db, async (tx) => {
    const listRef = doc(db, "lists", listId);
    const listSnap = await tx.get(listRef);
    if (!listSnap.exists()) throw new Error("A lista não existe.");
    const list = listSnap.data() as ListDoc;
    if (list.createdBy !== actor.uid) {
      throw new Error("Apenas o dono pode apagar a lista.");
    }
    tx.delete(listRef);
    if (list.inviteCode) {
      tx.delete(doc(db, "inviteCodes", list.inviteCode));
    }
    // Only clear the actor's own users/{uid}.listIds — rules forbid writing
    // to another user's doc. Other members end up with a stale listId in
    // their cache, but it's harmless: their useLists query won't return the
    // deleted list, and the UI never tries to read users.listIds directly.
    tx.update(doc(db, "users", actor.uid), {
      listIds: arrayRemove(listId),
    });
    for (const uid of list.memberIds) {
      tx.delete(doc(db, "lists", listId, "members", uid));
    }
  });

  await cascadeDeleteItems(db, listId).catch(() => {});
}

async function cascadeDeleteItems(
  db: Firestore,
  listId: string,
): Promise<void> {
  const itemsSnap = await getDocs(
    query(collection(db, "lists", listId, "items")),
  );
  if (itemsSnap.empty) return;
  const batch = writeBatch(db);
  for (const itemDoc of itemsSnap.docs) {
    batch.delete(itemDoc.ref);
  }
  await batch.commit();
}
