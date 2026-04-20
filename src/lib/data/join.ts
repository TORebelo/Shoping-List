import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import type { ListDoc, MemberDoc } from "@/lib/domain/types";
import { pickNextColor } from "@/lib/domain/helpers";

export async function findListByCode(
  db: Firestore,
  code: string,
): Promise<ListDoc | null> {
  const inviteRef = doc(db, "inviteCodes", code);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) return null;
  const { listId } = inviteSnap.data() as { listId: string };
  const listRef = doc(db, "lists", listId);
  const listSnap = await getDoc(listRef);
  if (!listSnap.exists()) return null;
  return listSnap.data() as ListDoc;
}

type JoinInput = {
  db: Firestore;
  code: string;
  user: { uid: string; displayName: string };
};

type JoinResult = {
  listId: string;
  alreadyMember: boolean;
};

export async function joinList(input: JoinInput): Promise<JoinResult> {
  const { db, code, user } = input;
  return runTransaction(db, async (tx) => {
    const inviteRef = doc(db, "inviteCodes", code);
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists()) {
      throw new Error("Código de convite inválido.");
    }
    const { listId } = inviteSnap.data() as { listId: string };

    const listRef = doc(db, "lists", listId);
    const listSnap = await tx.get(listRef);
    if (!listSnap.exists()) {
      throw new Error("A lista já não existe.");
    }
    const list = listSnap.data() as ListDoc;

    if (list.memberIds.includes(user.uid)) {
      return { listId, alreadyMember: true };
    }

    const membersCol = collection(db, "lists", listId, "members");
    const takenColors: string[] = [];
    for (const uid of list.memberIds) {
      const snap = await tx.get(doc(membersCol, uid));
      if (snap.exists()) {
        takenColors.push((snap.data() as MemberDoc).color);
      }
    }
    const color = pickNextColor(takenColors);

    tx.update(listRef, {
      memberIds: arrayUnion(user.uid),
    });
    tx.set(doc(membersCol, user.uid), {
      uid: user.uid,
      displayName: user.displayName,
      color,
      role: "member",
      joinedAt: serverTimestamp(),
    });
    tx.update(doc(db, "users", user.uid), {
      listIds: arrayUnion(listId),
    });

    return { listId, alreadyMember: false };
  });
}
