"use client";

import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";

export const orderAvailabilityMessage =
  "Online ordering is temporarily paused. Please contact Kai Thuttu Kitchens on WhatsApp for urgent catering or order enquiries.";

type OrderAvailability = {
  isPaused: boolean;
  message: string;
  isLoading: boolean;
};

const defaultAvailability: OrderAvailability = {
  isPaused: false,
  message: orderAvailabilityMessage,
  isLoading: true,
};

export function useOrderAvailability() {
  const [availability, setAvailability] = useState<OrderAvailability>(defaultAvailability);

  useEffect(() => {
    if (!db) {
      setAvailability((current) => ({ ...current, isLoading: false }));
      return;
    }

    return onSnapshot(
      doc(db, "settings", "orderAvailability"),
      (snapshot) => {
        const data = snapshot.data();

        setAvailability({
          isPaused: data?.isPaused === true,
          message:
            typeof data?.message === "string" && data.message.trim()
              ? data.message
              : orderAvailabilityMessage,
          isLoading: false,
        });
      },
      () => {
        setAvailability((current) => ({ ...current, isLoading: false }));
      },
    );
  }, []);

  return availability;
}

export async function setOrdersPaused(isPaused: boolean) {
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await setDoc(
    doc(db, "settings", "orderAvailability"),
    {
      isPaused,
      message: orderAvailabilityMessage,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
