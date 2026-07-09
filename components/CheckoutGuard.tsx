"use client";

import type { ReactNode } from "react";
import CustomerPhoneAuthForm from "@/components/CustomerPhoneAuthForm";
import { useAuth } from "@/components/AuthProvider";

export default function CheckoutGuard({ children }: { children: ReactNode }) {
  const { user, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return (
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-10">
        <div className="h-72 animate-pulse rounded-lg bg-white/[0.05]" />
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-10">
        <div className="max-w-md rounded-lg border border-[#E9B44C]/25 bg-white/[0.05] p-6 sm:p-8">
          <CustomerPhoneAuthForm />
        </div>
      </section>
    );
  }

  return children;
}
