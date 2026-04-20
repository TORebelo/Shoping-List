import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import type { HouseholdDoc, MemberDoc } from "@/lib/domain/types";
import { pickNextColor } from "@/lib/domain/helpers";

export async function findHouseholdByCode(
  db: Firestore,
  code: string,
): Promise<HouseholdDoc | null> {
  const inviteRef = doc(db, "inviteCodes", code);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) return null;
  const { householdId } = inviteSnap.data() as { householdId: string };
  const hhRef = doc(db, "households", householdId);
  const hhSnap = await getDoc(hhRef);
  if (!hhSnap.exists()) return null;
  return hhSnap.data() as HouseholdDoc;
}

type JoinInput = {
  db: Firestore;
  code: string;
  user: { uid: string; displayName: string };
};

type JoinResult = {
  householdId: string;
  alreadyMember: boolean;
};

export async function joinHousehold(input: JoinInput): Promise<JoinResult> {
  const { db, code, user } = input;
  return runTransaction(db, async (tx) => {
    const inviteRef = doc(db, "inviteCodes", code);
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists()) {
      throw new Error("Código de convite inválido.");
    }
    const { householdId } = inviteSnap.data() as { householdId: string };

    const hhRef = doc(db, "households", householdId);
    const hhSnap = await tx.get(hhRef);
    if (!hhSnap.exists()) {
      throw new Error("A lista já não existe.");
    }
    const hh = hhSnap.data() as HouseholdDoc;

    if (hh.memberIds.includes(user.uid)) {
      return { householdId, alreadyMember: true };
    }

    // Members collection lookup for taken colors.
    const membersCol = collection(db, "households", householdId, "members");
    // We cannot query inside a transaction; infer taken colors from a read on
    // each existing member. In practice member count ≤ 20 so this scales.
    const takenColors: string[] = [];
    for (const uid of hh.memberIds) {
      const snap = await tx.get(doc(membersCol, uid));
      if (snap.exists()) {
        takenColors.push((snap.data() as MemberDoc).color);
      }
    }
    const color = pickNextColor(takenColors);

    tx.update(hhRef, {
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
      householdIds: arrayUnion(householdId),
    });

    return { householdId, alreadyMember: false };
  });
}
