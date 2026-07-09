import type { Metadata } from "next";
import { Suspense } from "react";
import MenuBrowser from "@/components/MenuBrowser";
import Navbar from "@/components/Navbar";
import { defaultMenuCategories } from "@/lib/defaultMenu";

export const metadata: Metadata = {
  title: "Menu | Kai Thuttu Kitchens",
  description:
    "Browse the full Kai Thuttu Kitchens menu with veg, non veg, mudde meals, roti, rice, and healthy food options.",
};

export default function MenuPage() {
  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <Navbar />

      <section className="relative isolate overflow-hidden px-4 py-8 sm:px-8 sm:py-20 lg:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.28),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(233,180,76,0.2),transparent_28%)]" />
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#F97316] sm:text-sm sm:tracking-[0.24em]">
            Kai Thuttu Kitchens
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight text-white sm:mt-4 sm:text-7xl">
            Restaurant Menu
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:mt-5 sm:text-lg sm:leading-8">
            Search, filter, and add your favorite Karnataka homestyle dishes to
            the cart before ordering through WhatsApp.
          </p>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-5 pb-20 text-center text-zinc-300 sm:px-8 lg:px-10">
            Loading menu...
          </div>
        }
      >
        <MenuBrowser categories={defaultMenuCategories} />
      </Suspense>
    </main>
  );
}
