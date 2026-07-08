"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export default function AdminLoginForm() {
  const router = useRouter();
  const {
    signInWithEmail,
    isFirebaseConfigured,
    missingFirebaseConfigKeys,
    adminEmails,
  } = useAuth();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      await signInWithEmail(email, password);

      if (
        adminEmails.length > 0 &&
        !adminEmails.includes(email.toLowerCase())
      ) {
        setError("This Firebase account is not authorized for admin access.");
        return;
      }

      router.push("/admin");
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Unable to sign in. Check your admin credentials.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-md rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-8"
    >
      <div>
        <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
          Admin Login
        </p>
        <h1 className="mt-3 text-4xl font-black text-white">
          Secure access
        </h1>
        <p className="mt-3 leading-7 text-zinc-300">
          Sign in with a Firebase Authentication admin account.
        </p>
      </div>

      {!isFirebaseConfigured && (
        <div className="mt-6 rounded-lg border border-orange-400/30 bg-orange-500/10 p-4 text-sm font-bold leading-6 text-orange-100">
          <p>Firebase is not connected yet. Add real values for:</p>
          <ul className="mt-2 list-inside list-disc font-mono text-xs">
            {missingFirebaseConfigKeys.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 grid gap-5">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-amber-100">Email</span>
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            placeholder="admin@example.com"
            className="h-14 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-amber-100">Password</span>
          <input
            required
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter admin password"
            className="h-14 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
          />
        </label>
      </div>

      {error && (
        <div className="mt-5 rounded-lg border border-orange-400/30 bg-orange-500/10 p-4 text-sm font-bold leading-6 text-orange-100">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!isFirebaseConfigured || isSubmitting}
        className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-full bg-[#F97316] px-8 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-[#E9B44C] hover:text-black disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:bg-[#F97316] disabled:hover:text-white"
      >
        {isSubmitting ? "Signing in..." : "Login"}
      </button>
    </form>
  );
}
