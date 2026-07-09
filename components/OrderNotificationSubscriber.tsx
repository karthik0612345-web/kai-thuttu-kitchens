"use client";

import { useEffect } from "react";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { firebaseApp } from "@/lib/firebase";
import { saveOrderNotificationToken } from "@/lib/firestore";

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";
const serviceWorkerPath = "/firebase-messaging-sw.js";

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser.");
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration();

  if (existingRegistration) {
    await existingRegistration.update();
    return existingRegistration;
  }

  return navigator.serviceWorker.register(serviceWorkerPath);
}

async function requestToken(registration: ServiceWorkerRegistration) {
  if (!firebaseApp) {
    throw new Error("Firebase is not configured.");
  }

  if (!(await isSupported())) {
    throw new Error("Firebase messaging is not supported in this browser.");
  }

  const messaging = getMessaging(firebaseApp);
  return getToken(messaging, {
    vapidKey: vapidKey || undefined,
    serviceWorkerRegistration: registration,
  });
}

export default function OrderNotificationSubscriber({
  orderId,
}: {
  orderId: string;
}) {
  useEffect(() => {
    if (!orderId) {
      return;
    }

    let unsub: (() => void) | undefined;

    async function activatePush() {
      try {
        if (!("Notification" in window)) {
          return;
        }

        const registration = await registerServiceWorker();

        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }

        if (Notification.permission !== "granted") {
          return;
        }

        const token = await requestToken(registration);

        if (token) {
          await saveOrderNotificationToken(orderId, token);
        }

        const messaging = getMessaging(firebaseApp!);
        unsub = onMessage(messaging, (payload) => {
          if (payload.notification?.title) {
            registration.showNotification(payload.notification.title, {
              body: payload.notification.body,
              icon: payload.notification.icon,
            });
          }
        });
      } catch {
        // silent fail if notifications cannot be enabled
      }
    }

    activatePush();

    return () => {
      unsub?.();
    };
  }, [orderId]);

  return null;
}
