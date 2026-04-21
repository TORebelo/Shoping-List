import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";

type Actor = { uid: string; displayName: string; color: string };

type AddInput = {
  db: Firestore;
  listId: string;
  actor: Actor;
  text: string;
};

const MAX_NOTE_LEN = 200;

export async function addNote(input: AddInput): Promise<{ noteId: string }> {
  const text = input.text.trim();
  if (text.length < 1 || text.length > MAX_NOTE_LEN) {
    throw new Error(`As notas têm de ter entre 1 e ${MAX_NOTE_LEN} caracteres.`);
  }
  const { db, listId, actor } = input;
  const notesCol = collection(db, "lists", listId, "notes");
  const noteRef = doc(notesCol);
  await setDoc(noteRef, {
    id: noteRef.id,
    text,
    addedBy: actor.uid,
    addedByName: actor.displayName,
    addedByColor: actor.color,
    createdAt: serverTimestamp(),
  });
  return { noteId: noteRef.id };
}

type DeleteInput = {
  db: Firestore;
  listId: string;
  noteId: string;
};

export async function deleteNote(input: DeleteInput): Promise<void> {
  const { db, listId, noteId } = input;
  await deleteDoc(doc(db, "lists", listId, "notes", noteId));
}
