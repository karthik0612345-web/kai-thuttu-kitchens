"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartContext";
import { useCustomerAuthGate } from "@/components/CustomerAuthGate";
import {
  firstOrderOfferDiscount,
  firstOrderOfferMinimumSubtotal,
  getMinimumOrderShortfall,
  minimumOrderAmount,
} from "@/lib/orderRules";

function QuantityButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-full border border-white/15 text-lg font-black text-white transition hover:border-[#E9B44C] hover:text-[#E9B44C]"
    >
      {children}
    </button>
  );
}

export default function CartSidebar() {
  const router = useRouter();
  const { requireCustomerAuth } = useCustomerAuthGate();
  const {
    cartLines,
    cartCount,
    cartTotal,
    isCartOpen,
    closeCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    clearCart,
  } = useCart();

  const whatsappText =
    cartLines.length > 0
      ? `Hi Kai Thuttu Kitchens, I would like to order:%0A${cartLines
          .map(
            (line) =>
              `${line.quantity} x ${line.name} - Rs. ${line.lineTotal}`,
          )
          .join("%0A")}%0ATotal: Rs. ${cartTotal}`
      : "Hi%20Kai%20Thuttu%20Kitchens%2C%20I%20would%20like%20to%20place%20an%20order.";
  const whatsappHref = `https://wa.me/917676198004?text=${whatsappText}`;
  const minimumOrderShortfall = getMinimumOrderShortfall(cartTotal);
  const canCheckout = cartCount > 0 && minimumOrderShortfall === 0;

  return (
    <>
      <div
        className={`fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isCartOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeCart}
      />
      <aside
        className={`fixed right-0 top-0 z-[80] flex h-dvh w-full max-w-md flex-col border-l border-[#E9B44C]/25 bg-[#111111] shadow-[0_0_80px_rgba(0,0,0,0.5)] transition-transform duration-300 ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F97316]">
              Cart
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              {cartCount} {cartCount === 1 ? "item" : "items"}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="grid size-11 place-items-center rounded-full border border-white/15 text-2xl leading-none text-white transition hover:border-[#E9B44C] hover:text-[#E9B44C]"
            aria-label="Close cart"
          >
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {cartLines.length > 0 ? (
            <div className="grid gap-4">
              {cartLines.map((line) => (
                <article
                  key={line.name}
                  className="rounded-lg border border-white/10 bg-white/[0.06] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{line.name}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[#E9B44C]">
                        {line.category}
                      </p>
                      <p className="mt-2 text-sm font-bold text-zinc-300">
                        {line.price} | Line total Rs. {line.lineTotal}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(line.name)}
                      className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-zinc-200 transition hover:bg-[#F97316] hover:text-white"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <QuantityButton
                      label={`Decrease ${line.name} quantity`}
                      onClick={() => decreaseQuantity(line.name)}
                    >
                      -
                    </QuantityButton>
                    <span className="grid h-10 min-w-12 place-items-center rounded-full bg-white/10 px-4 text-sm font-black text-white">
                      {line.quantity}
                    </span>
                    <QuantityButton
                      label={`Increase ${line.name} quantity`}
                      onClick={() => increaseQuantity(line.name)}
                    >
                      +
                    </QuantityButton>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.06] p-8 text-center">
              <p className="text-2xl font-black text-white">Your cart is empty.</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Add dishes from the menu. Your cart will stay saved in this browser.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-5">
          <div className="mb-4 flex items-center justify-between text-lg font-black">
            <span className="text-white">Total</span>
            <span className="text-[#E9B44C]">Rs. {cartTotal}</span>
          </div>
          {cartCount > 0 && minimumOrderShortfall > 0 && (
            <p className="mb-4 rounded-lg border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-sm font-bold leading-6 text-orange-100">
              Minimum order is Rs. {minimumOrderAmount}. Add Rs.{" "}
              {minimumOrderShortfall} more to checkout.
            </p>
          )}
          {cartCount > 0 && cartTotal > minimumOrderAmount && (
            <p className="mb-4 rounded-lg border border-[#E9B44C]/25 bg-[#E9B44C]/10 px-4 py-3 text-sm font-bold leading-6 text-[#E9B44C]">
              First order offer: Rs. {firstOrderOfferDiscount} off above Rs.{" "}
              {firstOrderOfferMinimumSubtotal}. Eligibility is checked at
              checkout.
            </p>
          )}
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() =>
                requireCustomerAuth(() => {
                  if (!canCheckout) {
                    return;
                  }

                  closeCart();
                  router.push("/checkout");
                })
              }
              disabled={!canCheckout}
              className={`inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-black transition ${
                !canCheckout
                  ? "cursor-not-allowed bg-white/10 text-zinc-500"
                  : "bg-[#E9B44C] text-black hover:bg-[#F97316] hover:text-white"
              }`}
            >
              {cartCount === 0
                ? "Checkout"
                : minimumOrderShortfall > 0
                  ? `Add Rs. ${minimumOrderShortfall} more`
                  : "Checkout"}
            </button>
            <button
              type="button"
              onClick={clearCart}
              disabled={cartCount === 0}
              className="h-12 rounded-full border border-white/15 px-5 text-sm font-black text-zinc-200 transition hover:border-[#E9B44C] hover:text-[#E9B44C] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-white/15 disabled:hover:text-zinc-200"
            >
              Clear Cart
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#F97316] px-5 text-sm font-black text-white transition hover:bg-[#E9B44C] hover:text-black"
            >
              WhatsApp Order
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
