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
import type { HouseholdDoc, MemberDoc } from "@/lib/domain/types";

type LeaveInput = {
  db: Firestore;
  householdId: string;
  uid: string;
};

export async function leaveHousehold(input: LeaveInput): Promise<void> {
  const { db, householdId, uid } = input;
  const solo = await runTransaction(db, async (tx) => {
    const hhRef = doc(db, "households", householdId);
    const hhSnap = await tx.get(hhRef);
    if (!hhSnap.exists()) throw new Error("A lista não existe.");
    const hh = hhSnap.data() as HouseholdDoc;

    if (!hh.memberIds.includes(uid)) {
      throw new Error("Não és membro desta lista.");
    }

    const memberRef = doc(db, "households", householdId, "members", uid);
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists()) throw new Error("Membro não encontrado.");
    const member = memberSnap.data() as MemberDoc;

    const otherMembers = hh.memberIds.filter((id) => id !== uid);
    if (
      member.role === "owner" &&
      otherMembers.length > 0 &&
      hh.createdBy === uid
    ) {
      throw new Error("Transfere a ownership antes de saíres.");
    }

    tx.update(hhRef, { memberIds: arrayRemove(uid) });
    tx.delete(memberRef);
    tx.update(doc(db, "users", uid), {
      householdIds: arrayRemove(householdId),
    });

    if (otherMembers.length === 0) {
      tx.delete(hhRef);
      if (hh.inviteCode) {
        tx.delete(doc(db, "inviteCodes", hh.inviteCode));
      }
      return { soloDelete: true };
    }
    return { soloDelete: false };
  });

  if (solo.soloDelete) {
    await cascadeDeleteSubcollections(db, householdId).catch(() => {});
  }
}

type RemoveInput = {
  db: Firestore;
  householdId: string;
  uidToRemove: string;
  actor: { uid: string };
};

export async function removeMember(input: RemoveInput): Promise<void> {
  const { db, householdId, uidToRemove, actor } = input;
  if (uidToRemove === actor.uid) {
    throw new Error("Usa 'sair' para te removeres a ti mesmo.");
  }
  await runTransaction(db, async (tx) => {
    const hhRef = doc(db, "households", householdId);
    const hhSnap = await tx.get(hhRef);
    if (!hhSnap.exists()) throw new Error("A lista não existe.");
    const hh = hhSnap.data() as HouseholdDoc;
    if (hh.createdBy !== actor.uid) {
      throw new Error("Apenas o dono pode remover membros.");
    }
    if (!hh.memberIds.includes(uidToRemove)) {
      throw new Error("Esse utilizador não faz parte da lista.");
    }
    tx.update(hhRef, { memberIds: arrayRemove(uidToRemove) });
    tx.delete(doc(db, "households", householdId, "members", uidToRemove));
    tx.update(doc(db, "users", uidToRemove), {
      householdIds: arrayRemove(householdId),
    });
  });
}

type DeleteInput = {
  db: Firestore;
  householdId: string;
  actor: { uid: string };
};

export async function deleteHousehold(input: DeleteInput): Promise<void> {
  const { db, householdId, actor } = input;

  const { inviteCode, memberIds } = await runTransaction(db, async (tx) => {
    const hhRef = doc(db, "households", householdId);
    const hhSnap = await tx.get(hhRef);
    if (!hhSnap.exists()) throw new Error("A lista não existe.");
    const hh = hhSnap.data() as HouseholdDoc;
    if (hh.createdBy !== actor.uid) {
      throw new Error("Apenas o dono pode apagar a lista.");
    }
    tx.delete(hhRef);
    if (hh.inviteCode) {
      tx.delete(doc(db, "inviteCodes", hh.inviteCode));
    }
    for (const uid of hh.memberIds) {
      tx.update(doc(db, "users", uid), {
        householdIds: arrayRemove(householdId),
      });
      tx.delete(doc(db, "households", householdId, "members", uid));
    }
    return { inviteCode: hh.inviteCode, memberIds: hh.memberIds };
  });

  // Best-effort cleanup of lists + items. Cascade delete across subcollections
  // isn't first-class in Firestore without Cloud Functions; we do as much as
  // we can on the client and tolerate partial failures (docs orphaned under a
  // deleted parent are unreachable via rules and inert).
  await cascadeDeleteSubcollections(db, householdId).catch(() => {});
  void inviteCode;
  void memberIds;
}

async function cascadeDeleteSubcollections(
  db: Firestore,
  householdId: string,
): Promise<void> {
  const listsSnap = await getDocs(
    query(collection(db, "households", householdId, "lists")),
  );
  for (const listDoc of listsSnap.docs) {
    const itemsSnap = await getDocs(
      query(
        collection(
          db,
          "households",
          householdId,
          "lists",
          listDoc.id,
          "items",
        ),
      ),
    );
    const batch = writeBatch(db);
    for (const itemDoc of itemsSnap.docs) {
      batch.delete(itemDoc.ref);
    }
    batch.delete(listDoc.ref);
    await batch.commit();
  }
}
