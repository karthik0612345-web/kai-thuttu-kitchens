import { NextResponse } from "next/server";
import {
  getFirestoreDocument,
  getFirestoreNumber,
  getFirestoreString,
  updateFirestoreDocument,
} from "@/lib/firebaseServer";
import { signaturePackageCollection } from "@/lib/signaturePackages";

export const runtime = "nodejs";

const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

type CreatePackageRechargePayload = {
  packageId?: string;
  amount?: number;
};

function getRazorpayAuthorization() {
  if (!razorpayKeyId || !razorpayKeySecret) {
    throw new Error("Razorpay API keys are missing.");
  }

  return `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreatePackageRechargePayload;
    const packageId = payload.packageId?.trim();
    const requestedAmount = Number(payload.amount ?? 0);

    if (!packageId || !Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json(
        { error: "Valid package ID and amount are required." },
        { status: 400 },
      );
    }

    const packageDocument = await getFirestoreDocument(signaturePackageCollection, packageId);
    const packageAmount = getFirestoreNumber(packageDocument, "amount");
    const customerName = getFirestoreString(packageDocument, "customerName");
    const phoneNumber = getFirestoreString(packageDocument, "phoneNumber");
    const planName = getFirestoreString(packageDocument, "planName");
    const status = getFirestoreString(packageDocument, "status");

    if (status === "cancelled") {
      return NextResponse.json(
        { error: "This package is cancelled and cannot be recharged." },
        { status: 400 },
      );
    }

    if (packageAmount <= 0 || packageAmount !== requestedAmount) {
      return NextResponse.json(
        { error: "Recharge amount does not match this package." },
        { status: 400 },
      );
    }

    const amountInPaise = Math.round(packageAmount * 100);
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: getRazorpayAuthorization(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: packageId.slice(0, 40),
        notes: {
          packageId,
          customerName,
          phoneNumber,
          planName,
          type: "signature_package_recharge",
        },
      }),
    });
    const result = await response.json();

    if (!response.ok || !result.id) {
      return NextResponse.json(
        {
          error:
            result.error?.description ??
            "Unable to create Razorpay package recharge.",
        },
        { status: 400 },
      );
    }

    await updateFirestoreDocument(signaturePackageCollection, packageId, {
      razorpayRechargeOrderId: { stringValue: result.id },
      razorpayRechargeAmount: { integerValue: String(amountInPaise) },
      razorpayCurrency: { stringValue: "INR" },
      paymentStatus: { stringValue: "pending" },
      updatedAt: { timestampValue: new Date().toISOString() },
    });

    return NextResponse.json({
      keyId: razorpayKeyId,
      razorpayOrderId: result.id,
      amount: result.amount,
      currency: result.currency,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start package recharge.",
      },
      { status: 500 },
    );
  }
}
