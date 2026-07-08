"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthReady, isAdmin, signOut } = useAuth();

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace("/admin/login");
    }
  }, [isAuthReady, router, user]);

  if (!isAuthReady) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-5 text-center">
        <p className="text-xl font-black text-[#E9B44C]">
          Checking admin session...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-5 text-center">
        <div className="rounded-lg border border-orange-400/30 bg-orange-500/10 p-8">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
            Access denied
          </p>
          <h1 className="mt-3 text-4xl font-black text-white">
            Not an admin account
          </h1>
          <p className="mt-4 leading-7 text-zinc-300">
            You are signed in as {user.email}, but this email is not in the
            admin allowlist.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={signOut}
              className="h-12 rounded-full bg-[#F97316] px-6 text-sm font-black text-white transition hover:bg-[#E9B44C] hover:text-black"
            >
              Sign out
            </button>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-black text-zinc-200 transition hover:border-[#E9B44C] hover:text-[#E9B44C]"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
