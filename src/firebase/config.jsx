import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDzUT8aLP1p1dMHmFORRoY-PZoiHMnmio4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bidd-eec8a.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bidd-eec8a",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bidd-eec8a.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "53849055707",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:53849055707:web:c0fe02b9843cc2085487fe",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-GDMB2123K9",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export { firebaseConfig };
