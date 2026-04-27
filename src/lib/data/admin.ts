import {
  arrayRemove,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  writeBatch,
  type Firestore,
  type Transaction,
} from "firebase/firestore";
import type { ListDoc, MemberDoc } from "@/lib/domain/types";

async function loadActorMember(
  tx: Transaction,
  db: Firestore,
  listId: string,
  uid: string,
): Promise<MemberDoc> {
  const snap = await tx.get(doc(db, "lists", listId, "members", uid));
  if (!snap.exists()) throw new Error("Não és membro desta lista.");
  return snap.data() as MemberDoc;
}

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

    // Read every member doc up-front (Firestore transactions disallow
    // reads after writes), so we can both hydrate the leaver's role and
    // check whether another owner remains in a single read pass.
    const memberSnaps = await Promise.all(
      list.memberIds.map((id) =>
        tx.get(doc(db, "lists", listId, "members", id)),
      ),
    );
    const memberByUid = new Map<string, MemberDoc>();
    for (const snap of memberSnaps) {
      if (snap.exists()) {
        const data = snap.data() as MemberDoc;
        memberByUid.set(data.uid, data);
      }
    }

    const member = memberByUid.get(uid);
    if (!member) throw new Error("Membro não encontrado.");

    const otherMemberIds = list.memberIds.filter((id) => id !== uid);

    if (member.role === "owner" && otherMemberIds.length > 0) {
      const otherOwnerExists = otherMemberIds.some(
        (id) => memberByUid.get(id)?.role === "owner",
      );
      if (!otherOwnerExists) {
        throw new Error("Promove outro membro a administrador antes de saíres.");
      }
    }

    const memberRef = doc(db, "lists", listId, "members", uid);
    tx.update(listRef, { memberIds: arrayRemove(uid) });
    tx.delete(memberRef);
    tx.update(doc(db, "users", uid), {
      listIds: arrayRemove(listId),
    });

    if (otherMemberIds.length === 0) {
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
    const actorMember = await loadActorMember(tx, db, listId, actor.uid);
    if (actorMember.role !== "owner") {
      throw new Error("Apenas administradores podem remover membros.");
    }
    if (!list.memberIds.includes(uidToRemove)) {
      throw new Error("Esse utilizador não faz parte da lista.");
    }
    tx.update(listRef, { memberIds: arrayRemove(uidToRemove) });
    tx.delete(doc(db, "lists", listId, "members", uidToRemove));
    tx.update(doc(db, "users", uidToRemove), {
      listIds: arrayRemove(listId),
    });
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
    const actorMember = await loadActorMember(tx, db, listId, actor.uid);
    if (actorMember.role !== "owner") {
      throw new Error("Apenas administradores podem apagar a lista.");
    }
    tx.delete(listRef);
    if (list.inviteCode) {
      tx.delete(doc(db, "inviteCodes", list.inviteCode));
    }
    for (const uid of list.memberIds) {
      tx.update(doc(db, "users", uid), {
        listIds: arrayRemove(listId),
      });
      tx.delete(doc(db, "lists", listId, "members", uid));
    }
  });

  await cascadeDeleteItems(db, listId).catch(() => {});
}

type PromoteInput = {
  db: Firestore;
  listId: string;
  targetUid: string;
  role: "owner" | "member";
  actor: { uid: string };
};

export async function setMemberRole(input: PromoteInput): Promise<void> {
  const { db, listId, targetUid, role, actor } = input;
  await runTransaction(db, async (tx) => {
    const listRef = doc(db, "lists", listId);
    const listSnap = await tx.get(listRef);
    if (!listSnap.exists()) throw new Error("A lista não existe.");
    const list = listSnap.data() as ListDoc;
    if (!list.memberIds.includes(targetUid)) {
      throw new Error("Esse utilizador não faz parte da lista.");
    }

    const memberSnaps = await Promise.all(
      list.memberIds.map((id) =>
        tx.get(doc(db, "lists", listId, "members", id)),
      ),
    );
    const memberByUid = new Map<string, MemberDoc>();
    for (const snap of memberSnaps) {
      if (snap.exists()) {
        const data = snap.data() as MemberDoc;
        memberByUid.set(data.uid, data);
      }
    }

    const actorMember = memberByUid.get(actor.uid);
    if (!actorMember || actorMember.role !== "owner") {
      throw new Error("Apenas administradores podem alterar permissões.");
    }
    const target = memberByUid.get(targetUid);
    if (!target) throw new Error("Membro não encontrado.");
    if (target.role === role) return;

    if (target.role === "owner" && role === "member") {
      const otherOwnerExists = list.memberIds.some(
        (id) => id !== targetUid && memberByUid.get(id)?.role === "owner",
      );
      if (!otherOwnerExists) {
        throw new Error(
          "Tem de haver pelo menos um administrador na lista.",
        );
      }
    }

    tx.update(doc(db, "lists", listId, "members", targetUid), { role });
  });
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
