import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import { defaultListTitle } from "@/lib/domain/helpers";
import type { HouseholdDoc } from "@/lib/domain/types";

type Input = {
  db: Firestore;
  householdId: string;
  actor: { uid: string };
};

type Result = { newListId: string };

export async function closeActiveList(input: Input): Promise<Result> {
  const { db, householdId, actor } = input;

  return runTransaction(db, async (tx) => {
    const hhRef = doc(db, "households", householdId);
    const hhSnap = await tx.get(hhRef);
    if (!hhSnap.exists()) throw new Error("A lista não existe.");
    const hh = hhSnap.data() as HouseholdDoc;

    if (!hh.memberIds.includes(actor.uid)) {
      throw new Error("Tens de ser membro da lista.");
    }

    const activeListRef = doc(
      db,
      "households",
      householdId,
      "lists",
      hh.activeListId,
    );
    const activeListSnap = await tx.get(activeListRef);
    if (!activeListSnap.exists()) {
      throw new Error("Lista ativa não encontrada.");
    }

    const listsCol = collection(db, "households", householdId, "lists");
    const newListRef = doc(listsCol);
    const newListId = newListRef.id;
    const now = serverTimestamp();

    tx.update(activeListRef, {
      status: "closed",
      closedAt: now,
    });

    tx.set(newListRef, {
      id: newListId,
      title: defaultListTitle(new Date()),
      status: "active",
      itemCount: 0,
      createdAt: now,
    });

    tx.update(hhRef, {
      activeListId: newListId,
    });

    return { newListId };
  });
}
