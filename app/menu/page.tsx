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

      <section className="relative isolate overflow-hidden px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.28),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(233,180,76,0.2),transparent_28%)]" />
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
            Kai Thuttu Kitchens
          </p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight text-white sm:text-7xl">
            Restaurant Menu
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
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
