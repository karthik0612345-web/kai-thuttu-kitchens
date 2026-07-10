"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { formatStatus, statusLabels, type OrderStatus } from "@/lib/orderStatus";

type DeliveryOrder = {
  id: string;
  orderId: string;
  customerDetails?: {
    name?: string;
    phoneNumber?: string;
    deliveryAddress?: string;
    landmark?: string;
    googleMapLocation?: string;
  };
  orderedItems?: {
    name: string;
    category?: string;
    quantity: number;
    lineTotal: number;
  }[];
  paymentMethod?: "cod" | "razorpay" | string;
  paymentStatus?: string;
  status?: OrderStatus;
  total?: number;
  createdAt?: { toDate: () => Date };
  updatedAt?: { toDate: () => Date };
  estimatedDeliveryMinutes?: number | null;
  deliveryPerson?: {
    name?: string;
    phoneNumber?: string;
  } | null;
  notificationToken?: string | null;
  notificationTokens?: string[];
  statusHistory?: Record<string, { toDate: () => Date }>;
};

const visibleDeliveryStatuses: OrderStatus[] = [
  "confirmed",
  "preparing",
  "food_ready",
  "out_for_delivery",
  "delivered",
];

function formatMoney(value: number | undefined) {
  return `Rs. ${Number(value ?? 0).toLocaleString("en-IN")}`;
}

function formatDate(value?: { toDate: () => Date }) {
  const date = value?.toDate?.();
  if (!date) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function normalizePaymentMethod(method?: string) {
  if (method === "cod") {
    return "Cash on delivery";
  }

  if (method === "razorpay") {
    return "Razorpay";
  }

  return method ? formatStatus(method) : "Not provided";
}

function getStatusTone(status?: OrderStatus) {
  if (status === "delivered") {
    return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "out_for_delivery") {
    return "border-orange-400/50 bg-orange-500/10 text-orange-100";
  }

  return "border-white/10 bg-white/[0.06] text-zinc-200";
}

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setMessage("Firebase is not configured. Add Firebase environment variables and restart the app.");
      return;
    }

    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        setOrders(
          snapshot.docs.map((document) => ({
            id: document.id,
            ...(document.data() as Omit<DeliveryOrder, "id">),
          })),
        );
        setLoading(false);
      },
      (error) => {
        console.error("Unable to load delivery orders:", error);
        setLoading(false);
        setMessage(
          error.message.includes("Missing or insufficient permissions")
            ? "Firestore denied order access. Check delivery login and Firestore rules."
            : "Unable to load delivery orders from Firestore.",
        );
      },
    );

    return () => unsubscribe();
  }, []);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return orders
      .filter((order) => visibleDeliveryStatuses.includes(order.status ?? "pending"))
      .filter((order) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          order.orderId?.toLowerCase().includes(normalizedSearch) ||
          order.customerDetails?.phoneNumber?.toLowerCase().includes(normalizedSearch) ||
          order.customerDetails?.name?.toLowerCase().includes(normalizedSearch)
        );
      });
  }, [orders, searchValue]);

  const notifyCustomer = async (order: DeliveryOrder, status: OrderStatus) => {
    const notificationTokens = Array.from(
      new Set([...(order.notificationTokens ?? []), ...(order.notificationToken ? [order.notificationToken] : [])]),
    );

    if (notificationTokens.length === 0) {
      return "No customer notification token saved for this order.";
    }

    try {
      const response = await fetch("/api/notify-order-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokens: notificationTokens,
          orderId: order.orderId,
          status,
        }),
      });
      const result = await response.json();

      return result.success
        ? `Customer notification sent to ${result.sent ?? notificationTokens.length} device${(result.sent ?? notificationTokens.length) === 1 ? "" : "s"}.`
        : "Status saved, but push notification is not configured yet.";
    } catch (error) {
      console.error("Unable to send delivery notification:", error);
      return "Status saved, but notification sending failed.";
    }
  };

  const markCashCollected = async (order: DeliveryOrder) => {
    if (!db) {
      setMessage("Firebase is not configured.");
      return;
    }

    setSavingOrderId(order.id);
    setMessage(null);

    try {
      await updateDoc(doc(db, "orders", order.id), {
        paymentStatus: "cash_collected",
        cashCollectedAt: serverTimestamp(),
        cashCollectedBy: {
          uid: user?.uid ?? null,
          email: user?.email ?? null,
          name: user?.displayName ?? null,
        },
        updatedAt: serverTimestamp(),
      });
      setMessage(`Cash collection updated for ${order.orderId}.`);
    } catch (error) {
      console.error("Unable to mark cash collected:", error);
      setMessage(error instanceof Error ? error.message : "Unable to update cash collection.");
    } finally {
      setSavingOrderId(null);
    }
  };

  const markDelivered = async (order: DeliveryOrder) => {
    if (!db) {
      setMessage("Firebase is not configured.");
      return;
    }

    if (order.paymentMethod === "cod" && order.paymentStatus !== "cash_collected") {
      setMessage("Collect cash before marking this COD order as delivered.");
      return;
    }

    setSavingOrderId(order.id);
    setMessage(null);

    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: "delivered",
        deliveredAt: serverTimestamp(),
        deliveredBy: {
          uid: user?.uid ?? null,
          email: user?.email ?? null,
          name: user?.displayName ?? null,
        },
        updatedAt: serverTimestamp(),
        "statusHistory.delivered": serverTimestamp(),
      });

      const notificationMessage = await notifyCustomer(order, "delivered");
      setMessage(`Order ${order.orderId} marked delivered. ${notificationMessage}`);
    } catch (error) {
      console.error("Unable to mark delivered:", error);
      setMessage(error instanceof Error ? error.message : "Unable to update delivery status.");
    } finally {
      setSavingOrderId(null);
    }
  };

  const activeOrders = filteredOrders.filter((order) => order.status !== "delivered");
  const deliveredOrders = filteredOrders.filter((order) => order.status === "delivered");

  return (
    <div className="min-h-screen bg-[#111111] px-5 py-8 text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
                Kai Thuttu Kitchens
              </p>
              <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">
                Delivery dashboard
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-zinc-300">
                View customer delivery details, open the exact Google Maps location, collect COD payment, and update delivered orders.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-80">
              <div className="rounded-lg border border-orange-400/25 bg-orange-500/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-200">
                  Active
                </p>
                <p className="mt-2 text-3xl font-black text-white">{activeOrders.length}</p>
              </div>
              <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
                  Delivered
                </p>
                <p className="mt-2 text-3xl font-black text-white">{deliveredOrders.length}</p>
              </div>
            </div>
          </div>

          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search order ID, customer name, or phone"
            className="mt-7 h-13 w-full rounded-lg border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-500 focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10 sm:h-14"
          />
        </section>

        {message && (
          <div className="mt-6 rounded-lg border border-orange-400/30 bg-orange-500/10 p-4 text-sm font-bold leading-6 text-orange-100">
            {message}
          </div>
        )}

        <section className="mt-8">
          {loading ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-8 text-center text-lg font-black text-[#E9B44C]">
              Loading delivery orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-8 text-center">
              <h2 className="text-2xl font-black text-white">No delivery orders found</h2>
              <p className="mt-3 text-zinc-300">
                Orders will appear here after admin confirms and prepares them.
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredOrders.map((order) => {
                const isCod = order.paymentMethod === "cod";
                const isCashCollected = order.paymentStatus === "cash_collected";
                const canMarkDelivered = !isCod || isCashCollected;
                const isSaving = savingOrderId === order.id;

                return (
                  <article
                    key={order.id}
                    className="rounded-lg border border-white/10 bg-[#181818] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:p-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-2xl font-black text-white">{order.orderId}</h2>
                          <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusTone(order.status)}`}>
                            {statusLabels[order.status ?? "pending"] ?? formatStatus(order.status ?? "pending")}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-zinc-400">
                          Ordered: {formatDate(order.createdAt)}
                        </p>
                        {order.estimatedDeliveryMinutes ? (
                          <p className="mt-2 text-sm font-black text-[#E9B44C]">
                            Estimated delivery: {order.estimatedDeliveryMinutes} minutes
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-lg border border-white/10 bg-black/25 p-4 lg:min-w-72">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
                          Payment
                        </p>
                        <p className="mt-2 text-xl font-black text-white">
                          {formatMoney(order.total)}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-zinc-300">
                          {normalizePaymentMethod(order.paymentMethod)}
                        </p>
                        {isCod && (
                          <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-black ${
                            isCashCollected
                              ? "bg-emerald-500/10 text-emerald-200"
                              : "bg-orange-500/10 text-orange-100"
                          }`}>
                            {isCashCollected
                              ? "Cash collected"
                              : `Collect cash: ${formatMoney(order.total)}`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F97316]">
                          Customer details
                        </p>
                        <h3 className="mt-3 text-xl font-black text-white">
                          {order.customerDetails?.name ?? "Customer"}
                        </h3>
                        <p className="mt-2 text-sm font-semibold text-zinc-300">
                          Phone:{" "}
                          {order.customerDetails?.phoneNumber ? (
                            <a
                              href={`tel:${order.customerDetails.phoneNumber}`}
                              className="text-[#E9B44C] underline-offset-4 hover:underline"
                            >
                              {order.customerDetails.phoneNumber}
                            </a>
                          ) : (
                            "Not provided"
                          )}
                        </p>
                        <p className="mt-3 leading-7 text-zinc-300">
                          Address: <span className="font-semibold text-white">{order.customerDetails?.deliveryAddress ?? "Not provided"}</span>
                        </p>
                        {order.customerDetails?.landmark && (
                          <p className="mt-2 leading-7 text-zinc-300">
                            Landmark: <span className="font-semibold text-white">{order.customerDetails.landmark}</span>
                          </p>
                        )}
                        <div className="mt-4 flex flex-wrap gap-3">
                          {order.customerDetails?.googleMapLocation ? (
                            <a
                              href={order.customerDetails.googleMapLocation}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-11 items-center justify-center rounded-full bg-[#E9B44C] px-5 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-[#F97316] hover:text-white"
                            >
                              Open exact location
                            </a>
                          ) : (
                            <span className="inline-flex h-11 items-center rounded-full border border-white/10 px-5 text-sm font-bold text-zinc-400">
                              Location link not provided
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F97316]">
                          Ordered items
                        </p>
                        <div className="mt-4 grid gap-3">
                          {(order.orderedItems ?? []).map((item, index) => (
                            <div
                              key={`${item.name}-${index}`}
                              className="flex items-start justify-between gap-4 border-b border-white/10 pb-3 last:border-b-0 last:pb-0"
                            >
                              <div>
                                <p className="font-black text-white">{item.name}</p>
                                <p className="mt-1 text-sm text-zinc-400">Qty: {item.quantity}</p>
                              </div>
                              <p className="font-black text-[#E9B44C]">
                                {formatMoney(item.lineTotal)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      {isCod && (
                        <button
                          type="button"
                          onClick={() => markCashCollected(order)}
                          disabled={isSaving || isCashCollected}
                          className="h-12 rounded-full bg-emerald-500 px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                        >
                          {isCashCollected ? "Cash collected" : "Mark cash collected"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => markDelivered(order)}
                        disabled={isSaving || order.status === "delivered" || !canMarkDelivered}
                        className="h-12 rounded-full bg-[#F97316] px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#E9B44C] hover:text-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-[#F97316] disabled:hover:text-white"
                      >
                        {order.status === "delivered"
                          ? "Delivered"
                          : !canMarkDelivered
                            ? "Collect cash first"
                            : isSaving
                              ? "Updating..."
                              : "Mark as delivered"}
                      </button>

                      <Link
                        href={`/order-tracking?orderId=${encodeURIComponent(order.orderId)}`}
                        className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-black text-zinc-200 transition hover:border-[#E9B44C] hover:text-[#E9B44C]"
                      >
                        View tracking
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
