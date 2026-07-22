import type { Timestamp } from "firebase/firestore";

export const signaturePackageCollection = "signaturePackages";
export const signaturePackageRenewalDays = 30;
export const signaturePackageExpiryNoticeDays = 2;

export const signaturePackagePlans = [
  {
    name: "Balance Box",
    monthlyPrice: 1500,
    description: "1 salad, 1 vegetable dish, and 2 fruit portions.",
  },
  {
    name: "Smart Fuel Box (Grand Box)",
    monthlyPrice: 2399,
    description: "1 salad, 1 vegetable dish, 1 egg, and 3 fruit portions.",
  },
  {
    name: "Power Nourish Box (Royal Box)",
    monthlyPrice: 2799,
    description: "1 salad, 1 vegetable dish, 1 portion of nuts, 1 egg, and 4 fruit portions.",
  },
  {
    name: "Chicken Power Nourish Box (Royal Box)",
    monthlyPrice: 3599,
    description:
      "1 salad, 1 vegetable dish, 1 portion of nuts, 1 egg, boiled chicken, and 4 fruit portions.",
  },
] as const;

export type SignaturePackageStatus = "active" | "expired" | "cancelled";

export type SignaturePackage = {
  id: string;
  packageId: string;
  customerName: string;
  phoneNumber: string;
  planName: string;
  planDescription?: string;
  amount: number;
  status: SignaturePackageStatus;
  startDate?: Timestamp;
  expiryDate?: Timestamp;
  paymentMode: "offline" | "razorpay";
  paymentStatus?: "offline_paid" | "pending" | "paid";
  notificationToken?: string | null;
  notificationTokens?: string[];
  lastExpiryNotificationAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

export function createSignaturePackageId(phoneNumber: string, planName: string) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const planSlug = planName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return `KTK-PKG-${normalizePhoneNumber(phoneNumber)}-${planSlug}-${timestamp}`;
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function toInputDateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function timestampToDate(timestamp?: Timestamp | null) {
  return timestamp?.toDate?.() ?? null;
}

export function formatPackageDate(timestamp?: Timestamp | null) {
  const date = timestampToDate(timestamp);

  if (!date) {
    return "Not set";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getPackageDaysRemaining(expiryDate?: Timestamp | null) {
  const expiry = timestampToDate(expiryDate);

  if (!expiry) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  return Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
}

export function getPackageStatusLabel(pkg: Pick<SignaturePackage, "status" | "expiryDate">) {
  const daysRemaining = getPackageDaysRemaining(pkg.expiryDate);

  if (pkg.status === "cancelled") {
    return "Cancelled";
  }

  if (daysRemaining !== null && daysRemaining < 0) {
    return "Expired";
  }

  if (daysRemaining !== null && daysRemaining <= signaturePackageExpiryNoticeDays) {
    return "Expiring soon";
  }

  return "Active";
}

export function shouldShowRecharge(pkg: Pick<SignaturePackage, "status" | "expiryDate">) {
  const daysRemaining = getPackageDaysRemaining(pkg.expiryDate);
  return pkg.status !== "cancelled" && daysRemaining !== null && daysRemaining <= signaturePackageExpiryNoticeDays;
}
