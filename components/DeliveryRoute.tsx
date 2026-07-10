"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function DeliveryRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthReady, signOut } = useAuth();

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace("/delivery/login");
    }
  }, [isAuthReady, router, user]);

  if (!isAuthReady) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-5 text-center">
        <p className="text-xl font-black text-[#E9B44C]">
          Checking delivery session...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="border-b border-white/10 bg-black/80 px-5 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F97316]">
              Delivery partner
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-300">
              Signed in as {user.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-black text-zinc-200 transition hover:border-[#E9B44C] hover:text-[#E9B44C]"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="h-11 rounded-full bg-[#F97316] px-5 text-sm font-black text-white transition hover:bg-[#E9B44C] hover:text-black"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
      {children}
    </>
  );
}
