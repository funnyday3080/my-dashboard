import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function initFirebase() {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  return { app, db: getFirestore(app, "default"), auth: getAuth(app) };
}

const firebase = typeof window !== "undefined"
  ? initFirebase()
  : { app: null, db: null, auth: null };

export const db = firebase.db as Firestore;
export const auth = firebase.auth as Auth;
export default firebase.app as FirebaseApp;
