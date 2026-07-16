"use client";

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

type CustomerPhoneAuthFormProps = {
  onSuccess?: () => void;
  compact?: boolean;
};

function getAuthErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";

  if (code.includes("invalid-phone-number")) {
    return "Enter a valid 10-digit Indian mobile number.";
  }
  if (code.includes("invalid-verification-code")) {
    return "That OTP is incorrect. Please check it and try again.";
  }
  if (code.includes("too-many-requests") || code.includes("quota-exceeded")) {
    return "Too many OTP requests. Please wait before trying again.";
  }
  if (code.includes("captcha-check-failed")) {
    return "reCAPTCHA verification failed. Please try again.";
  }

  return "We could not complete phone verification. Please try again.";
}

export default function CustomerPhoneAuthForm({
  onSuccess,
  compact = false,
}: CustomerPhoneAuthFormProps) {
  const { user } = useAuth();
  const reactId = useId();
  const sendOtpButtonId = `customer-send-otp-${reactId.replace(/:/g, "")}`;
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] =
    useState<ConfirmationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(
    () => () => {
      verifierRef.current?.clear();
      verifierRef.current = null;
    },
    [],
  );

  const resetVerifier = () => {
    verifierRef.current?.clear();
    verifierRef.current = null;
  };

  const sendOtp = async (event: FormEvent) => {
    event.preventDefault();
    const digits = phone.replace(/\D/g, "");

    if (digits.length !== 10) {
      setMessage("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!auth) {
      setMessage("Firebase Authentication is not configured.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      resetVerifier();
      auth.useDeviceLanguage();
      const verifier = new RecaptchaVerifier(auth, sendOtpButtonId, {
        size: "invisible",
        callback: () => {
          setMessage("Sending OTP...");
        },
        "expired-callback": () => {
          resetVerifier();
        },
      });
      verifierRef.current = verifier;
      const result = await signInWithPhoneNumber(auth, `+91${digits}`, verifier);
      setConfirmation(result);
      setMessage(`OTP sent to +91 ${digits.slice(0, 5)} ${digits.slice(5)}.`);
    } catch (error) {
      resetVerifier();
      setMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();

    if (!confirmation || otp.replace(/\D/g, "").length !== 6) {
      setMessage("Enter the 6-digit OTP sent to your phone.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      await confirmation.confirm(otp);
      setMessage("Mobile number verified successfully.");
      onSuccess?.();
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F97316]">
          Account verified
        </p>
        <h1 className="mt-3 text-2xl font-black text-white">
          You are ready to order
        </h1>
        <p className="mt-2 text-sm text-zinc-300">
          Signed in as {user.phoneNumber ?? user.email}
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "w-full max-w-md"}>
      <div className="mb-6">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F97316]">
          Customer account
        </p>
        <h1 className="mt-2 text-3xl font-black text-white">
          {confirmation ? "Enter your OTP" : "Login or sign up"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          {confirmation
            ? "Enter the verification code sent by SMS."
            : "Browse freely. Verify your mobile number only when you are ready to order."}
        </p>
      </div>

      {!confirmation ? (
        <form onSubmit={sendOtp} className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-zinc-200">
            Mobile number
            <span className="flex h-13 overflow-hidden rounded-lg border border-white/15 bg-black/40 focus-within:border-[#E9B44C]">
              <span className="grid place-items-center border-r border-white/15 px-4 font-black text-[#E9B44C]">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="10-digit mobile number"
                className="min-w-0 flex-1 bg-transparent px-4 text-base text-white outline-none placeholder:text-zinc-600"
              />
            </span>
          </label>

          <button
            id={sendOtpButtonId}
            type="submit"
            disabled={isSubmitting}
            className="h-12 rounded-lg bg-[#E9B44C] px-5 text-sm font-black text-black transition hover:bg-[#F97316] hover:text-white disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-zinc-200">
            6-digit OTP
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              className="h-13 rounded-lg border border-white/15 bg-black/40 px-4 text-center text-xl font-black tracking-[0.35em] text-white outline-none transition focus:border-[#E9B44C]"
              autoFocus
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 rounded-lg bg-[#E9B44C] px-5 text-sm font-black text-black transition hover:bg-[#F97316] hover:text-white disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Verifying..." : "Verify and continue"}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmation(null);
              setOtp("");
              setMessage("");
              resetVerifier();
            }}
            className="h-11 text-sm font-bold text-zinc-300 transition hover:text-[#E9B44C]"
          >
            Change mobile number
          </button>
        </form>
      )}

      {message && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-white/10 bg-white/[0.06] p-3 text-sm font-bold text-zinc-200"
        >
          {message}
        </p>
      )}
      <p className="mt-5 text-xs leading-5 text-zinc-500">
        By continuing, you agree to receive a verification SMS. Standard SMS
        rates may apply.
      </p>
    </div>
  );
}
