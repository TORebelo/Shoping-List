import {
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import type { ListDoc } from "@/lib/domain/types";

type Input = {
  db: Firestore;
  listId: string;
  actor: { uid: string };
};

/**
 * Marks an active list as closed. Does not create a new list — users start
 * a fresh list from the dashboard when they're ready. Already-closed lists
 * are rejected so the UI never accidentally rewrites closedAt.
 */
export async function closeList(input: Input): Promise<void> {
  const { db, listId, actor } = input;

  await runTransaction(db, async (tx) => {
    const listRef = doc(db, "lists", listId);
    const listSnap = await tx.get(listRef);
    if (!listSnap.exists()) throw new Error("A lista não existe.");
    const list = listSnap.data() as ListDoc;

    if (!list.memberIds.includes(actor.uid)) {
      throw new Error("Tens de ser membro da lista.");
    }
    if (list.status === "closed") {
      throw new Error("A lista já está fechada.");
    }

    tx.update(listRef, {
      status: "closed",
      closedAt: serverTimestamp(),
    });
  });
}
