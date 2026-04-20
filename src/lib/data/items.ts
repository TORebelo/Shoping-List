import {
  collection,
  doc,
  increment,
  serverTimestamp,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { validateItemName, validateQuantity } from "@/lib/domain/helpers";

type Actor = {
  uid: string;
  displayName: string;
  color: string;
};

type Ctx = {
  db: Firestore;
  householdId: string;
  listId: string;
  actor: Actor;
};

type AddInput = Ctx & {
  name: string;
  quantity: string;
};

type AddResult = { itemId: string };

export async function addItem(input: AddInput): Promise<AddResult> {
  const name = input.name.trim();
  if (!validateItemName(name)) {
    throw new Error("O nome do item deve ter entre 1 e 80 caracteres.");
  }
  if (!validateQuantity(input.quantity)) {
    throw new Error("A quantidade deve ter no máximo 20 caracteres.");
  }

  const { db, householdId, listId, actor } = input;
  const itemsCol = collection(
    db,
    "households",
    householdId,
    "lists",
    listId,
    "items",
  );
  const itemRef = doc(itemsCol);
  const listRef = doc(db, "households", householdId, "lists", listId);

  const batch = writeBatch(db);
  batch.set(itemRef, {
    id: itemRef.id,
    name,
    quantity: input.quantity,
    addedBy: actor.uid,
    addedByName: actor.displayName,
    addedByColor: actor.color,
    checked: false,
    checkedBy: null,
    createdAt: serverTimestamp(),
  });
  batch.update(listRef, { itemCount: increment(1) });
  await batch.commit();

  return { itemId: itemRef.id };
}

type ToggleInput = Ctx & {
  itemId: string;
  nextChecked: boolean;
};

export async function toggleItem(input: ToggleInput): Promise<void> {
  const { db, householdId, listId, actor, itemId, nextChecked } = input;
  const itemRef = doc(
    db,
    "households",
    householdId,
    "lists",
    listId,
    "items",
    itemId,
  );
  const batch = writeBatch(db);
  batch.update(itemRef, {
    checked: nextChecked,
    checkedBy: nextChecked ? actor.uid : null,
  });
  await batch.commit();
}

type DeleteInput = Ctx & { itemId: string };

export async function deleteItem(input: DeleteInput): Promise<void> {
  const { db, householdId, listId, itemId } = input;
  const itemRef = doc(
    db,
    "households",
    householdId,
    "lists",
    listId,
    "items",
    itemId,
  );
  const listRef = doc(db, "households", householdId, "lists", listId);
  const batch = writeBatch(db);
  batch.delete(itemRef);
  batch.update(listRef, { itemCount: increment(-1) });
  await batch.commit();
}
