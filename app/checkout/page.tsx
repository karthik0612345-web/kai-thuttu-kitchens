import type { Metadata } from "next";
import CheckoutForm from "@/components/CheckoutForm";
import Navbar from "@/components/Navbar";
import CheckoutGuard from "@/components/CheckoutGuard";

export const metadata: Metadata = {
  title: "Checkout | Kai Thuttu Kitchens",
  description:
    "Checkout for Kai Thuttu Kitchens delivery orders with cash on delivery and Razorpay payment options.",
};

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <Navbar />

      <section className="relative isolate overflow-hidden px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.26),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(233,180,76,0.18),transparent_28%)]" />
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
            Kai Thuttu Kitchens
          </p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight text-white sm:text-7xl">
            Checkout
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
            Add your delivery details, choose a payment option, and review your
            order before confirmation.
          </p>
        </div>
      </section>

      <CheckoutGuard>
        <CheckoutForm />
      </CheckoutGuard>
    </main>
  );
}
