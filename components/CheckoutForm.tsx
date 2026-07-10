"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartContext";
import OrderNotificationSubscriber from "@/components/OrderNotificationSubscriber";
import { useOrderAvailability } from "@/components/OrderAvailability";
import { createOrder, type CreateOrderInput } from "@/lib/firestore";

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

export default function CheckoutForm() {
  const { cartLines, cartCount, cartTotal, clearCart } = useCart();
  const orderAvailability = useOrderAvailability();
  const [paymentOption, setPaymentOption] = useState<CreateOrderInput["paymentOption"]>("cod");
  const [orderStatus, setOrderStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string>("");

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
      phoneNumber: String(formData.get("phoneNumber") ?? "").trim(),
      deliveryAddress: String(formData.get("deliveryAddress") ?? "").trim(),
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

    if (order.items.length === 0) {
      setOrderStatus({
        type: "error",
        message: "Your cart is empty. Add menu items before placing an order.",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const { orderId } = await createOrder(order);
      clearCart();
      setCreatedOrderId(orderId);
      if (typeof window !== "undefined") {
        const savedOrders = window.localStorage.getItem("customerRecentOrders");
        const existingOrders = savedOrders ? JSON.parse(savedOrders) : [];
        const recentOrder = {
          orderId,
          customerName: order.customerName,
          phoneNumber: order.phoneNumber,
          deliveryAddress: order.deliveryAddress,
          total: order.total,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        const nextOrders = [recentOrder, ...existingOrders.filter((entry: { orderId: string }) => entry.orderId !== orderId)].slice(0, 5);
        window.localStorage.setItem("customerRecentOrders", JSON.stringify(nextOrders));
      }
      setOrderStatus({
        type: "success",
        message: `Order saved successfully. Order ID: ${orderId}`,
      });
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
              inputMode="tel"
              placeholder="Enter mobile number"
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
              placeholder="House number, street, area, landmark"
              className="resize-none rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
            />
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
            Razorpay payment will be connected here. For now, this checkout
            captures the selected payment method and order details.
          </div>
        )}

        {orderAvailability.isPaused && (
          <div className="mt-5 rounded-lg border border-orange-400/30 bg-orange-500/10 p-4 text-sm font-bold leading-6 text-orange-100">
            {orderAvailability.message}
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
            disabled={cartCount === 0 || isSubmitting || orderAvailability.isPaused}
            className="inline-flex h-14 items-center justify-center rounded-full bg-[#F97316] px-8 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-[#E9B44C] hover:text-black disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:bg-[#F97316] disabled:hover:text-white"
          >
            {orderAvailability.isPaused ? "Orders Paused" : isSubmitting ? "Saving Order..." : "Place Order"}
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
            <span>Calculated on confirmation</span>
          </div>
          <div className="mt-5 flex justify-between text-xl font-black text-white">
            <span>Total</span>
            <span className="text-[#E9B44C]">Rs. {cartTotal}</span>
          </div>
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
