import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInAnonymously,
  User as FirebaseUser,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID if configured
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Clean undefined values recursively before saving to Firestore and prevent nested arrays
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => {
        // Firestore strictly forbids nested arrays (arrays inside arrays).
        // Convert [lat, lng] coordinate pairs into { lat, lng } objects.
        if (Array.isArray(item)) {
          if (item.length === 2 && typeof item[0] === "number" && typeof item[1] === "number") {
            return { lat: item[0], lng: item[1] };
          }
          // For other nested arrays, map each inner element recursively to an object or value
          return { items: cleanForFirestore(item) };
        }
        return cleanForFirestore(item);
      }) as any;
  }
  if (typeof data === "object" && !(data instanceof Date)) {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        result[key] = cleanForFirestore(value);
      }
    }
    return result;
  }
  return data;
}

export {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  addDoc,
  firebaseSignOut,
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
};
export type { FirebaseUser };
