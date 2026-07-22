import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentReference,
  type Timestamp as FirestoreTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { OrderStatus } from "@/lib/orderStatus";
import {
  addDays,
  createSignaturePackageId,
  signaturePackageCollection,
  signaturePackageDurations,
  signaturePackagePlans,
  type SignaturePackagePeriod,
} from "@/lib/signaturePackages";

export type OrderItem = {
  name: string;
  category: string;
  price: string;
  priceValue: number;
  quantity: number;
  lineTotal: number;
};

export type OrderDeliveryPerson = {
  name: string;
  phoneNumber: string;
};

export type OrderStatusHistoryEntry = {
  status: OrderStatus;
  timestamp: FirestoreTimestamp;
};

export type CreateOrderInput = {
  customerName: string;
  phoneNumber: string;
  deliveryAddress: string;
  landmark: string;
  googleMapLocation: string;
  paymentOption: "cod" | "razorpay";
  items: OrderItem[];
  subtotal: number;
  discount: number;
  offer?: {
    code: string;
    title: string;
    amount: number;
  } | null;
  total: number;
};

export type CreateOrderResult = {
  orderId: string;
  orderReference: DocumentReference;
};

const orderWriteTimeoutMs = 12000;

function generateOrderId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `KTK-${timestamp}-${random}`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(
        new Error(
          "Order save is taking too long. Check your internet connection and Firestore rules, then try again.",
        ),
      );
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
}

export async function createOrder(order: CreateOrderInput): Promise<CreateOrderResult> {
  if (!db) {
    throw new Error("Firebase is not configured. Add your Firebase environment variables.");
  }

  const orderId = generateOrderId();
  const orderReference = doc(collection(db, "orders"), orderId);

  try {
    await withTimeout(
      setDoc(orderReference, {
        orderId,
        customerDetails: {
          name: order.customerName,
          phoneNumber: order.phoneNumber,
          deliveryAddress: order.deliveryAddress,
          landmark: order.landmark,
          googleMapLocation: order.googleMapLocation,
        },
        orderedItems: order.items,
        paymentMethod: order.paymentOption,
        subtotal: order.subtotal,
        discount: order.discount,
        offer: order.offer ?? null,
        total: order.total,
        status: "pending",
        paymentStatus: order.paymentOption === "cod" ? "cash_on_delivery" : "pending",
        estimatedDeliveryMinutes: null,
        deliveryPerson: null,
        notificationToken: null,
        notificationTokens: [],
        statusHistory: {
          pending: serverTimestamp(),
        },
        orderTimestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      orderWriteTimeoutMs,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("Missing or insufficient permissions")) {
      throw new Error(
        "Firestore denied this order. Update your Firestore rules to allow creating orders.",
      );
    }

    throw error;
  }

  return {
    orderId,
    orderReference,
  };
}

export async function hasCustomerPreviousOrders(phoneNumber: string) {
  if (!db) {
    throw new Error("Firebase is not configured. Add your Firebase environment variables.");
  }

  const normalizedPhone = phoneNumber.replace(/\D/g, "").slice(-10);

  if (normalizedPhone.length !== 10) {
    return false;
  }

  const previousOrdersQuery = query(
    collection(db, "orders"),
    where("customerDetails.phoneNumber", "==", normalizedPhone),
    limit(1),
  );
  const snapshot = await getDocs(previousOrdersQuery);

  return !snapshot.empty;
}

export async function saveOrderNotificationToken(orderId: string, token: string) {
  if (!db) {
    throw new Error("Firebase is not configured. Add your Firebase environment variables.");
  }

  await updateDoc(doc(db, "orders", orderId), {
    notificationToken: token,
    notificationTokens: arrayUnion(token),
    updatedAt: serverTimestamp(),
  });
}

export async function saveSignaturePackageNotificationToken(packageId: string, token: string) {
  if (!db) {
    throw new Error("Firebase is not configured. Add your Firebase environment variables.");
  }

  await updateDoc(doc(db, "signaturePackages", packageId), {
    notificationToken: token,
    notificationTokens: arrayUnion(token),
    updatedAt: serverTimestamp(),
  });
}

function getSignaturePackageFromOrderItem(item: OrderItem) {
  const normalizedCategory = item.category.trim().toLowerCase();
  const normalizedName = item.name.trim();

  if (normalizedCategory !== "signature meal boxes starter") {
    return null;
  }

  const planPeriod: SignaturePackagePeriod = normalizedName.toLowerCase().includes("weekly")
    ? "Weekly"
    : "Monthly";
  const planName = normalizedName
    .replace(/\s+-\s+weekly\s+plan$/i, "")
    .replace(/\s+-\s+monthly\s+plan$/i, "")
    .trim();
  const packagePlan = signaturePackagePlans.find(
    (plan) => plan.name.toLowerCase() === planName.toLowerCase(),
  );

  return {
    planName,
    planDescription: packagePlan?.description ?? "",
    packagePeriod: planPeriod,
    packageDurationDays: signaturePackageDurations[planPeriod],
  };
}

export async function createSignaturePackagesFromOrder(
  order: CreateOrderInput,
  orderId: string,
) {
  if (!db) {
    throw new Error("Firebase is not configured. Add your Firebase environment variables.");
  }

  const packageItems = order.items
    .map((item) => ({
      item,
      packageDetails: getSignaturePackageFromOrderItem(item),
    }))
    .filter(
      (entry): entry is { item: OrderItem; packageDetails: NonNullable<ReturnType<typeof getSignaturePackageFromOrderItem>> } =>
        Boolean(entry.packageDetails),
    );

  if (packageItems.length === 0) {
    return [];
  }

  const now = new Date();
  const createdPackageIds: string[] = [];

  await Promise.all(
    packageItems.flatMap(({ item, packageDetails }) =>
      Array.from({ length: item.quantity }).map(async (_, index) => {
        const packageId = createSignaturePackageId(
          order.phoneNumber,
          packageDetails.planName,
          packageDetails.packagePeriod,
        );
        const packageReference = doc(collection(db!, signaturePackageCollection), packageId);
        const expiryDate = addDays(now, packageDetails.packageDurationDays);

        await setDoc(packageReference, {
          packageId,
          customerName: order.customerName,
          phoneNumber: order.phoneNumber,
          planName: packageDetails.planName,
          planDescription: packageDetails.planDescription,
          packagePeriod: packageDetails.packagePeriod,
          packageDurationDays: packageDetails.packageDurationDays,
          amount: item.priceValue,
          status: "active",
          startDate: Timestamp.fromDate(now),
          expiryDate: Timestamp.fromDate(expiryDate),
          paymentMode: order.paymentOption,
          paymentStatus: order.paymentOption === "cod" ? "cash_on_delivery" : "paid",
          sourceOrderId: orderId,
          sourceOrderItemName: item.name,
          sourceOrderItemIndex: index,
          notificationToken: null,
          notificationTokens: [],
          lastExpiryNotificationAt: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        createdPackageIds.push(packageId);
      }),
    ),
  );

  return createdPackageIds;
}
