import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAQ4s2n2luBf1jfOVY6ww_Wc-WwRlbq2UI",
  authDomain: "hvt-note-f4691.firebaseapp.com",
  projectId: "hvt-note-f4691",

  // ✅ bucket đúng theo console của bạn
  storageBucket: "hvt-note-f4691.firebasestorage.app",

  messagingSenderId: "593752628624",
  appId: "1:593752628624:web:550e032d41cb42e5dd6715",
};


export const app = initializeApp(firebaseConfig);

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}
export { auth };

export const db = getFirestore(app);
