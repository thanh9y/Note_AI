import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "HVT_NOTES_V1";

export async function loadNotes() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveNotes(notes) {
  await AsyncStorage.setItem(KEY, JSON.stringify(notes));
}
