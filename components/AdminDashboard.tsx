"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { defaultMenuItems } from "@/lib/defaultMenu";
import { adminOrderStatusOptions, formatStatus, orderStatusSequence, statusLabels, type OrderStatus } from "@/lib/orderStatus";
import { useAuth } from "@/components/AuthProvider";
import { setOrdersPaused, useOrderAvailability } from "@/components/OrderAvailability";
import DeliveryZoneAdmin from "@/components/DeliveryZoneSettings";

type AdminOrder = {
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
    category: string;
    quantity: number;
    lineTotal: number;
  }[];
  paymentMethod?: string;
  status?: OrderStatus;
  total?: number;
  orderTimestamp?: Timestamp;
  estimatedDeliveryMinutes?: number;
  deliveryPerson?: {
    name?: string;
    phoneNumber?: string;
  };
  notificationToken?: string;
  notificationTokens?: string[];
  statusHistory?: Record<string, Timestamp>;
};

type AdminMenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  priceLabel?: string;
  imageUrl?: string;
  isAvailable: boolean;
  isOutOfStock?: boolean;
};

const initialMenuForm = {
  id: "",
  name: "",
  category: "Veg",
  price: "",
  priceLabel: "",
  imageUrl: "",
  isAvailable: true,
  isOutOfStock: false,
};
const defaultMenuSeedVersion = 2;
const newOrderSoundPath = "/zomato_ring_3.mp3";

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const orderAvailability = useOrderAvailability();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [menuItems, setMenuItems] = useState<AdminMenuItem[]>([]);
  const [orderEdits, setOrderEdits] = useState<
    Record<
      string,
      {
        estimatedDeliveryMinutes: string;
        deliveryPersonName: string;
        deliveryPersonPhone: string;
      }
    >
  >({});
  const [menuForm, setMenuForm] = useState(initialMenuForm);
  const [activeTab, setActiveTab] = useState("orders");
  const [message, setMessage] = useState("");
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
  const [menuItemsLoaded, setMenuItemsLoaded] = useState(false);
  const [isOrderSoundEnabled, setIsOrderSoundEnabled] = useState(true);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedOrdersRef = useRef(false);
  const orderSoundEnabledRef = useRef(true);
  const orderSoundRef = useRef<HTMLAudioElement | null>(null);

  const playNewOrderSound = async () => {
    if (typeof window === "undefined" || !orderSoundEnabledRef.current) {
      return;
    }

    const audio = orderSoundRef.current ?? new Audio(newOrderSoundPath);
    orderSoundRef.current = audio;
    audio.loop = false;
    audio.volume = 1;
    audio.pause();
    audio.currentTime = 0;
    await audio.play();
    navigator.vibrate?.([350, 120, 350]);
  };

  const unlockOrderSound = async () => {
    if (typeof window === "undefined") {
      return;
    }

    orderSoundEnabledRef.current = true;
    setIsOrderSoundEnabled(true);
    window.localStorage.setItem("kaiThuttuAdminOrderSound", "enabled");

    const audio = orderSoundRef.current ?? new Audio(newOrderSoundPath);
    orderSoundRef.current = audio;
    audio.loop = false;
    audio.volume = 1;

    // Browsers require a user gesture before audible autoplay. A muted warm-up
    // keeps future new-order alerts ready without ringing on page load.
    audio.muted = true;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
  };

  const enableOrderSound = async () => {
    orderSoundEnabledRef.current = true;
    setIsOrderSoundEnabled(true);
    window.localStorage.setItem("kaiThuttuAdminOrderSound", "enabled");

    try {
      await playNewOrderSound();
      setMessage("New order sound is always enabled. Keep this admin page open to hear alerts.");
    } catch {
      setMessage("Sound is enabled, but the browser blocked the test ring. Click anywhere on this admin page once to allow audio.");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    orderSoundEnabledRef.current = true;
    setIsOrderSoundEnabled(true);
    window.localStorage.setItem("kaiThuttuAdminOrderSound", "enabled");

    unlockOrderSound().catch(() => {
      setMessage("New order sound is enabled. Click anywhere on this admin page once so the browser allows audio alerts.");
    });

    const unlockOnInteraction = () => {
      unlockOrderSound().catch(() => {
        setMessage("Sound is enabled, but the browser is still blocking audio. Use the Test Sound button once.");
      });
    };

    window.addEventListener("click", unlockOnInteraction, { once: true });
    window.addEventListener("touchstart", unlockOnInteraction, { once: true });
    window.addEventListener("keydown", unlockOnInteraction, { once: true });

    return () => {
      window.removeEventListener("click", unlockOnInteraction);
      window.removeEventListener("touchstart", unlockOnInteraction);
      window.removeEventListener("keydown", unlockOnInteraction);
    };
  }, []);

  useEffect(() => {
    if (!db) {
      return;
    }

    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const nextOrderIds = new Set(snapshot.docs.map((orderDoc) => orderDoc.id));
      const newOrderCount = snapshot.docs.filter(
        (orderDoc) => !knownOrderIdsRef.current.has(orderDoc.id),
      ).length;

      if (hasLoadedOrdersRef.current && newOrderCount > 0) {
        playNewOrderSound().catch((error) => {
          console.error("Unable to play new order sound:", error);
        });
      }

      knownOrderIdsRef.current = nextOrderIds;
      hasLoadedOrdersRef.current = true;

      setOrders(
        snapshot.docs.map((orderDoc) => ({
          id: orderDoc.id,
          ...(orderDoc.data() as Omit<AdminOrder, "id">),
        })),
      );
    });

    const menuQuery = query(collection(db, "menuItems"), orderBy("category", "asc"));
    const unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
      setMenuItems(
        snapshot.docs.map((menuDoc) => ({
          id: menuDoc.id,
          ...(menuDoc.data() as Omit<AdminMenuItem, "id">),
        })),
      );
      setMenuItemsLoaded(true);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeMenu();
    };
  }, []);

  const createMenuItemId = (category: string, name: string) => {
    return `${category}-${name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const importDefaultMenuItems = async ({ automatic = false } = {}) => {
    if (!db) {
      setMessage("Firebase is not configured.");
      return;
    }

    const firestore = db;
    const currentKeys = new Set(
      menuItems.map((item) => `${item.category.trim().toLowerCase()}::${item.name.trim().toLowerCase()}`),
    );
    const missingItems = defaultMenuItems.filter(
      (item) => !currentKeys.has(`${item.category.trim().toLowerCase()}::${item.name.trim().toLowerCase()}`),
    );

    if (missingItems.length === 0) {
      if (!automatic) {
        setMessage("All original menu items are already in admin.");
      }
      return;
    }

    await Promise.all(
      missingItems.map((item) =>
        setDoc(doc(firestore, "menuItems", createMenuItemId(item.category, item.name)), {
          name: item.name,
          category: item.category,
          price: item.priceValue,
          priceLabel: item.price,
          imageUrl: "",
          isAvailable: true,
          isOutOfStock: false,
          source: "default-menu",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      ),
    );

    setMessage(`${missingItems.length} original menu item${missingItems.length === 1 ? "" : "s"} imported into admin.`);
  };

  useEffect(() => {
    if (!db || !menuItemsLoaded) {
      return;
    }

    const firestore = db;
    let isCancelled = false;

    async function seedOriginalMenuOnce() {
      const seedReference = doc(firestore, "settings", "defaultMenuSeed");
      const seedSnapshot = await getDoc(seedReference);

      const currentSeedVersion = seedSnapshot.exists()
        ? Number(seedSnapshot.data().version ?? 0)
        : 0;

      if (currentSeedVersion >= defaultMenuSeedVersion || isCancelled) {
        return;
      }

      await importDefaultMenuItems({ automatic: true });
      await setDoc(seedReference, {
        version: defaultMenuSeedVersion,
        seededAt: serverTimestamp(),
      }, { merge: true });
    }

    seedOriginalMenuOnce().catch((error) => {
      console.error("Unable to seed original menu items:", error);
      setMessage("Unable to import original menu items. Check Firestore rules.");
    });

    return () => {
      isCancelled = true;
    };
  }, [menuItemsLoaded, menuItems]);

  const analytics = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total ?? 0), 0);
    const deliveredRevenue = orders
      .filter((order) => order.status === "delivered")
      .reduce((sum, order) => sum + (order.total ?? 0), 0);
    const uniqueCustomers = new Set(
      orders
        .map((order) => order.customerDetails?.phoneNumber)
        .filter(Boolean),
    ).size;
    const averageOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

    return {
      totalOrders: orders.length,
      totalRevenue,
      deliveredRevenue,
      uniqueCustomers,
      averageOrderValue,
    };
  }, [orders]);

  const customers = useMemo(() => {
    const customerMap = new Map<
      string,
      {
        name: string;
        phoneNumber: string;
        address: string;
        landmark: string;
        orders: number;
        spent: number;
      }
    >();

    orders.forEach((order) => {
      const phoneNumber = order.customerDetails?.phoneNumber;

      if (!phoneNumber) {
        return;
      }

      const current = customerMap.get(phoneNumber) ?? {
        name: order.customerDetails?.name ?? "Customer",
        phoneNumber,
        address: order.customerDetails?.deliveryAddress ?? "",
        landmark: order.customerDetails?.landmark ?? "",
        orders: 0,
        spent: 0,
      };

      customerMap.set(phoneNumber, {
        ...current,
        orders: current.orders + 1,
        spent: current.spent + (order.total ?? 0),
      });
    });

    return Array.from(customerMap.values());
  }, [orders]);

  const dashboardMessage =
    message ||
    (!db
      ? "Firebase is not configured. Add environment variables to load admin data."
      : "");

  const toggleOrderAvailability = async () => {
    setIsUpdatingAvailability(true);
    setMessage("");

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

  const getOrderEditValues = (order: AdminOrder) => {
    return orderEdits[order.id] ?? {
      estimatedDeliveryMinutes: order.estimatedDeliveryMinutes?.toString() ?? "",
      deliveryPersonName: order.deliveryPerson?.name ?? "",
      deliveryPersonPhone: order.deliveryPerson?.phoneNumber ?? "",
    };
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    if (!db) {
      return;
    }

    const order = orders.find((item) => item.id === orderId);
    const notificationTokens = Array.from(
      new Set([...(order?.notificationTokens ?? []), ...(order?.notificationToken ? [order.notificationToken] : [])]),
    );
    const edits = order ? getOrderEditValues(order) : null;
    const deliveryPerson = edits?.deliveryPersonName || edits?.deliveryPersonPhone
      ? {
          name: edits.deliveryPersonName,
          phoneNumber: edits.deliveryPersonPhone,
        }
      : order?.deliveryPerson ?? null;

    await updateDoc(doc(db, "orders", orderId), {
      status,
      estimatedDeliveryMinutes: edits?.estimatedDeliveryMinutes
        ? Number(edits.estimatedDeliveryMinutes)
        : order?.estimatedDeliveryMinutes ?? null,
      deliveryPerson,
      updatedAt: serverTimestamp(),
      [`statusHistory.${status}`]: serverTimestamp(),
    });

    if (notificationTokens.length > 0) {
      try {
        await fetch("/api/notify-order-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tokens: notificationTokens,
            orderId: order?.orderId ?? orderId,
            status,
          }),
        });
      } catch (error) {
        console.error("Unable to send order notification:", error);
      }
    }

    setMessage(`Order updated to ${formatStatus(status)}.`);
  };

  const saveOrderDetails = async (order: AdminOrder) => {
    if (!db) {
      setMessage("Firebase is not configured.");
      return;
    }

    const edits = getOrderEditValues(order);
    const deliveryPerson = edits.deliveryPersonName || edits.deliveryPersonPhone
      ? {
          name: edits.deliveryPersonName,
          phoneNumber: edits.deliveryPersonPhone,
        }
      : order.deliveryPerson ?? null;

    try {
      await updateDoc(doc(db, "orders", order.id), {
        estimatedDeliveryMinutes: edits.estimatedDeliveryMinutes
          ? Number(edits.estimatedDeliveryMinutes)
          : null,
        deliveryPerson,
        updatedAt: serverTimestamp(),
      });

      setMessage("Order delivery info updated.");
    } catch (error) {
      console.error("Error saving order delivery info:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save delivery info. Try again later.",
      );
    }
  };

  const resetMenuForm = () => setMenuForm(initialMenuForm);

  const submitMenuItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!db) {
      setMessage("Firebase is not configured.");
      return;
    }

    const normalizedPrice = Number(menuForm.price);

    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      setMessage("Enter a valid dish price.");
      return;
    }

    const payload = {
      name: menuForm.name,
      category: menuForm.category,
      price: normalizedPrice,
      priceLabel: menuForm.priceLabel.trim(),
      imageUrl: menuForm.imageUrl,
      isAvailable: menuForm.isAvailable,
      isOutOfStock: menuForm.isOutOfStock,
      updatedAt: serverTimestamp(),
    };

    if (menuForm.id) {
      await updateDoc(doc(db, "menuItems", menuForm.id), payload);
      setMessage("Menu item updated.");
    } else {
      await addDoc(collection(db, "menuItems"), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      setMessage("Menu item added.");
    }

    resetMenuForm();
  };

  const uploadMenuImage = (file?: File) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Please select a valid image file.");
      return;
    }

    if (file.size > 700 * 1024) {
      setMessage("Please choose an image smaller than 700 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setMenuForm((current) => ({
        ...current,
        imageUrl: typeof reader.result === "string" ? reader.result : "",
      }));
      setMessage("");
    };
    reader.onerror = () => setMessage("Unable to read this image. Try another file.");
    reader.readAsDataURL(file);
  };

  const removeMenuImage = () => {
    setMenuForm((current) => ({
      ...current,
      imageUrl: "",
    }));
  };

  const editMenuItem = (item: AdminMenuItem) => {
    setMenuForm({
      id: item.id,
      name: item.name,
      category: item.category,
      price: String(item.price),
      priceLabel: item.priceLabel ?? "",
      imageUrl: item.imageUrl ?? "",
      isAvailable: item.isAvailable ?? true,
      isOutOfStock: item.isOutOfStock ?? false,
    });
  };

  const deleteMenuItem = async (itemId: string) => {
    if (!db) {
      return;
    }

    await deleteDoc(doc(db, "menuItems", itemId));
    setMessage("Menu item deleted.");
  };

  return (
    <div>
      <header className="border-b border-white/10 bg-black/70 px-5 py-5 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-black text-white">
              Kai Thuttu Kitchens Dashboard
            </h1>
            <p className="mt-2 text-sm font-semibold text-zinc-400">
              Signed in as {user?.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={enableOrderSound}
              className={`inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black transition ${
                isOrderSoundEnabled
                  ? "bg-emerald-500 text-black hover:bg-emerald-300"
                  : "bg-[#E9B44C] text-black hover:bg-[#F97316] hover:text-white"
              }`}
            >
              {isOrderSoundEnabled ? "Test Sound" : "Enable Sound"}
            </button>
            <button
              type="button"
              onClick={toggleOrderAvailability}
              disabled={isUpdatingAvailability || orderAvailability.isLoading}
              className={`inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
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
            <Link
              href="/admin/orders"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#F97316] px-6 text-sm font-black text-black transition hover:bg-[#E9B44C]"
            >
              Order Management
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-black text-zinc-200 transition hover:border-[#E9B44C] hover:text-[#E9B44C]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        {dashboardMessage && (
          <div className="mb-6 rounded-lg border border-[#E9B44C]/25 bg-[#2D1B14] p-4 text-sm font-bold text-[#E9B44C]">
            {dashboardMessage}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Orders", analytics.totalOrders],
            ["Revenue", `Rs. ${analytics.totalRevenue}`],
            ["Delivered Sales", `Rs. ${analytics.deliveredRevenue}`],
            ["Customers", analytics.uniqueCustomers],
            ["Avg. Order", `Rs. ${analytics.averageOrderValue}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F97316]">
                {label}
              </p>
              <p className="mt-3 text-2xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-2 overflow-x-auto">
          {["orders", "menu", "delivery", "analytics", "customers"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`h-11 shrink-0 rounded-full px-5 text-sm font-black capitalize transition ${
                activeTab === tab
                  ? "bg-[#E9B44C] text-black"
                  : "border border-white/10 bg-white/[0.06] text-zinc-200 hover:border-[#F97316] hover:text-[#E9B44C]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "orders" && (
          <div className="mt-8 grid gap-4">
            {orders.map((order) => {
              const orderEdit = getOrderEditValues(order);

              return (
                <article key={order.id} className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
                  <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-[#E9B44C]">
                        {order.orderId ?? order.id}
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-white">
                        {order.customerDetails?.name ?? "Customer"}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">
                        {order.customerDetails?.phoneNumber} | {order.customerDetails?.deliveryAddress}
                      </p>
                      {order.customerDetails?.landmark && (
                        <p className="mt-1 text-sm leading-6 text-zinc-300">
                          Landmark: {order.customerDetails.landmark}
                        </p>
                      )}
                      {order.customerDetails?.googleMapLocation && (
                        <a
                          href={order.customerDetails.googleMapLocation}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex text-sm font-bold text-[#E9B44C] hover:text-white"
                        >
                          Open Google Maps location
                        </a>
                      )}
                      <p className="mt-2 text-sm font-bold text-zinc-300">
                        Payment: {order.paymentMethod ?? "cod"} | Total: Rs. {order.total ?? 0}
                      </p>
                      <div className="mt-4 grid gap-2">
                        {(order.orderedItems ?? []).map((item) => (
                          <p key={`${order.id}-${item.name}`} className="text-sm text-zinc-300">
                            {item.quantity} x {item.name} - Rs. {item.lineTotal}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-5">
                      <label className="grid h-fit gap-2">
                        <span className="text-sm font-bold text-amber-100">Order status</span>
                        <select
                          value={order.status ?? "pending"}
                          onChange={(event) =>
                            updateOrderStatus(order.id, event.target.value as OrderStatus)
                          }
                          className="h-12 rounded-lg border border-white/10 bg-black px-4 text-sm font-black text-white outline-none"
                        >
                          {order.status === "pending" && (
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

                      <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                        <p className="text-sm font-bold text-amber-100">Delivery info</p>
                        <div className="mt-4 grid gap-4">
                          <label className="grid gap-2 text-sm text-zinc-200">
                            <span>Estimated delivery time (minutes)</span>
                            <input
                              value={orderEdit.estimatedDeliveryMinutes}
                              onChange={(event) =>
                                setOrderEdits((current) => ({
                                  ...current,
                                  [order.id]: {
                                    ...orderEdit,
                                    estimatedDeliveryMinutes: event.target.value,
                                  },
                                }))
                              }
                              placeholder="e.g. 30"
                              className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
                            />
                          </label>
                          <label className="grid gap-2 text-sm text-zinc-200">
                            <span>Delivery partner name</span>
                            <input
                              value={orderEdit.deliveryPersonName}
                              onChange={(event) =>
                                setOrderEdits((current) => ({
                                  ...current,
                                  [order.id]: {
                                    ...orderEdit,
                                    deliveryPersonName: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Name"
                              className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
                            />
                          </label>
                          <label className="grid gap-2 text-sm text-zinc-200">
                            <span>Delivery partner phone</span>
                            <input
                              value={orderEdit.deliveryPersonPhone}
                              onChange={(event) =>
                                setOrderEdits((current) => ({
                                  ...current,
                                  [order.id]: {
                                    ...orderEdit,
                                    deliveryPersonPhone: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Phone number"
                              className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => saveOrderDetails(order)}
                            className="h-12 rounded-full bg-[#F97316] px-4 text-sm font-black text-black transition hover:bg-[#E9B44C]"
                          >
                            Save delivery info
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            {orders.length === 0 && (
              <p className="rounded-lg border border-white/10 bg-white/[0.06] p-8 text-center text-zinc-300">
                No orders found yet.
              </p>
            )}
          </div>
        )}

        {activeTab === "menu" && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <form onSubmit={submitMenuItem} className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
              <h2 className="text-2xl font-black text-white">
                {menuForm.id ? "Edit Menu Item" : "Add Menu Item"}
              </h2>
              <div className="mt-5 grid gap-4">
                <input
                  required
                  value={menuForm.name}
                  onChange={(event) => setMenuForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Food name"
                  className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
                />
                <input
                  required
                  value={menuForm.category}
                  onChange={(event) => setMenuForm((current) => ({ ...current, category: event.target.value }))}
                  placeholder="Category"
                  className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
                />
                <input
                  required
                  min="0"
                  type="number"
                  value={menuForm.price}
                  onChange={(event) => setMenuForm((current) => ({ ...current, price: event.target.value }))}
                  placeholder="Order price"
                  className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
                />
                <input
                  value={menuForm.priceLabel}
                  onChange={(event) => setMenuForm((current) => ({ ...current, priceLabel: event.target.value }))}
                  placeholder="Display price text, e.g. Weekly Rs. 410 | Monthly Rs. 1500"
                  className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
                />
                <label className="grid gap-2 text-sm font-bold text-zinc-200">
                  Dish image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => uploadMenuImage(event.target.files?.[0])}
                    className="block w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm text-zinc-200 file:mr-4 file:rounded-full file:border-0 file:bg-[#F97316] file:px-4 file:py-2 file:text-sm file:font-black file:text-white hover:file:bg-[#E9B44C] hover:file:text-black"
                  />
                </label>
                {menuForm.imageUrl && (
                  <div className="grid gap-3">
                    <div
                      className="aspect-[4/3] rounded-lg border border-white/10 bg-cover bg-center"
                      style={{ backgroundImage: `url("${menuForm.imageUrl}")` }}
                      aria-label="Dish image preview"
                    />
                    <button
                      type="button"
                      onClick={removeMenuImage}
                      className="h-11 rounded-full border border-white/15 px-5 text-sm font-black text-zinc-200 transition hover:border-[#F97316] hover:text-[#E9B44C]"
                    >
                      Remove image
                    </button>
                  </div>
                )}
                <label className="flex items-center gap-3 text-sm font-bold text-zinc-200">
                  <input
                    type="checkbox"
                    checked={menuForm.isAvailable === true}
                    onChange={(event) =>
                      setMenuForm((current) => ({
                        ...current,
                        isAvailable: event.target.checked,
                      }))
                    }
                  />
                  Show item on menu
                </label>
                <label className="flex items-center gap-3 text-sm font-bold text-zinc-200">
                  <input
                    type="checkbox"
                    checked={menuForm.isOutOfStock === true}
                    onChange={(event) =>
                      setMenuForm((current) => ({
                        ...current,
                        isOutOfStock: event.target.checked,
                      }))
                    }
                  />
                  Out of stock
                </label>
              </div>
              <div className="mt-5 flex gap-3">
                <button type="submit" className="h-12 rounded-full bg-[#F97316] px-6 text-sm font-black text-white">
                  {menuForm.id ? "Update" : "Add"}
                </button>
                {menuForm.id && (
                  <button type="button" onClick={resetMenuForm} className="h-12 rounded-full border border-white/15 px-6 text-sm font-black text-zinc-200">
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="grid gap-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-black text-white">Original restaurant menu</h3>
                    <p className="mt-1 text-sm text-zinc-300">
                      Import any missing original dishes into Firestore so admin and customer menus match.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => importDefaultMenuItems()}
                    className="h-11 rounded-full border border-[#E9B44C]/40 px-5 text-sm font-black text-[#E9B44C] transition hover:bg-[#E9B44C] hover:text-black"
                  >
                    Import original menu
                  </button>
                </div>
              </div>
              {menuItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="h-20 w-24 shrink-0 rounded-lg border border-white/10 bg-gradient-to-br from-[#2D1B14] via-[#F97316] to-[#E9B44C] bg-cover bg-center"
                        style={item.imageUrl ? { backgroundImage: `url("${item.imageUrl}")` } : undefined}
                        aria-hidden="true"
                      />
                      <div>
                      <h3 className="font-black text-white">{item.name}</h3>
                      <p className="mt-1 text-sm text-zinc-300">
                        {item.category} | {item.priceLabel || `Rs. ${item.price}`} | Order price Rs. {item.price} | {item.isAvailable ? "Visible" : "Hidden"} | {item.isOutOfStock ? "Out of stock" : "In stock"}
                      </p>
                      {item.imageUrl && (
                        <p className="mt-1 max-w-sm truncate text-xs text-zinc-500">
                          {item.imageUrl}
                        </p>
                      )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => editMenuItem(item)} className="rounded-full border border-white/15 px-4 py-2 text-sm font-black text-zinc-200">
                        Edit
                      </button>
                      <button type="button" onClick={() => deleteMenuItem(item.id)} className="rounded-full bg-[#F97316] px-4 py-2 text-sm font-black text-white">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {menuItems.length === 0 && (
                <p className="rounded-lg border border-white/10 bg-white/[0.06] p-8 text-center text-zinc-300">
                  No Firestore menu items yet. Add your first item here.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "delivery" && <DeliveryZoneAdmin />}

        {activeTab === "analytics" && (
          <div className="mt-8 rounded-lg border border-white/10 bg-white/[0.06] p-6">
            <h2 className="text-3xl font-black text-white">Sales Analytics</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <p className="rounded-lg bg-black/25 p-5 text-zinc-300">Total revenue: Rs. {analytics.totalRevenue}</p>
              <p className="rounded-lg bg-black/25 p-5 text-zinc-300">Delivered revenue: Rs. {analytics.deliveredRevenue}</p>
              <p className="rounded-lg bg-black/25 p-5 text-zinc-300">Average order value: Rs. {analytics.averageOrderValue}</p>
              <p className="rounded-lg bg-black/25 p-5 text-zinc-300">Total customers: {analytics.uniqueCustomers}</p>
            </div>
          </div>
        )}

        {activeTab === "customers" && (
          <div className="mt-8 grid gap-3">
            {customers.map((customer) => (
              <article key={customer.phoneNumber} className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
                <h3 className="text-xl font-black text-white">{customer.name}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  {customer.phoneNumber} | {customer.address}
                </p>
                {customer.landmark && (
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Landmark: {customer.landmark}
                  </p>
                )}
                <p className="mt-2 text-sm font-bold text-[#E9B44C]">
                  {customer.orders} orders | Rs. {customer.spent} spent
                </p>
              </article>
            ))}
            {customers.length === 0 && (
              <p className="rounded-lg border border-white/10 bg-white/[0.06] p-8 text-center text-zinc-300">
                No customers found yet.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
