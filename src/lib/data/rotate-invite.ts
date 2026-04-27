import {
  deleteDoc,
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import { generateInviteCode } from "@/lib/domain/helpers";
import type { ListDoc, MemberDoc } from "@/lib/domain/types";

type Input = {
  db: Firestore;
  listId: string;
  actor: { uid: string };
};

export async function rotateInviteCode(input: Input): Promise<string> {
  const { db, listId, actor } = input;
  const newCode = generateInviteCode();

  const oldCode = await runTransaction(db, async (tx) => {
    const listRef = doc(db, "lists", listId);
    const listSnap = await tx.get(listRef);
    if (!listSnap.exists()) throw new Error("A lista não existe.");
    const list = listSnap.data() as ListDoc;
    const memberSnap = await tx.get(
      doc(db, "lists", listId, "members", actor.uid),
    );
    if (
      !memberSnap.exists() ||
      (memberSnap.data() as MemberDoc).role !== "owner"
    ) {
      throw new Error("Apenas administradores podem regenerar o código.");
    }
    const prev = list.inviteCode;
    tx.update(listRef, { inviteCode: newCode });
    tx.set(doc(db, "inviteCodes", newCode), {
      code: newCode,
      listId,
      createdAt: serverTimestamp(),
    });
    return prev;
  });

  if (oldCode && oldCode !== newCode) {
    await deleteDoc(doc(db, "inviteCodes", oldCode)).catch(() => {});
  }
  return newCode;
}
