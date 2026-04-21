import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { generateInviteCode, pickNextColor } from "@/lib/domain/helpers";
import type { ItemDoc } from "@/lib/domain/types";

type Input = {
  db: Firestore;
  sourceListId: string;
  owner: { uid: string; displayName: string };
  newName: string;
};

type Result = { listId: string };

/**
 * Creates a new list owned by `owner` with a fresh invite code, seeded with
 * every item from `sourceListId` as unchecked (a clean re-run of the same
 * shopping). Notes and members are intentionally NOT copied — cloning is a
 * "start from this template" action, not a full snapshot.
 */
export async function cloneList(input: Input): Promise<Result> {
  const name = input.newName.trim();
  if (name.length < 1 || name.length > 60) {
    throw new Error("O nome da lista deve ter entre 1 e 60 caracteres.");
  }

  const { db, sourceListId, owner } = input;

  // Read source list + items up front (outside the batch).
  const [sourceListSnap, itemsSnap] = await Promise.all([
    getDoc(doc(db, "lists", sourceListId)),
    getDocs(
      query(
        collection(db, "lists", sourceListId, "items"),
        orderBy("createdAt", "asc"),
      ),
    ),
  ]);
  if (!sourceListSnap.exists()) {
    throw new Error("A lista de origem já não existe.");
  }
  const sourceItems = itemsSnap.docs.map((d) => d.data() as ItemDoc);

  const listsCol = collection(db, "lists");
  const newListRef = doc(listsCol);
  const listId = newListRef.id;
  const inviteCode = generateInviteCode();

  const batch = writeBatch(db);
  const now = serverTimestamp();

  batch.set(newListRef, {
    id: listId,
    name,
    createdBy: owner.uid,
    memberIds: [owner.uid],
    inviteCode,
    status: "active",
    itemCount: sourceItems.length,
    createdAt: now,
  });

  batch.set(doc(db, "lists", listId, "members", owner.uid), {
    uid: owner.uid,
    displayName: owner.displayName,
    color: pickNextColor([]),
    role: "owner",
    joinedAt: now,
  });

  batch.set(doc(db, "inviteCodes", inviteCode), {
    code: inviteCode,
    listId,
    createdAt: now,
  });

  batch.update(doc(db, "users", owner.uid), {
    listIds: arrayUnion(listId),
  });

  for (const src of sourceItems) {
    const itemRef = doc(collection(db, "lists", listId, "items"));
    batch.set(itemRef, {
      id: itemRef.id,
      name: src.name,
      quantity: src.quantity,
      addedBy: owner.uid,
      addedByName: owner.displayName,
      addedByColor: pickNextColor([]),
      checked: false,
      checkedBy: null,
      createdAt: now,
    });
  }

  await batch.commit();
  return { listId };
}
