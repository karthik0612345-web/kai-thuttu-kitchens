"use client";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { useAuth } from "@/components/AuthProvider";
import CustomerPhoneAuthForm from "@/components/CustomerPhoneAuthForm";
import { db, firebaseApp } from "@/lib/firebase";
import { saveSignaturePackageNotificationToken } from "@/lib/firestore";
import {
  formatPackageDate,
  getPackageDaysRemaining,
  getPackageStatusLabel,
  shouldShowRecharge,
  signaturePackageCollection,
  signaturePackageExpiryNoticeDays,
  type SignaturePackage,
} from "@/lib/signaturePackages";

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  prefill: {
    name: string;
    contact: string;
  };
  notes: Record<string, string>;
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
  handler: (response: RazorpaySuccessResponse) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

type RazorpayCreatePackageRechargeResponse = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
};

const razorpayCheckoutScript = "https://checkout.razorpay.com/v1/checkout.js";
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";
const serviceWorkerPath = "/firebase-messaging-sw.js";

function loadRazorpayCheckout() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay checkout can only open in the browser."));
      return;
    }

    if (window.Razorpay) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${razorpayCheckoutScript}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load Razorpay checkout.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = razorpayCheckoutScript;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error ?? "Request failed.");
  }

  return result as T;
}

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

function normalizeCustomerPhone(phoneNumber: string | null | undefined) {
  return phoneNumber?.replace(/\D/g, "").slice(-10) ?? "";
}

export default function SignaturePackagesClient() {
  const { user, isAuthReady } = useAuth();
  const [packages, setPackages] = useState<SignaturePackage[]>([]);
  const [message, setMessage] = useState("");
  const [isRecharging, setIsRecharging] = useState("");
  const customerPhone = normalizeCustomerPhone(user?.phoneNumber);

  useEffect(() => {
    if (!db || !customerPhone) {
      setPackages([]);
      return;
    }

    const packagesQuery = query(
      collection(db, signaturePackageCollection),
      where("phoneNumber", "==", customerPhone),
      orderBy("expiryDate", "asc"),
    );

    return onSnapshot(
      packagesQuery,
      (snapshot) => {
        setPackages(
          snapshot.docs.map((packageDocument) => ({
            id: packageDocument.id,
            ...(packageDocument.data() as Omit<SignaturePackage, "id">),
          })),
        );
      },
      (error) => {
        setMessage(error.message);
      },
    );
  }, [customerPhone]);

  const expiringPackages = useMemo(
    () => packages.filter((pkg) => shouldShowRecharge(pkg)),
    [packages],
  );

  useEffect(() => {
    const app = firebaseApp;

    if (!app || !customerPhone || expiringPackages.length === 0) {
      return;
    }

    const messagingApp = app;
    let unsubscribe: (() => void) | undefined;

    async function activatePackageNotifications() {
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

        const firstPackage = expiringPackages[0];
        const notificationKey = `kai-thuttu-package-expiry:${firstPackage.id}`;

        if (!window.localStorage.getItem(notificationKey)) {
          registration.showNotification("Signature Meal Box expiring soon", {
            body: `${firstPackage.planName} expires on ${formatPackageDate(firstPackage.expiryDate)}. Recharge to continue your monthly meals.`,
            icon: "/kai-thuttu-logo.jpeg",
          });
          window.localStorage.setItem(notificationKey, new Date().toISOString());

          if (db) {
            await updateDoc(doc(db, signaturePackageCollection, firstPackage.id), {
              lastExpiryNotificationAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        }

        if (!(await isSupported())) {
          return;
        }

        const messaging = getMessaging(messagingApp);
        const token = await getToken(messaging, {
          vapidKey: vapidKey || undefined,
          serviceWorkerRegistration: registration,
        });

        if (token) {
          await Promise.all(
            expiringPackages.map((pkg) =>
              saveSignaturePackageNotificationToken(pkg.id, token),
            ),
          );
        }

        unsubscribe = onMessage(messaging, (payload) => {
          if (payload.notification?.title) {
            registration.showNotification(payload.notification.title, {
              body: payload.notification.body,
              icon: payload.notification.icon,
            });
          }
        });
      } catch {
        // Notification support is helpful, but the package page must still work without it.
      }
    }

    activatePackageNotifications();

    return () => {
      unsubscribe?.();
    };
  }, [customerPhone, expiringPackages]);

  const rechargePackage = async (pkg: SignaturePackage) => {
    setMessage("");
    setIsRecharging(pkg.id);

    try {
      const createResponse = await fetch("/api/razorpay/create-package-recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id,
          amount: pkg.amount,
        }),
      });
      const razorpayOrder =
        await readJsonResponse<RazorpayCreatePackageRechargeResponse>(createResponse);

      await loadRazorpayCheckout();

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout is not available. Please try again.");
      }

      const paymentResponse = await new Promise<RazorpaySuccessResponse>(
        (resolve, reject) => {
          const RazorpayCheckout = window.Razorpay;

          if (!RazorpayCheckout) {
            reject(new Error("Razorpay checkout is not available. Please try again."));
            return;
          }

          new RazorpayCheckout({
            key: razorpayOrder.keyId,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            name: "Kai Thuttu Kitchens",
            description: `${pkg.planName} monthly recharge`,
            image: "/kai-thuttu-logo.jpeg",
            order_id: razorpayOrder.razorpayOrderId,
            prefill: {
              name: pkg.customerName,
              contact: `+91${pkg.phoneNumber}`,
            },
            notes: {
              packageId: pkg.id,
            },
            theme: {
              color: "#F97316",
            },
            modal: {
              ondismiss: () => reject(new Error("Payment window was closed.")),
            },
            handler: resolve,
          }).open();
        },
      );

      const verifyResponse = await fetch("/api/razorpay/verify-package-recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id,
          razorpayOrderId: paymentResponse.razorpay_order_id,
          razorpayPaymentId: paymentResponse.razorpay_payment_id,
          razorpaySignature: paymentResponse.razorpay_signature,
        }),
      });

      await readJsonResponse<{ success: boolean }>(verifyResponse);
      setMessage(`${pkg.planName} recharged successfully. Your package is extended for 30 days.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to recharge this package.");
    } finally {
      setIsRecharging("");
    }
  };

  if (!isAuthReady) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.06] p-8 text-center text-[#E9B44C]">
        Checking customer login...
      </div>
    );
  }

  if (!user?.phoneNumber) {
    return (
      <div className="mx-auto grid max-w-md gap-5 rounded-lg border border-[#E9B44C]/25 bg-white/[0.06] p-6 sm:p-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#F97316]">
            Customer login
          </p>
          <h2 className="mt-3 text-3xl font-black text-white">
            Login to view your monthly package
          </h2>
        </div>
        <CustomerPhoneAuthForm compact />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
            Signature Meal Boxes
          </p>
          <h1 className="mt-3 text-4xl font-black text-white sm:text-6xl">
            My Monthly Packages
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            View offline monthly package details, expiry date, and recharge your
            Signature Meal Box before it expires.
          </p>
        </div>
        <Link
          href="/menu?category=Signature%20Meal%20Boxes%20Starter"
          className="inline-flex h-12 items-center justify-center rounded-full border border-[#E9B44C]/40 px-6 text-sm font-black text-[#E9B44C] transition hover:bg-[#E9B44C] hover:text-black"
        >
          View meal boxes
        </Link>
      </div>

      {message && (
        <div className="mt-6 rounded-lg border border-[#E9B44C]/25 bg-[#2D1B14] p-4 text-sm font-bold text-[#E9B44C]">
          {message}
        </div>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {packages.map((pkg) => {
          const daysRemaining = getPackageDaysRemaining(pkg.expiryDate);
          const statusLabel = getPackageStatusLabel(pkg);
          const canRecharge = shouldShowRecharge(pkg);

          return (
            <article
              key={pkg.id}
              className="rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.26)] sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E9B44C]">
                    {pkg.packageId}
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-white">
                    {pkg.planName}
                  </h2>
                  {pkg.planDescription && (
                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      {pkg.planDescription}
                    </p>
                  )}
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${
                    canRecharge
                      ? "bg-orange-500/15 text-orange-200"
                      : statusLabel === "Expired"
                        ? "bg-red-500/15 text-red-200"
                        : "bg-emerald-500/15 text-emerald-200"
                  }`}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="mt-5 grid gap-3 rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-zinc-200 sm:grid-cols-2">
                <p>
                  <span className="block text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                    Customer
                  </span>
                  {pkg.customerName}
                </p>
                <p>
                  <span className="block text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                    Monthly Amount
                  </span>
                  Rs. {pkg.amount}
                </p>
                <p>
                  <span className="block text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                    Start Date
                  </span>
                  {formatPackageDate(pkg.startDate)}
                </p>
                <p>
                  <span className="block text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                    Expiry Date
                  </span>
                  {formatPackageDate(pkg.expiryDate)}
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-zinc-300">
                  {daysRemaining === null
                    ? "Expiry not set"
                    : daysRemaining < 0
                      ? `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago`
                      : daysRemaining === 0
                        ? "Expires today"
                        : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`}
                </p>
                <button
                  type="button"
                  onClick={() => rechargePackage(pkg)}
                  disabled={!canRecharge || isRecharging === pkg.id}
                  className={`h-12 rounded-full px-6 text-sm font-black transition ${
                    canRecharge
                      ? "bg-[#F97316] text-white hover:bg-[#E9B44C] hover:text-black"
                      : "cursor-not-allowed bg-white/10 text-zinc-500"
                  }`}
                >
                  {isRecharging === pkg.id
                    ? "Opening payment..."
                    : canRecharge
                      ? "Recharge Monthly Package"
                      : `Recharge opens ${signaturePackageExpiryNoticeDays} days before expiry`}
                </button>
              </div>
            </article>
          );
        })}

        {packages.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-8 text-center lg:col-span-2">
            <h2 className="text-2xl font-black text-white">
              No monthly package found for {user.phoneNumber}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-300">
              If you purchased a Signature Meal Box offline, ask admin to add
              your mobile number in the admin monthly packages section.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
