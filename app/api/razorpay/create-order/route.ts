import { NextResponse } from "next/server";
import { updateOrderDocument } from "@/lib/firebaseServer";

export const runtime = "nodejs";

const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

type CreateRazorpayOrderPayload = {
  appOrderId?: string;
  amount?: number;
  customerName?: string;
  phoneNumber?: string;
};

function getRazorpayAuthorization() {
  if (!razorpayKeyId || !razorpayKeySecret) {
    throw new Error("Razorpay API keys are missing.");
  }

  return `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreateRazorpayOrderPayload;
    const appOrderId = payload.appOrderId?.trim();
    const amount = Number(payload.amount ?? 0);

    if (!appOrderId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Valid app order ID and amount are required." },
        { status: 400 },
      );
    }

    if (amount > 50000) {
      return NextResponse.json(
        { error: "Order amount is above the allowed website limit." },
        { status: 400 },
      );
    }

    const amountInPaise = Math.round(amount * 100);
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: getRazorpayAuthorization(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: appOrderId.slice(0, 40),
        notes: {
          appOrderId,
          customerName: payload.customerName ?? "",
          phoneNumber: payload.phoneNumber ?? "",
        },
      }),
    });
    const result = await response.json();

    if (!response.ok || !result.id) {
      return NextResponse.json(
        {
          error:
            result.error?.description ??
            "Unable to create Razorpay payment order.",
        },
        { status: 400 },
      );
    }

    await updateOrderDocument(appOrderId, {
      razorpayOrderId: { stringValue: result.id },
      razorpayAmount: { integerValue: String(amountInPaise) },
      razorpayCurrency: { stringValue: "INR" },
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
            : "Unable to start Razorpay payment.",
      },
      { status: 500 },
    );
  }
}
