import {
  arrayUnion,
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { generateInviteCode, pickNextColor } from "@/lib/domain/helpers";

type Owner = { uid: string; displayName: string };

type CreateInput = {
  db: Firestore;
  owner: Owner;
  name: string;
};

type CreateResult = { listId: string; inviteCode: string };

export async function createList(input: CreateInput): Promise<CreateResult> {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 60) {
    throw new Error("O nome da lista deve ter entre 1 e 60 caracteres.");
  }

  const { db, owner } = input;
  const listsCol = collection(db, "lists");
  const listRef = doc(listsCol);
  const listId = listRef.id;

  const memberRef = doc(db, "lists", listId, "members", owner.uid);
  const userRef = doc(db, "users", owner.uid);
  const inviteCode = generateInviteCode();
  const inviteRef = doc(db, "inviteCodes", inviteCode);

  const batch = writeBatch(db);
  const now = serverTimestamp();

  batch.set(listRef, {
    id: listId,
    name,
    createdBy: owner.uid,
    memberIds: [owner.uid],
    inviteCode,
    status: "active",
    itemCount: 0,
    createdAt: now,
  });

  batch.set(memberRef, {
    uid: owner.uid,
    displayName: owner.displayName,
    color: pickNextColor([]),
    role: "owner",
    joinedAt: now,
  });

  batch.set(inviteRef, {
    code: inviteCode,
    listId,
    createdAt: now,
  });

  batch.update(userRef, {
    listIds: arrayUnion(listId),
  });

  await batch.commit();

  return { listId, inviteCode };
}
