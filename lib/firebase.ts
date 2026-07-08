import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";

function configValue(value: string | undefined, fallback: string) {
  return value && value.trim().length > 0 ? value : fallback;
}

const firebaseConfig = {
  apiKey: configValue(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    "AIzaSyAlOeAFg3-wybxV3HTDc91EP5yHU4qZ5bg",
  ),
  authDomain: configValue(
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    "kai-thuttu-kitchens.firebaseapp.com",
  ),
  projectId: configValue(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    "kai-thuttu-kitchens",
  ),
  storageBucket: configValue(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    "kai-thuttu-kitchens.firebasestorage.app",
  ),
  messagingSenderId: configValue(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    "227106760448",
  ),
  appId: configValue(
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    "1:227106760448:web:d9775a0accb45b5d4275e5",
  ),
  measurementId: configValue(
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    "G-VZ06CGKEY1",
  ),
};

const firebaseConfigKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

const firebaseConfigValuesByEnvKey: Record<(typeof firebaseConfigKeys)[number], string | undefined> = {
  NEXT_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId,
};

function isRealConfigValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalizedValue = value.toLowerCase();
  return !normalizedValue.startsWith("your_") && !normalizedValue.includes("example");
}

export const missingFirebaseConfigKeys = firebaseConfigKeys.filter(
  (key) => !isRealConfigValue(firebaseConfigValuesByEnvKey[key]),
);

export const isFirebaseConfigured = missingFirebaseConfigKeys.length === 0;

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

function getDatabase(app: FirebaseApp) {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
}

export const db: Firestore | null = firebaseApp ? getDatabase(firebaseApp) : null;
export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const googleProvider = new GoogleAuthProvider();
