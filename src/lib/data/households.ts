import {
  arrayUnion,
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import {
  defaultListTitle,
  generateInviteCode,
  pickNextColor,
} from "@/lib/domain/helpers";

type Owner = { uid: string; displayName: string };

type CreateInput = {
  db: Firestore;
  owner: Owner;
  name: string;
};

type CreateResult = {
  householdId: string;
  listId: string;
  inviteCode: string;
};

export async function createHousehold(input: CreateInput): Promise<CreateResult> {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 60) {
    throw new Error("O nome da casa deve ter entre 1 e 60 caracteres.");
  }

  const { db, owner } = input;
  const householdsCol = collection(db, "households");
  const householdRef = doc(db, householdsCol);
  const householdId = householdRef.id;

  const listsCol = collection(db, "households", householdId, "lists");
  const listRef = doc(db, listsCol);
  const listId = listRef.id;

  const memberRef = doc(db, "households", householdId, "members", owner.uid);
  const userRef = doc(db, "users", owner.uid);
  const inviteCode = generateInviteCode();
  const inviteRef = doc(db, "inviteCodes", inviteCode);

  const batch = writeBatch(db);
  const now = serverTimestamp();

  batch.set(householdRef, {
    id: householdId,
    name,
    createdBy: owner.uid,
    memberIds: [owner.uid],
    inviteCode,
    activeListId: listId,
    createdAt: now,
  });

  batch.set(memberRef, {
    uid: owner.uid,
    displayName: owner.displayName,
    color: pickNextColor([]),
    role: "owner",
    joinedAt: now,
  });

  batch.set(listRef, {
    id: listId,
    title: defaultListTitle(new Date()),
    status: "active",
    itemCount: 0,
    createdAt: now,
  });

  batch.set(inviteRef, {
    code: inviteCode,
    householdId,
    createdAt: now,
  });

  batch.update(userRef, {
    householdIds: arrayUnion(householdId),
  });

  await batch.commit();

  return { householdId, listId, inviteCode };
}
