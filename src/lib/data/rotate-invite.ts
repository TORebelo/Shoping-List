import {
  deleteDoc,
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import { generateInviteCode } from "@/lib/domain/helpers";
import type { HouseholdDoc } from "@/lib/domain/types";

type Input = {
  db: Firestore;
  householdId: string;
  actor: { uid: string };
};

export async function rotateInviteCode(input: Input): Promise<string> {
  const { db, householdId, actor } = input;
  const newCode = generateInviteCode();

  const oldCode = await runTransaction(db, async (tx) => {
    const hhRef = doc(db, "households", householdId);
    const hhSnap = await tx.get(hhRef);
    if (!hhSnap.exists()) throw new Error("A lista não existe.");
    const hh = hhSnap.data() as HouseholdDoc;
    if (hh.createdBy !== actor.uid) {
      throw new Error("Apenas o dono pode regenerar o código.");
    }
    const prev = hh.inviteCode;
    tx.update(hhRef, { inviteCode: newCode });
    tx.set(doc(db, "inviteCodes", newCode), {
      code: newCode,
      householdId,
      createdAt: serverTimestamp(),
    });
    return prev;
  });

  if (oldCode && oldCode !== newCode) {
    // Best-effort delete of the old mapping; a failure here just leaves a
    // dangling invite doc which rules will block joins through anyway.
    await deleteDoc(doc(db, "inviteCodes", oldCode)).catch(() => {});
  }
  return newCode;
}
