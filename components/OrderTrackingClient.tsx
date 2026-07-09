"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatStatus, orderStatusSequence, statusNotificationText, type OrderStatus } from "@/lib/orderStatus";
import OrderNotificationSubscriber from "@/components/OrderNotificationSubscriber";
import Navbar from "@/components/Navbar";

type TrackedOrder = {
  id?: string;
  orderId: string;
  customerDetails?: {
    name?: string;
    phoneNumber?: string;
    deliveryAddress?: string;
  };
  orderedItems?: {
    name: string;
    category: string;
    quantity: number;
    lineTotal: number;
  }[];
  paymentMethod?: string;
  status?: string;
  total?: number;
  createdAt?: { toDate: () => Date };
  updatedAt?: { toDate: () => Date };
  statusHistory?: { status: string; timestamp: { toDate: () => Date } }[];
  estimatedDeliveryMinutes?: number;
  deliveryPerson?: {
    name?: string;
    phoneNumber?: string;
  };
};

type RecentOrderSummary = {
  orderId: string;
  customerName?: string;
  phoneNumber?: string;
  deliveryAddress?: string;
  total?: number;
  status?: string;
  createdAt?: string;
};

const statusSteps = orderStatusSequence;

async function showOrderNotification(title: string, options: NotificationOptions) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
  }

  new Notification(title, options);
}

export default function OrderTrackingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orderId, setOrderId] = useState("");
  const [orderLookup, setOrderLookup] = useState("");
  const [recentOrders, setRecentOrders] = useState<RecentOrderSummary[]>([]);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previousStatusRef = useRef<string | null>(null);

  useEffect(() => {
    const initialOrderId = searchParams.get("orderId") ?? "";

    setOrderId(initialOrderId);
    setOrderLookup(initialOrderId);
  }, [searchParams]);

  const currentStatusIndex = useMemo(() => {
    if (!order?.status) {
      return 0;
    }

    return Math.max(0, statusSteps.indexOf(order.status as typeof statusSteps[number]));
  }, [order]);

  const statusHistoryMap = useMemo(() => {
    const map = new Map<string, Date>();

    const history = order?.statusHistory;

    if (Array.isArray(history)) {
      history.forEach((entry) => {
        const timestamp = entry.timestamp?.toDate?.();
        if (timestamp) {
          map.set(entry.status, timestamp);
        }
      });
    } else if (history && typeof history === "object") {
      Object.entries(history).forEach(([status, timestampValue]) => {
        const typedTimestamp = timestampValue as { toDate?: () => Date };
        const timestamp = typedTimestamp?.toDate?.();
        if (timestamp) {
          map.set(status, timestamp);
        }
      });
    }

    return map;
  }, [order]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedOrders = window.localStorage.getItem("customerRecentOrders");
      if (storedOrders) {
        setRecentOrders(JSON.parse(storedOrders));
      }
    } catch {
      setRecentOrders([]);
    }
  }, []);

  useEffect(() => {
    if (!order?.orderId) {
      return;
    }

    const summary: RecentOrderSummary = {
      orderId: order.orderId,
      customerName: order.customerDetails?.name,
      phoneNumber: order.customerDetails?.phoneNumber,
      deliveryAddress: order.customerDetails?.deliveryAddress,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt?.toDate().toISOString(),
    };

    setRecentOrders((current) => {
      const nextList = [summary, ...current.filter((entry) => entry.orderId !== summary.orderId)].slice(0, 5);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("customerRecentOrders", JSON.stringify(nextList));
      }

      return nextList;
    });
  }, [order]);

  useEffect(() => {
    if (!order?.status) {
      return;
    }

    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = order.status;

    if (!previousStatus || previousStatus === order.status) {
      return;
    }

    const body =
      statusNotificationText[order.status as OrderStatus] ??
      `Your order is now ${formatStatus(order.status)}.`;

    void showOrderNotification(`Order ${order.orderId} updated`, {
        body,
        icon: "/kai-thuttu-logo.jpeg",
    });
  }, [order?.orderId, order?.status]);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      return;
    }

    if (!db) {
      setError("Firebase is not configured.");
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      doc(db, "orders", orderId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setOrder(null);
          setError("Order not found. Check your Order ID and try again.");
          setLoading(false);
          return;
        }

        setOrder({ id: snapshot.id, ...(snapshot.data() as TrackedOrder) });
        setLoading(false);
      },
      () => {
        setError("Unable to load order status. Try again later.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [orderId]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedOrderId = orderLookup.trim();

    if (normalizedOrderId) {
      setOrderId(normalizedOrderId);
      setError(null);
      router.replace(`/order-tracking?orderId=${encodeURIComponent(normalizedOrderId)}`);
      return;
    }

    setError("Enter an Order ID to track your order.");
  };

  const estimatedDeliveryTime = useMemo(() => {
    if (!order?.createdAt || typeof order.estimatedDeliveryMinutes !== "number") {
      return null;
    }

    const createdAt = order.createdAt.toDate();
    const deliveryDate = new Date(createdAt.getTime() + order.estimatedDeliveryMinutes * 60000);

    return deliveryDate;
  }, [order]);

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <Navbar />

      <section className="relative isolate overflow-hidden px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.24),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(233,180,76,0.14),transparent_28%)]" />
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
            Customer order tracking
          </p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight text-white sm:text-7xl">
            Track your order from kitchen to doorstep.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
            Enter your Order ID to follow every step in real time. We also keep your recent orders handy on this device for quick viewing.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-10">
        <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-amber-100">
              Order ID
              <input
                value={orderLookup}
                onChange={(event) => setOrderLookup(event.target.value)}
                placeholder="KTK-..."
                className="h-14 rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
              />
            </label>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="inline-flex h-14 items-center justify-center rounded-full bg-[#F97316] px-8 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#E9B44C] hover:text-black"
            >
              Track order
            </button>
            <p className="text-sm text-zinc-400">
              Use the Order ID shown after checkout for instant real-time tracking.
            </p>
          </div>
          {error && (
            <p className="rounded-2xl border border-orange-400/25 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-100">
              {error}
            </p>
          )}
        </form>

        {recentOrders.length > 0 && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
                  Recent orders
                </p>
                <p className="mt-2 text-sm text-zinc-400">Quick access to the last orders saved on this device.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {recentOrders.map((entry) => (
                <button
                  key={entry.orderId}
                  type="button"
                  onClick={() => {
                    setOrderLookup(entry.orderId);
                    setOrderId(entry.orderId);
                    router.replace(`/order-tracking?orderId=${encodeURIComponent(entry.orderId)}`);
                  }}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 text-left transition hover:border-[#E9B44C]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-white">{entry.orderId}</p>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E9B44C]">{entry.status ?? "Pending"}</p>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">{entry.customerName ?? "Guest"}</p>
                  <p className="mt-1 text-sm text-zinc-500">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Recently placed"}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-zinc-300">
            Loading order details...
          </div>
        )}

        {order && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[0.95fr_0.55fr]">
            <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-8">
              <div className="grid gap-2">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F97316]">
                  Order ID
                </p>
                <h2 className="text-3xl font-black text-white">{order.orderId}</h2>
                <p className="text-sm text-zinc-400">
                  Placed by {order.customerDetails?.name ?? "Guest"} | {order.customerDetails?.phoneNumber}
                </p>
                <p className="text-sm text-zinc-400">
                  {order.customerDetails?.deliveryAddress}
                </p>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
                  <h3 className="text-lg font-black text-white">Order progress</h3>
                  <div className="mt-6">
                    <div className="mb-6 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-[#E9B44C] transition-all duration-700"
                        style={{
                          width: `${Math.max(0, Math.min(100, ((currentStatusIndex + 1) / statusSteps.length) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="space-y-4">
                      {statusSteps.map((status, index) => {
                        const isCompleted = index < currentStatusIndex;
                        const isActive = index === currentStatusIndex;
                        const timestamp = statusHistoryMap.get(status);

                        return (
                          <div
                            key={status}
                            className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 sm:grid-cols-[auto_1fr] sm:items-center"
                          >
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-full border text-lg font-black ${
                                isCompleted
                                  ? "border-emerald-400 bg-emerald-500/15 text-emerald-400"
                                  : isActive
                                  ? "border-[#F97316] bg-[#F97316]/15 text-[#F97316]"
                                  : "border-white/10 bg-white/5 text-zinc-400"
                              }`}
                            >
                              {isCompleted ? "✓" : index + 1}
                            </div>
                            <div>
                              <p className={`font-black text-sm ${isActive ? "text-[#F97316]" : "text-white"}`}>
                                {formatStatus(status)}
                              </p>
                              <p className="mt-1 text-sm text-zinc-400">
                                {timestamp
                                  ? timestamp.toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : isActive
                                  ? "In progress"
                                  : "Pending"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 rounded-3xl border border-white/10 bg-black/30 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F97316]">
                        Current status
                      </p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {formatStatus(order.status ?? "pending")}
                      </p>
                    </div>
                    <div className="rounded-full bg-[#E9B44C]/10 px-4 py-2 text-sm font-black text-[#E9B44C]">
                      {order.paymentMethod === "razorpay" ? "Paid online" : "Cash on delivery"}
                    </div>
                  </div>

                  {(estimatedDeliveryTime || order.deliveryPerson?.name || order.deliveryPerson?.phoneNumber) && (
                    <div className="rounded-2xl bg-white/5 px-4 py-4 text-sm text-zinc-300">
                      <p className="font-black text-white">Delivery details</p>
                      {estimatedDeliveryTime && (
                        <p className="mt-1">
                          Estimated delivery by{" "}
                          <span className="font-semibold text-white">
                            {estimatedDeliveryTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </p>
                      )}
                      <p className="mt-2">
                        Delivery partner:{" "}
                        <span className="font-semibold text-white">
                          {order.deliveryPerson?.name ?? "Not assigned yet"}
                        </span>
                      </p>
                      {order.deliveryPerson?.phoneNumber && (
                        <a
                          href={`tel:${order.deliveryPerson.phoneNumber}`}
                          className="mt-1 block text-sm font-semibold text-[#E9B44C] hover:text-white"
                        >
                          Call: {order.deliveryPerson.phoneNumber}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <aside className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-8">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F97316]">
                  Order summary
                </p>
                <p className="mt-3 text-sm text-zinc-300">
                  {order.orderedItems?.length ?? 0} items | Rs. {order.total ?? 0}
                </p>
                <p className="mt-2 text-sm text-zinc-300">
                  {order.customerDetails?.deliveryAddress}
                </p>
              </div>

              <div className="space-y-3 rounded-3xl bg-black/30 p-5">
                {(order.orderedItems ?? []).map((item) => (
                  <div key={`${item.name}-${item.quantity}`} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{item.name}</p>
                      <p className="text-sm text-zinc-400">{item.quantity} × Rs. {Math.round(item.lineTotal / item.quantity)}</p>
                    </div>
                    <p className="font-black text-[#E9B44C]">Rs. {item.lineTotal}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/30 p-5 text-sm text-zinc-300">
                <p className="font-black text-white">Order placed</p>
                <p className="mt-2">{order.createdAt?.toDate().toLocaleString() ?? "Unknown"}</p>
              </div>
            </aside>
          </div>
        )}
      </section>

      {order?.orderId && <OrderNotificationSubscriber orderId={order.orderId} />}
    </main>
  );
}
