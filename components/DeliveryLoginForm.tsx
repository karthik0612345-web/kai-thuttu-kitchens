"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { useAuth } from "@/components/AuthProvider";
import { auth } from "@/lib/firebase";

type LoginMode = "login" | "signup";

export default function DeliveryLoginForm() {
  const router = useRouter();
  const {
    user,
    isAuthReady,
    isFirebaseConfigured,
    missingFirebaseConfigKeys,
  } = useAuth();
  const [mode, setMode] = useState<LoginMode>("login");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthReady && user) {
      router.replace("/delivery");
    }
  }, [isAuthReady, router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      if (!auth) {
        throw new Error("Firebase Authentication is not configured.");
      }

      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(credential.user, { displayName: name });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      router.replace("/delivery");
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Unable to continue. Check the email and password.",
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
          Delivery Login
        </p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
          Delivery partner access
        </h1>
        <p className="mt-3 leading-7 text-zinc-300">
          Sign in or create a delivery account using email and password.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 rounded-full border border-white/10 bg-black/30 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError("");
          }}
          className={`h-11 rounded-full text-sm font-black transition ${
            mode === "login"
              ? "bg-[#F97316] text-white"
              : "text-zinc-300 hover:text-[#E9B44C]"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError("");
          }}
          className={`h-11 rounded-full text-sm font-black transition ${
            mode === "signup"
              ? "bg-[#F97316] text-white"
              : "text-zinc-300 hover:text-[#E9B44C]"
          }`}
        >
          Sign up
        </button>
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
        {mode === "signup" && (
          <label className="grid gap-2">
            <span className="text-sm font-bold text-amber-100">Name</span>
            <input
              required
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Delivery partner name"
              className="h-14 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
            />
          </label>
        )}

        <label className="grid gap-2">
          <span className="text-sm font-bold text-amber-100">Email</span>
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            placeholder="delivery@gmail.com"
            className="h-14 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-amber-100">Password</span>
          <input
            required
            name="password"
            type="password"
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="Minimum 6 characters"
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
        {isSubmitting
          ? mode === "signup"
            ? "Creating account..."
            : "Signing in..."
          : mode === "signup"
            ? "Create delivery account"
            : "Login"}
      </button>

      <Link
        href="/"
        className="mt-5 inline-flex w-full justify-center text-sm font-bold text-zinc-400 transition hover:text-[#E9B44C]"
      >
        Back to website
      </Link>
    </form>
  );
}
