import type { Metadata } from "next";
import Link from "next/link";
import DeliveryLoginForm from "@/components/DeliveryLoginForm";

export const metadata: Metadata = {
  title: "Delivery Login | Kai Thuttu Kitchens",
  description: "Delivery partner login for Kai Thuttu Kitchens.",
};

export default function DeliveryLoginPage() {
  return (
    <main className="min-h-screen bg-[#111111] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto mb-10 flex max-w-7xl items-center justify-between">
        <Link
          href="/"
          className="text-sm font-black uppercase tracking-[0.18em] text-[#E9B44C] transition hover:text-[#F97316]"
        >
          Kai Thuttu Kitchens
        </Link>
        <Link
          href="/"
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-black text-zinc-200 transition hover:border-[#E9B44C] hover:text-[#E9B44C]"
        >
          Home
        </Link>
      </div>

      <section className="grid min-h-[calc(100vh-140px)] place-items-center">
        <DeliveryLoginForm />
      </section>
    </main>
  );
}
