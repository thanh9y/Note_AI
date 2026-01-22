import * as FileSystem from "expo-file-system/legacy";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { app } from "./firebase";

// ✅ Quan trọng: KHÔNG set bucket firebasestorage.app ở đây
// Firebase sẽ tự lấy storageBucket = hvt-note-f4691.appspot.com từ firebaseConfig
const storage = getStorage(app);

function guessContentType(uri, folder) {
  const lower = (uri || "").toLowerCase();
  if (folder === "audios") return "audio/m4a";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function uploadUriAsync({ uri, userId, folder }) {
  if (!uri) throw new Error("Missing uri");

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });

  const filename = (uri.split("/").pop() || `file_${Date.now()}`)
    .replace(/\?.*$/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  const path = `users/${userId}/${folder}/${Date.now()}_${filename}`;
  const storageRef = ref(storage, path);

  await uploadString(storageRef, base64, "base64", {
    contentType: guessContentType(uri, folder),
  });

  const url = await getDownloadURL(storageRef);
  return { path, url };
}

export async function getUrlFromPath(path) {
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
}
