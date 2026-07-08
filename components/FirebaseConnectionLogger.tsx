"use client";

import { useEffect } from "react";
import {
  firebaseApp,
  isFirebaseConfigured,
  missingFirebaseConfigKeys,
} from "@/lib/firebase";

export default function FirebaseConnectionLogger() {
  useEffect(() => {
    if (isFirebaseConfigured && firebaseApp) {
      console.log("Firebase connected successfully", {
        projectId: firebaseApp.options.projectId,
        authDomain: firebaseApp.options.authDomain,
      });
      return;
    }

    console.warn("Firebase is not connected. Missing config:", missingFirebaseConfigKeys);
  }, []);

  return null;
}
