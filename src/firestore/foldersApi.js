import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export function foldersCol(uid) {
  return collection(db, "users", uid, "folders");
}

export function listenFolders(uid, cb) {
  const q = query(foldersCol(uid), orderBy("name", "asc"));

  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      cb(data);
    },
    (err) => {
      console.log("listenFolders error:", err);
      cb([]);
    }
  );
}

export async function addFolder(uid, name) {
  await addDoc(foldersCol(uid), {
    name: name.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function updateFolder(uid, id, name) {
  await updateDoc(doc(db, "users", uid, "folders", id), {
    name: name.trim(),
    updatedAt: Date.now(),
  });
}

export async function removeFolder(uid, id) {
  await deleteDoc(doc(db, "users", uid, "folders", id));
}