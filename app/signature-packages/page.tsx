import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import SignaturePackagesClient from "@/components/SignaturePackagesClient";

export const metadata: Metadata = {
  title: "My Signature Packages | Kai Thuttu Kitchens",
  description:
    "View and recharge Kai Thuttu Kitchens Signature Meal Box monthly packages.",
};

export default function SignaturePackagesPage() {
  return (
    <main className="min-h-screen bg-[#080706] text-white">
      <Navbar />
      <SignaturePackagesClient />
    </main>
  );
}
