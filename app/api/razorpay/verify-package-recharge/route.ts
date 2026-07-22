import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  getFirestoreDocument,
  getFirestoreNumber,
  getFirestoreString,
  getFirestoreTimestamp,
  updateFirestoreDocument,
} from "@/lib/firebaseServer";
import {
  addDays,
  signaturePackageCollection,
  signaturePackageDurations,
} from "@/lib/signaturePackages";

export const runtime = "nodejs";

const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

type VerifyPackageRechargePayload = {
  packageId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
};

function verifySignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: Required<Omit<VerifyPackageRechargePayload, "packageId">>) {
  if (!razorpayKeySecret) {
    throw new Error("Razorpay key secret is missing.");
  }

  const generatedSignature = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature),
    Buffer.from(razorpaySignature),
  );
}

function getRenewalBaseDate(expiryTimestamp: string) {
  const expiryDate = expiryTimestamp ? new Date(expiryTimestamp) : new Date();
  const now = new Date();

  return expiryDate.getTime() > now.getTime() ? expiryDate : now;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as VerifyPackageRechargePayload;
    const packageId = payload.packageId?.trim();
    const razorpayOrderId = payload.razorpayOrderId?.trim();
    const razorpayPaymentId = payload.razorpayPaymentId?.trim();
    const razorpaySignature = payload.razorpaySignature?.trim();

    if (!packageId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: "Package payment verification details are missing." },
        { status: 400 },
      );
    }

    const packageDocument = await getFirestoreDocument(signaturePackageCollection, packageId);
    const storedRazorpayOrderId = getFirestoreString(
      packageDocument,
      "razorpayRechargeOrderId",
    );
    const storedRazorpayAmount = getFirestoreNumber(
      packageDocument,
      "razorpayRechargeAmount",
    );
    const packageDurationDays =
      getFirestoreNumber(packageDocument, "packageDurationDays") ||
      signaturePackageDurations.Monthly;
    const currentExpiryTimestamp = getFirestoreTimestamp(packageDocument, "expiryDate");

    if (storedRazorpayOrderId !== razorpayOrderId || storedRazorpayAmount <= 0) {
      return NextResponse.json(
        { error: "Razorpay recharge does not match this signature package." },
        { status: 400 },
      );
    }

    const isValidSignature = verifySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Razorpay payment signature verification failed." },
        { status: 400 },
      );
    }

    const timestamp = new Date().toISOString();
    const nextExpiryDate = addDays(
      getRenewalBaseDate(currentExpiryTimestamp),
      packageDurationDays,
    );

    await updateFirestoreDocument(signaturePackageCollection, packageId, {
      status: { stringValue: "active" },
      paymentMode: { stringValue: "razorpay" },
      paymentStatus: { stringValue: "paid" },
      razorpayRechargePaymentId: { stringValue: razorpayPaymentId },
      razorpayRechargeSignatureVerified: { booleanValue: true },
      lastPaidAt: { timestampValue: timestamp },
      expiryDate: { timestampValue: nextExpiryDate.toISOString() },
      lastExpiryNotificationAt: { nullValue: null },
      updatedAt: { timestampValue: timestamp },
    });

    return NextResponse.json({
      success: true,
      packageId,
      expiryDate: nextExpiryDate.toISOString(),
      paymentStatus: "paid",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify package recharge.",
      },
      { status: 500 },
    );
  }
}
