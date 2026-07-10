"use client";

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
import { db } from "@/lib/firebase";
import {
  adminOrderStatusOptions,
  formatStatus,
  orderStatusSequence,
  statusLabels,
  type OrderStatus,
} from "@/lib/orderStatus";
import { setOrdersPaused, useOrderAvailability } from "@/components/OrderAvailability";

type OrderHistory = Record<string, { toDate: () => Date }>;

type AdminOrder = {
  id: string;
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
  status?: OrderStatus;
  total?: number;
  createdAt?: { toDate: () => Date };
  updatedAt?: { toDate: () => Date };
  estimatedDeliveryMinutes?: number;
  deliveryPerson?: {
    name?: string;
    phoneNumber?: string;
  };
  notificationToken?: string | null;
  notificationTokens?: string[];
  statusHistory?: OrderHistory;
};

export default function AdminOrderManagement() {
  const orderAvailability = useOrderAvailability();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusEdits, setStatusEdits] = useState<Record<string, OrderStatus>>({});
  const [deliveryEdits, setDeliveryEdits] = useState<
    Record<
      string,
      {
        estimatedDeliveryMinutes: string;
        deliveryPersonName: string;
        deliveryPersonPhone: string;
      }
    >
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      setMessage("Firebase is not configured. Add Firebase environment variables and restart the dev server.");
      return;
    }

    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        setOrders(
          snapshot.docs.map((document) => ({
            id: document.id,
            ...(document.data() as Omit<AdminOrder, "id">),
          })),
        );
        setIsLoading(false);
      },
      (error) => {
        console.error("Unable to load admin orders:", error);
        setIsLoading(false);
        setMessage(
          error.message.includes("Missing or insufficient permissions")
            ? "Firestore denied order access. Check admin login and Firestore rules."
            : "Unable to load orders from Firestore.",
        );
      },
    );

    return () => unsubscribe();
  }, []);

  const normalizedSearch = searchValue.trim().toLowerCase();

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        !normalizedSearch ||
        order.orderId?.toLowerCase().includes(normalizedSearch) ||
        order.customerDetails?.phoneNumber?.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, normalizedSearch, statusFilter]);

  const getStatusHistory = (order: AdminOrder) => {
    const rawHistory = order.statusHistory ?? {};
    const historyEntries = Object.entries(rawHistory)
      .map(([status, timestamp]) => ({
        status,
        timestamp: timestamp?.toDate?.(),
      }))
      .filter((entry) => entry.timestamp)
      .sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime());

    return historyEntries;
  };

  const getEditableStatus = (order: AdminOrder) => {
    return statusEdits[order.id] ?? order.status ?? "pending";
  };

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    setStatusEdits((current) => ({
      ...current,
      [orderId]: status,
    }));
  };

  const getDeliveryEditValues = (order: AdminOrder) => {
    return deliveryEdits[order.id] ?? {
      estimatedDeliveryMinutes: order.estimatedDeliveryMinutes?.toString() ?? "",
      deliveryPersonName: order.deliveryPerson?.name ?? "",
      deliveryPersonPhone: order.deliveryPerson?.phoneNumber ?? "",
    };
  };

  const handleDeliveryEditChange = (
    order: AdminOrder,
    field: "estimatedDeliveryMinutes" | "deliveryPersonName" | "deliveryPersonPhone",
    value: string,
  ) => {
    const currentEdit = getDeliveryEditValues(order);

    setDeliveryEdits((current) => ({
      ...current,
      [order.id]: {
        ...currentEdit,
        [field]: value,
      },
    }));
  };

  const toggleOrderAvailability = async () => {
    setIsUpdatingAvailability(true);
    setMessage(null);

    try {
      await setOrdersPaused(!orderAvailability.isPaused);
      setMessage(
        orderAvailability.isPaused
          ? "Online orders are accepting again."
          : "Online orders are temporarily paused.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update order availability.");
    } finally {
      setIsUpdatingAvailability(false);
    }
  };

  const saveOrderStatus = async (order: AdminOrder) => {
    const selectedStatus = statusEdits[order.id] ?? order.status ?? "pending";

    if (!db) {
      setMessage("Firebase is not configured.");
      return;
    }

    setSavingOrderId(order.id);
    setMessage(null);

    try {
      const deliveryEdit = getDeliveryEditValues(order);
      const estimatedDeliveryMinutes = deliveryEdit.estimatedDeliveryMinutes
        ? Number(deliveryEdit.estimatedDeliveryMinutes)
        : null;
      const deliveryPerson =
        deliveryEdit.deliveryPersonName || deliveryEdit.deliveryPersonPhone
          ? {
              name: deliveryEdit.deliveryPersonName,
              phoneNumber: deliveryEdit.deliveryPersonPhone,
            }
          : order.deliveryPerson ?? null;

      await updateDoc(doc(db, "orders", order.id), {
        status: selectedStatus,
        estimatedDeliveryMinutes,
        deliveryPerson,
        updatedAt: serverTimestamp(),
        [`statusHistory.${selectedStatus}`]: serverTimestamp(),
      });

      const notificationTokens = Array.from(
        new Set([...(order.notificationTokens ?? []), ...(order.notificationToken ? [order.notificationToken] : [])]),
      );
      let notificationMessage = "No customer notification token saved yet.";

      if (notificationTokens.length > 0) {
        try {
          const response = await fetch("/api/notify-order-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tokens: notificationTokens,
              orderId: order.orderId,
              status: selectedStatus,
            }),
          });
          const result = await response.json();
          notificationMessage = result.success
            ? `Customer notification sent to ${result.sent ?? notificationTokens.length} device${(result.sent ?? notificationTokens.length) === 1 ? "" : "s"}.`
            : "Status saved, but push notification is not configured yet.";
        } catch (error) {
          console.error("Unable to send order notification:", error);
          notificationMessage = "Status saved, but notification sending failed.";
        }
      }

      setStatusEdits((current) => {
        const next = { ...current };
        delete next[order.id];
        return next;
      });
      setDeliveryEdits((current) => {
        const next = { ...current };
        delete next[order.id];
        return next;
      });
      setMessage(`Order ${order.orderId} updated to ${statusLabels[selectedStatus]}. ${notificationMessage}`);
    } catch (error) {
      console.error("Failed to save order status:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update order status. Please try again.",
      );
    } finally {
      setSavingOrderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <div className="relative isolate overflow-hidden px-6 py-10 sm:px-8 lg:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_85%_0%,rgba(233,180,76,0.12),transparent_28%)]" />
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
            Admin order management
          </p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                Manage customer orders and delivery status.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-300 sm:text-base">
                Search and filter orders, update statuses, view customer details, and notify customers automatically when the order status changes.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleOrderAvailability}
              disabled={isUpdatingAvailability || orderAvailability.isLoading}
              className={`h-12 shrink-0 rounded-full px-6 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                orderAvailability.isPaused
                  ? "bg-emerald-500 text-black hover:bg-emerald-300"
                  : "bg-red-500 text-white hover:bg-red-400"
              }`}
            >
              {isUpdatingAvailability
                ? "Updating..."
                : orderAvailability.isPaused
                ? "Resume Orders"
                : "Pause Orders"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-14 sm:px-8 lg:px-10">
        <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10 sm:p-6 lg:p-8">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-end">
            <label className="grid gap-2 text-sm font-bold text-zinc-200">
              Search orders
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Order ID or customer phone"
                className="h-14 rounded-2xl border border-white/10 bg-black/30 px-4 text-white outline-none transition focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-zinc-200">
              Filter status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-14 rounded-2xl border border-white/10 bg-black/30 px-4 text-white outline-none"
              >
                <option value="all">All statuses</option>
                {orderStatusSequence.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-zinc-300">
            <p>
              Showing <span className="font-bold text-white">{filteredOrders.length}</span> of <span className="font-bold text-white">{orders.length}</span> orders.
            </p>
            {message && <p className="font-bold text-amber-200">{message}</p>}
          </div>
        </div>

        <div className="mt-8 grid gap-6">
          {isLoading && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center text-zinc-300">
              Loading customer orders from Firestore...
            </div>
          )}

          {!isLoading && filteredOrders.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center text-zinc-400">
              No matching orders found.
            </div>
          )}

          {!isLoading && filteredOrders.map((order) => {
            const currentStatus = getEditableStatus(order);
            const statusHistory = getStatusHistory(order);
            const hasChange = currentStatus !== (order.status ?? "pending");
            const saving = savingOrderId === order.id;
            const deliveryEdit = getDeliveryEditValues(order);
            const orderTime = order.createdAt?.toDate();
            const updatedTime = order.updatedAt?.toDate();

            return (
              <article key={order.id} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-sm shadow-black/20 sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-[#F97316]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-[#F97316]">
                        {order.orderId}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-zinc-300">
                        {formatStatus(order.status ?? "pending")}
                      </span>
                    </div>
                    <div className="grid gap-3 text-sm text-zinc-400 md:grid-cols-2">
                      <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#E9B44C]">Customer</p>
                        <p className="mt-2 font-semibold text-white">{order.customerDetails?.name ?? "Guest"}</p>
                        <p className="mt-1">{order.customerDetails?.phoneNumber ?? "Phone not provided"}</p>
                      </div>
                      <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#E9B44C]">Timing</p>
                        <p className="mt-2">Placed: {orderTime ? orderTime.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Unknown"}</p>
                        <p className="mt-1">Updated: {updatedTime ? updatedTime.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Not updated"}</p>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400">
                      Delivery address: <span className="font-semibold text-white">{order.customerDetails?.deliveryAddress ?? "Not provided"}</span>
                    </p>
                    {(order.deliveryPerson?.name || order.deliveryPerson?.phoneNumber) && (
                      <p className="text-sm text-zinc-400">
                        Delivery partner: <span className="font-semibold text-white">{order.deliveryPerson?.name ?? "Not assigned"}</span>
                        {order.deliveryPerson?.phoneNumber ? ` · ${order.deliveryPerson.phoneNumber}` : ""}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:w-[320px]">
                    <label className="grid gap-2 text-sm font-bold text-zinc-200">
                      Update status
                      <select
                        value={currentStatus}
                        onChange={(event) => handleStatusChange(order.id, event.target.value as OrderStatus)}
                        className="h-14 rounded-3xl border border-white/10 bg-black/30 px-4 text-white outline-none"
                      >
                        {(order.status === "pending" || currentStatus === "pending") && (
                          <option value="pending" disabled>
                            {statusLabels.pending}
                          </option>
                        )}
                        {adminOrderStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-3 rounded-3xl border border-white/10 bg-black/20 p-4">
                      <label className="grid gap-2 text-sm font-bold text-zinc-200">
                        Delivery time in minutes
                        <input
                          type="number"
                          min="0"
                          value={deliveryEdit.estimatedDeliveryMinutes}
                          onChange={(event) =>
                            handleDeliveryEditChange(order, "estimatedDeliveryMinutes", event.target.value)
                          }
                          placeholder="e.g. 30"
                          className="h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white outline-none transition focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-bold text-zinc-200">
                        Delivery boy name
                        <input
                          value={deliveryEdit.deliveryPersonName}
                          onChange={(event) =>
                            handleDeliveryEditChange(order, "deliveryPersonName", event.target.value)
                          }
                          placeholder="Name"
                          className="h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white outline-none transition focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-bold text-zinc-200">
                        Delivery boy mobile number
                        <input
                          value={deliveryEdit.deliveryPersonPhone}
                          onChange={(event) =>
                            handleDeliveryEditChange(order, "deliveryPersonPhone", event.target.value)
                          }
                          placeholder="+91..."
                          className="h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white outline-none transition focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => saveOrderStatus(order)}
                      disabled={saving}
                      className={`h-14 rounded-full px-5 text-sm font-black transition ${
                        hasChange ||
                        deliveryEdit.estimatedDeliveryMinutes ||
                        deliveryEdit.deliveryPersonName ||
                        deliveryEdit.deliveryPersonPhone
                          ? "bg-[#F97316] text-black hover:bg-[#E9B44C]"
                          : "cursor-not-allowed bg-white/5 text-zinc-500"
                      }`}
                    >
                      {saving ? "Saving…" : "Save status"}
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_0.65fr]">
                  <div className="rounded-[1.8rem] border border-white/10 bg-black/30 p-5">
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F97316]">
                      Order details
                    </p>
                    <div className="mt-4 space-y-4">
                      {(order.orderedItems ?? []).map((item, index) => (
                        <div key={`${order.id}-${item.name}-${index}`} className="flex items-center justify-between gap-4 text-sm text-zinc-200">
                          <p className="font-semibold text-white">{item.quantity} x {item.name}</p>
                          <p>Rs. {item.lineTotal}</p>
                        </div>
                      ))}
                      <div className="rounded-3xl bg-white/5 px-4 py-3 text-sm text-zinc-300">
                        <div className="flex items-center justify-between font-black text-white">
                          <span>Total</span>
                          <span>Rs. {order.total ?? 0}</span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          Payment: {order.paymentMethod ?? "cod"}
                          {order.estimatedDeliveryMinutes ? ` · ETA ${order.estimatedDeliveryMinutes} min` : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.8rem] border border-white/10 bg-black/30 p-5">
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F97316]">
                      Status history
                    </p>
                    <div className="mt-4 space-y-3">
                      {statusHistory.length === 0 ? (
                        <p className="text-sm text-zinc-400">No status updates recorded yet.</p>
                      ) : (
                        statusHistory.map((entry) => (
                          <div key={`${order.id}-${entry.status}`} className="rounded-3xl bg-white/5 p-4">
                            <p className="font-semibold text-white">{formatStatus(entry.status)}</p>
                            <p className="mt-1 text-sm text-zinc-400">
                              {entry.timestamp?.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
