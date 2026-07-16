"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartContext";
import OrderNotificationSubscriber from "@/components/OrderNotificationSubscriber";
import { useOrderAvailability } from "@/components/OrderAvailability";
import { createOrder, type CreateOrderInput } from "@/lib/firestore";
import { useDeliveryZone } from "@/components/DeliveryZoneSettings";
import {
  checkDeliveryZone,
  freeDeliveryRadiusKm,
  getDeliveryChargeMessage,
  parseCoordinatesFromMapsLink,
} from "@/lib/deliveryZone";
import { getMinimumOrderShortfall, minimumOrderAmount } from "@/lib/orderRules";

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

type RazorpayCreateOrderResponse = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
};

type RazorpayVerifyResponse = {
  success: boolean;
  orderId: string;
  paymentStatus: string;
};

type LocationSearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

const paymentOptions = [
  {
    id: "cod",
    label: "Cash on delivery",
    description: "Pay when your fresh order reaches your doorstep.",
  },
  {
    id: "razorpay",
    label: "Razorpay",
    description: "Pay online securely with UPI, cards, wallets, or netbanking.",
  },
] as const;

const razorpayCheckoutScript = "https://checkout.razorpay.com/v1/checkout.js";

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

export default function CheckoutForm() {
  const { cartLines, cartCount, cartTotal, clearCart } = useCart();
  const orderAvailability = useOrderAvailability();
  const deliveryZone = useDeliveryZone();
  const [paymentOption, setPaymentOption] = useState<CreateOrderInput["paymentOption"]>("cod");
  const [orderStatus, setOrderStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [googleMapLocation, setGoogleMapLocation] = useState("");
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSearchResults, setLocationSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const customerCoordinates = parseCoordinatesFromMapsLink(googleMapLocation);
  const currentServiceability = checkDeliveryZone(
    deliveryZone.zone,
    customerCoordinates,
  );
  const deliveryChargeMessage = getDeliveryChargeMessage(
    currentServiceability.distanceKm,
  );
  const minimumOrderShortfall = getMinimumOrderShortfall(cartTotal);
  const meetsMinimumOrder = minimumOrderShortfall === 0;

  const updatePhoneNumber = (value: string) => {
    setPhoneNumber(value.replace(/\D/g, "").slice(0, 10));
  };

  const updateGoogleMapLocation = (value: string) => {
    setGoogleMapLocation(value);

    if (!deliveryZone.zone.isEnabled) {
      setLocationStatus(null);
      return;
    }

    if (!value.trim()) {
      setLocationStatus("Add your exact Google Maps location to check delivery availability.");
      return;
    }

    setLocationStatus(
      checkDeliveryZone(
        deliveryZone.zone,
        parseCoordinatesFromMapsLink(value),
      ).message,
    );
  };

  const searchMapLocation = async () => {
    const searchText = locationSearch.trim();

    if (!searchText) {
      setLocationStatus("Enter an area, apartment, road, or landmark to search.");
      return;
    }

    setIsSearchingLocation(true);
    setLocationStatus("Searching location...");
    setLocationSearchResults([]);

    try {
      const query = `${searchText}, Bengaluru, Karnataka, India`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        throw new Error("Unable to search location right now.");
      }

      const results = (await response.json()) as LocationSearchResult[];
      setLocationSearchResults(results);
      setLocationStatus(
        results.length > 0
          ? "Select the correct location from the search results."
          : "No location found. Try adding area, road name, or nearby landmark.",
      );
    } catch (error) {
      setLocationStatus(
        error instanceof Error
          ? error.message
          : "Unable to search location right now.",
      );
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const selectSearchedLocation = (result: LocationSearchResult) => {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setLocationStatus("This location result is invalid. Please choose another result.");
      return;
    }

    const nextLocation = `https://www.google.com/maps?q=${latitude},${longitude}`;
    setGoogleMapLocation(nextLocation);
    setLocationSearch(result.display_name);
    setLocationSearchResults([]);

    const serviceability = checkDeliveryZone(deliveryZone.zone, {
      latitude,
      longitude,
    });
    setLocationStatus(
      deliveryZone.zone.isEnabled
        ? serviceability.message
        : "Google Maps location added.",
    );
  };

  const useCurrentLocation = () => {
    setLocationStatus(null);

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationStatus("Location is not supported on this device. Paste your Google Maps link instead.");
      return;
    }

    setLocationStatus("Getting your current location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGoogleMapLocation(`https://www.google.com/maps?q=${latitude},${longitude}`);
        const serviceability = checkDeliveryZone(deliveryZone.zone, {
          latitude,
          longitude,
        });
        setLocationStatus(
          deliveryZone.zone.isEnabled
            ? serviceability.message
            : "Google Maps location added.",
        );
      },
      () => {
        setLocationStatus("Unable to get location. Please allow location access or paste your Google Maps link.");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  };

  const saveRecentOrder = (order: CreateOrderInput, orderId: string) => {
    if (typeof window === "undefined") {
      return;
    }

    const savedOrders = window.localStorage.getItem("customerRecentOrders");
    const existingOrders = savedOrders ? JSON.parse(savedOrders) : [];
    const recentOrder = {
      orderId,
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      deliveryAddress: order.deliveryAddress,
      landmark: order.landmark,
      googleMapLocation: order.googleMapLocation,
      total: order.total,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const nextOrders = [
      recentOrder,
      ...existingOrders.filter(
        (entry: { orderId: string }) => entry.orderId !== orderId,
      ),
    ].slice(0, 5);
    window.localStorage.setItem("customerRecentOrders", JSON.stringify(nextOrders));
  };

  const finishSuccessfulOrder = (
    order: CreateOrderInput,
    orderId: string,
    message: string,
  ) => {
    clearCart();
    setCreatedOrderId(orderId);
    saveRecentOrder(order, orderId);
    setOrderStatus({
      type: "success",
      message,
    });
  };

  const openRazorpayPayment = async (
    order: CreateOrderInput,
    appOrderId: string,
  ) => {
    setOrderStatus({
      type: "success",
      message: "Opening secure Razorpay checkout...",
    });

    const createResponse = await fetch("/api/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appOrderId,
        amount: order.total,
        customerName: order.customerName,
        phoneNumber: order.phoneNumber,
      }),
    });
    const razorpayOrder = await readJsonResponse<RazorpayCreateOrderResponse>(
      createResponse,
    );

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

        const checkout = new RazorpayCheckout({
          key: razorpayOrder.keyId,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "Kai Thuttu Kitchens",
          description: `Order ${appOrderId}`,
          image: "/kai-thuttu-logo.jpeg",
          order_id: razorpayOrder.razorpayOrderId,
          prefill: {
            name: order.customerName,
            contact: `+91${order.phoneNumber}`,
          },
          notes: {
            appOrderId,
          },
          theme: {
            color: "#F97316",
          },
          modal: {
            ondismiss: () => {
              reject(
                new Error(
                  "Razorpay payment window was closed before payment was completed.",
                ),
              );
            },
          },
          handler: (response) => {
            resolve(response);
          },
        });

        checkout.open();
      },
    );

    const verifyResponse = await fetch("/api/razorpay/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appOrderId,
        razorpayOrderId: paymentResponse.razorpay_order_id,
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        razorpaySignature: paymentResponse.razorpay_signature,
      }),
    });

    return readJsonResponse<RazorpayVerifyResponse>(verifyResponse);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOrderStatus(null);

    if (orderAvailability.isPaused) {
      setOrderStatus({
        type: "error",
        message: orderAvailability.message,
      });
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const order: CreateOrderInput = {
      customerName: String(formData.get("customerName") ?? "").trim(),
      phoneNumber,
      deliveryAddress: String(formData.get("deliveryAddress") ?? "").trim(),
      landmark: String(formData.get("landmark") ?? "").trim(),
      googleMapLocation: googleMapLocation.trim(),
      paymentOption,
      items: cartLines.map((line) => ({
        name: line.name,
        category: line.category,
        price: line.price,
        priceValue: line.priceValue,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
      total: cartTotal,
    };

    if (order.phoneNumber.length !== 10) {
      setOrderStatus({
        type: "error",
        message: "Enter a valid 10 digit mobile number.",
      });
      setIsSubmitting(false);
      return;
    }

    if (order.items.length === 0) {
      setOrderStatus({
        type: "error",
        message: "Your cart is empty. Add menu items before placing an order.",
      });
      setIsSubmitting(false);
      return;
    }

    if (order.total < minimumOrderAmount) {
      setOrderStatus({
        type: "error",
        message: `Minimum order is Rs. ${minimumOrderAmount}. Add Rs. ${minimumOrderAmount - order.total} more to place your order.`,
      });
      setIsSubmitting(false);
      return;
    }

    const customerCoordinates = parseCoordinatesFromMapsLink(order.googleMapLocation);
    const serviceability = checkDeliveryZone(deliveryZone.zone, customerCoordinates);

    if (!serviceability.canDeliver) {
      setOrderStatus({
        type: "error",
        message: serviceability.message,
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const { orderId } = await createOrder(order);

      if (order.paymentOption === "razorpay") {
        const verifiedPayment = await openRazorpayPayment(order, orderId);

        if (!verifiedPayment.success) {
          throw new Error("Razorpay payment could not be verified.");
        }

        finishSuccessfulOrder(
          order,
          orderId,
          `Payment successful. Order saved successfully. Order ID: ${orderId}`,
        );
        return;
      }

      finishSuccessfulOrder(
        order,
        orderId,
        `Order saved successfully. Order ID: ${orderId}`,
      );
    } catch (error) {
      setOrderStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to create the order right now.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdOrderId) {
    return (
      <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-8 lg:px-10">
        <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">
            Order placed
          </p>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">
            Thank you for your order
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base font-semibold leading-7 text-zinc-200">
            Your order has been sent to Kai Thuttu Kitchens. Track the live
            status from kitchen confirmation to delivery.
          </p>
          <div className="mx-auto mt-6 w-fit rounded-lg border border-white/10 bg-black/35 px-5 py-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#E9B44C]">
              Order ID
            </p>
            <p className="mt-2 text-2xl font-black text-white">
              {createdOrderId}
            </p>
          </div>
          <Link
            href={`/order-tracking?orderId=${createdOrderId}`}
            className="mt-8 inline-flex h-14 items-center justify-center rounded-full bg-[#F97316] px-10 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-[#E9B44C] hover:text-black"
          >
            Track Order
          </Link>
        </div>

        <OrderNotificationSubscriber orderId={createdOrderId} />
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-20 sm:px-8 lg:grid-cols-[1fr_0.78fr] lg:px-10">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-white/10 bg-white/[0.06] p-5 sm:p-8"
      >
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
            Delivery Details
          </p>
          <h2 className="mt-3 text-3xl font-black text-white">
            Complete your order
          </h2>
        </div>

        <div className="mt-8 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-bold text-amber-100">
              Customer name
            </span>
            <input
              required
              name="customerName"
              type="text"
              placeholder="Enter your full name"
              className="h-14 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-amber-100">
              Phone number
            </span>
            <input
              required
              name="phoneNumber"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              value={phoneNumber}
              onChange={(event) => updatePhoneNumber(event.target.value)}
              placeholder="Enter 10 digit mobile number"
              className="h-14 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-amber-100">
              Delivery address
            </span>
            <textarea
              required
              name="deliveryAddress"
              rows={5}
              placeholder="House number, street, area"
              className="resize-none rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-amber-100">
              Landmark <span className="text-zinc-400">(optional)</span>
            </span>
            <input
              name="landmark"
              type="text"
              placeholder="Nearby shop, apartment, gate, or street landmark"
              className="h-14 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-amber-100">
              Google Maps location
            </span>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                type="search"
                value={locationSearch}
                onChange={(event) => setLocationSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void searchMapLocation();
                  }
                }}
                placeholder="Search area, apartment, road, or landmark"
                className="h-14 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
              />
              <button
                type="button"
                onClick={() => void searchMapLocation()}
                disabled={isSearchingLocation}
                className="h-14 rounded-full border border-[#E9B44C]/50 px-5 text-sm font-black text-[#E9B44C] transition hover:bg-[#E9B44C] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSearchingLocation ? "Searching..." : "Search Map"}
              </button>
            </div>
            {locationSearchResults.length > 0 && (
              <div className="grid gap-2 rounded-lg border border-white/10 bg-black/35 p-3">
                {locationSearchResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => selectSearchedLocation(result)}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold leading-6 text-zinc-200 transition hover:border-[#E9B44C] hover:text-[#E9B44C]"
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                required={deliveryZone.zone.isEnabled}
                name="googleMapLocation"
                type="url"
                value={googleMapLocation}
                onChange={(event) => updateGoogleMapLocation(event.target.value)}
                placeholder="Selected Google Maps link, paste link, or use current location"
                className="h-14 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
              />
              <button
                type="button"
                onClick={useCurrentLocation}
                className="h-14 rounded-full border border-[#E9B44C]/50 px-5 text-sm font-black text-[#E9B44C] transition hover:bg-[#E9B44C] hover:text-black"
              >
                Use Location
              </button>
            </div>
            {locationStatus && (
              <span className={`text-sm font-semibold ${
                locationStatus.includes("not delivered") ||
                locationStatus.includes("Add your exact")
                  ? "text-orange-200"
                  : "text-zinc-300"
              }`}>
                {locationStatus}
              </span>
            )}
            {deliveryZone.zone.isEnabled && googleMapLocation && !locationStatus && (
              <span className="text-sm font-semibold text-zinc-300">
                {currentServiceability.message}
              </span>
            )}
            {deliveryZone.zone.isEnabled &&
              googleMapLocation &&
              currentServiceability.canDeliver && (
                <span className={`rounded-lg border px-4 py-3 text-sm font-black ${
                  currentServiceability.distanceKm !== null &&
                  currentServiceability.distanceKm <= freeDeliveryRadiusKm
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                    : "border-[#E9B44C]/30 bg-[#E9B44C]/10 text-[#E9B44C]"
                }`}>
                  {deliveryChargeMessage}
                </span>
              )}
            {deliveryZone.zone.isEnabled && !googleMapLocation && (
              <span className="text-sm font-semibold text-orange-200">
                Exact Google Maps location is required to check delivery availability.
              </span>
            )}
          </label>
        </div>

        <fieldset className="mt-8">
          <legend className="text-sm font-bold text-amber-100">
            Payment option
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {paymentOptions.map((option) => (
              <label
                key={option.id}
                className={`cursor-pointer rounded-lg border p-4 transition ${
                  paymentOption === option.id
                    ? "border-[#E9B44C] bg-[#E9B44C]/10"
                    : "border-white/10 bg-black/25 hover:border-[#F97316]/70"
                }`}
              >
                <input
                  type="radio"
                  name="paymentOption"
                  value={option.id}
                  checked={paymentOption === option.id}
                  onChange={() => setPaymentOption(option.id)}
                  className="sr-only"
                />
                <span className="block text-base font-black text-white">
                  {option.label}
                </span>
                <span className="mt-2 block text-sm leading-6 text-zinc-300">
                  {option.description}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {paymentOption === "razorpay" && (
          <div className="mt-5 rounded-lg border border-[#E9B44C]/25 bg-[#2D1B14] p-4 text-sm leading-6 text-zinc-200">
            Razorpay is connected. Secure checkout will open after you click
            the button, and the order will be confirmed only after payment
            verification succeeds.
          </div>
        )}

        {orderAvailability.isPaused && (
          <div className="mt-5 rounded-lg border border-orange-400/30 bg-orange-500/10 p-4 text-sm font-bold leading-6 text-orange-100">
            {orderAvailability.message}
          </div>
        )}

        {cartCount > 0 && !meetsMinimumOrder && (
          <div className="mt-5 rounded-lg border border-orange-400/30 bg-orange-500/10 p-4 text-sm font-bold leading-6 text-orange-100">
            Minimum order is Rs. {minimumOrderAmount}. Add Rs.{" "}
            {minimumOrderShortfall} more to place your order.
          </div>
        )}

        {orderStatus && (
          <div
            className={`mt-5 rounded-lg border p-4 text-sm font-bold leading-6 ${
              orderStatus.type === "success"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                : "border-orange-400/30 bg-orange-500/10 text-orange-100"
            }`}
          >
            {orderStatus.message}
          </div>
        )}

        {createdOrderId && (
          <div className="mt-4 rounded-lg border border-[#E9B44C]/20 bg-[#E9B44C]/5 p-4 text-sm text-zinc-100">
            Your order is on its way to the kitchen. You can also track it
            here:{" "}
            <Link
              href={`/order-tracking?orderId=${createdOrderId}`}
              className="font-black text-[#F97316] underline"
            >
              view tracking
            </Link>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={cartCount === 0 || !meetsMinimumOrder || isSubmitting || orderAvailability.isPaused}
            className="inline-flex h-14 items-center justify-center rounded-full bg-[#F97316] px-8 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-[#E9B44C] hover:text-black disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:bg-[#F97316] disabled:hover:text-white"
          >
            {orderAvailability.isPaused
              ? "Orders Paused"
              : !meetsMinimumOrder && cartCount > 0
                ? `Add Rs. ${minimumOrderShortfall} more`
              : isSubmitting
                ? paymentOption === "razorpay"
                  ? "Processing Payment..."
                  : "Saving Order..."
                : paymentOption === "razorpay"
                  ? "Pay with Razorpay"
                  : "Place Order"}
          </button>
          <Link
            href="/menu"
            className="inline-flex h-14 items-center justify-center rounded-full border border-white/15 px-8 text-sm font-black text-zinc-200 transition hover:-translate-y-1 hover:border-[#E9B44C] hover:text-[#E9B44C]"
          >
            Add More Items
          </Link>
        </div>
      </form>

      {createdOrderId && <OrderNotificationSubscriber orderId={createdOrderId} />}

      <aside className="h-fit rounded-lg border border-[#E9B44C]/25 bg-[#2D1B14] p-5 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-[#E9B44C]">
          Order Summary
        </p>
        <h2 className="mt-3 text-3xl font-black text-white">
          {cartCount} {cartCount === 1 ? "item" : "items"}
        </h2>

        <div className="mt-6 grid gap-4">
          {cartLines.length > 0 ? (
            cartLines.map((line) => (
              <div
                key={line.name}
                className="rounded-lg border border-white/10 bg-black/25 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-white">{line.name}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[#E9B44C]">
                      {line.category}
                    </p>
                    <p className="mt-2 text-sm text-zinc-300">
                      {line.quantity} x {line.price}
                    </p>
                  </div>
                  <p className="font-black text-amber-100">
                    Rs. {line.lineTotal}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-white/10 bg-black/25 p-6 text-center">
              <p className="font-black text-white">Your cart is empty.</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Add items from the menu before checkout.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="flex justify-between text-sm font-bold text-zinc-300">
            <span>Subtotal</span>
            <span>Rs. {cartTotal}</span>
          </div>
          <div className="mt-3 flex justify-between text-sm font-bold text-zinc-300">
            <span>Delivery</span>
            <span className="max-w-[14rem] text-right">
              {deliveryZone.zone.isEnabled && currentServiceability.canDeliver
                ? deliveryChargeMessage
                : "Calculated on confirmation"}
            </span>
          </div>
          <div className="mt-5 flex justify-between text-xl font-black text-white">
            <span>Total</span>
            <span className="text-[#E9B44C]">Rs. {cartTotal}</span>
          </div>
          {cartCount > 0 && !meetsMinimumOrder && (
            <p className="mt-4 rounded-lg border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-sm font-bold leading-6 text-orange-100">
              Add Rs. {minimumOrderShortfall} more. Minimum order is Rs.{" "}
              {minimumOrderAmount}.
            </p>
          )}
        </div>

        {cartCount > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="mt-6 h-12 w-full rounded-full border border-white/15 px-5 text-sm font-black text-zinc-200 transition hover:border-[#E9B44C] hover:text-[#E9B44C]"
          >
            Clear Cart
          </button>
        )}
      </aside>
    </section>
  );
}
