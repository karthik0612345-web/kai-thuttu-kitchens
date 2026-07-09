import type { Metadata } from "next";
import Link from "next/link";
import CustomerPhoneAuthForm from "@/components/CustomerPhoneAuthForm";

export const metadata: Metadata = {
  title: "Customer Login | Kai Thuttu Kitchens",
  description: "Login or sign up to Kai Thuttu Kitchens using your mobile OTP.",
};

export default function CustomerLoginPage() {
  return (
    <main className="min-h-screen bg-[#080706] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
          href="/"
          className="text-sm font-black uppercase tracking-[0.18em] text-[#E9B44C]"
        >
          Kai Thuttu Kitchens
        </Link>
        <Link
          href="/menu"
          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-black text-zinc-200 transition hover:border-[#E9B44C] hover:text-[#E9B44C]"
        >
          Browse menu
        </Link>
      </div>

      <section className="mx-auto grid min-h-[calc(100vh-100px)] max-w-7xl place-items-center py-12">
        <div className="w-full max-w-md rounded-lg border border-[#E9B44C]/25 bg-white/[0.05] p-6 shadow-2xl sm:p-8">
          <CustomerPhoneAuthForm />
        </div>
      </section>
    </main>
  );
}
