import { db } from "../firebase/firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";

export function notesCol(uid) {
  return collection(db, "users", uid, "notes");
}

export function listenNotes(uid, cb) {
  const q = query(notesCol(uid), orderBy("updatedAt", "desc"));

  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      cb(data);
    },
    (err) => {
      console.log("listenNotes error:", err);
      cb([]);
    }
  );
}

export async function addNote(uid, note) {
  await addDoc(notesCol(uid), note);
}

export async function updateNote(uid, id, patch) {
  await updateDoc(doc(db, "users", uid, "notes", id), patch);
}

export async function removeNote(uid, id) {
  await deleteDoc(doc(db, "users", uid, "notes", id));
}

export async function setNote(uid, id, data) {
  await setDoc(doc(db, "users", uid, "notes", id), data, { merge: true });
}
