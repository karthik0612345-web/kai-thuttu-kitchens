import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  getFirestoreNumber,
  getFirestoreString,
  getOrderDocument,
  updateOrderDocument,
} from "@/lib/firebaseServer";

export const runtime = "nodejs";

const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

type VerifyRazorpayPaymentPayload = {
  appOrderId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
};

function verifySignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: Required<Omit<VerifyRazorpayPaymentPayload, "appOrderId">>) {
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

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as VerifyRazorpayPaymentPayload;
    const appOrderId = payload.appOrderId?.trim();
    const razorpayOrderId = payload.razorpayOrderId?.trim();
    const razorpayPaymentId = payload.razorpayPaymentId?.trim();
    const razorpaySignature = payload.razorpaySignature?.trim();

    if (!appOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: "Payment verification details are missing." },
        { status: 400 },
      );
    }

    const orderDocument = await getOrderDocument(appOrderId);
    const storedRazorpayOrderId = getFirestoreString(
      orderDocument,
      "razorpayOrderId",
    );
    const storedRazorpayAmount = getFirestoreNumber(
      orderDocument,
      "razorpayAmount",
    );

    if (storedRazorpayOrderId !== razorpayOrderId || storedRazorpayAmount <= 0) {
      return NextResponse.json(
        { error: "Razorpay order does not match this website order." },
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
    await updateOrderDocument(appOrderId, {
      paymentStatus: { stringValue: "paid" },
      razorpayPaymentId: { stringValue: razorpayPaymentId },
      razorpaySignatureVerified: { booleanValue: true },
      paidAt: { timestampValue: timestamp },
      updatedAt: { timestampValue: timestamp },
    });

    return NextResponse.json({
      success: true,
      orderId: appOrderId,
      paymentStatus: "paid",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify Razorpay payment.",
      },
      { status: 500 },
    );
  }
}
