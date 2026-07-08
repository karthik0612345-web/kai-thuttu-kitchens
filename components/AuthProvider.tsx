"use client";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
  missingFirebaseConfigKeys,
} from "@/lib/firebase";

type AuthContextValue = {
  user: User | null;
  isAuthReady: boolean;
  isFirebaseConfigured: boolean;
  missingFirebaseConfigKeys: string[];
  isAdmin: boolean;
  adminEmails: string[];
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(!auth);
  const isAdmin = Boolean(user?.email && adminEmails.includes(user.email.toLowerCase()));

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsAuthReady(true);
    });
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error("Firebase Authentication is not configured.");
    }

    await signInWithPopup(auth, googleProvider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!auth) {
      throw new Error("Firebase Authentication is not configured.");
    }

    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    if (!auth) {
      return;
    }

    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthReady,
        isFirebaseConfigured,
        missingFirebaseConfigKeys,
        isAdmin,
        adminEmails,
        signInWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
