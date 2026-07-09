import crypto from "node:crypto";
import { NextResponse } from "next/server";

const fcmServerKey = process.env.FCM_SERVER_KEY;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const firebaseProjectId =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

const statusNotificationMap: Record<string, string> = {
  confirmed: "Your order has been confirmed.",
  preparing: "Our chefs are preparing your delicious meal.",
  food_ready: "Your food is ready and will be dispatched shortly.",
  out_for_delivery: "Your order is on the way.",
  delivered: "Your order has been delivered. Thank you for choosing Kai Thuttu Kitchens.",
};

function base64Url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken() {
  if (!firebaseClientEmail || !firebasePrivateKey) {
    throw new Error("Firebase service account credentials are missing.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: firebaseClientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );
  const unsignedJwt = `${header}.${claim}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedJwt);
  signer.end();
  const signature = signer
    .sign(firebasePrivateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const assertion = `${unsignedJwt}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.access_token) {
    throw new Error("Unable to authorize Firebase Cloud Messaging.");
  }

  return result.access_token as string;
}

async function sendFcmV1({
  token,
  orderId,
  title,
  body,
}: {
  token: string;
  orderId: string;
  title: string;
  body: string;
}) {
  if (!firebaseProjectId) {
    throw new Error("Firebase project ID is missing.");
  }

  const accessToken = await getAccessToken();
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title,
            body,
          },
          webpush: {
            notification: {
              icon: "/kai-thuttu-logo.jpeg",
            },
            fcm_options: {
              link: `${siteUrl}/order-tracking?orderId=${encodeURIComponent(orderId)}`,
            },
          },
        },
      }),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(result));
  }

  return result;
}

async function sendLegacyFcm({
  token,
  orderId,
  title,
  body,
}: {
  token: string;
  orderId: string;
  title: string;
  body: string;
}) {
  if (!fcmServerKey) {
    throw new Error("FCM server key is required.");
  }

  const message = {
    to: token,
    notification: {
      title,
      body,
      icon: "/kai-thuttu-logo.jpeg",
    },
    webpush: {
      fcm_options: {
        link: `${siteUrl}/order-tracking?orderId=${encodeURIComponent(orderId)}`,
      },
    },
  };

  const response = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${fcmServerKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(result));
  }

  return result;
}

export async function POST(request: Request) {
  const payload = await request.json();
  const { token, tokens, orderId, status } = payload as {
    token?: string;
    tokens?: string[];
    orderId?: string;
    status?: string;
  };
  const targetTokens = Array.from(
    new Set([...(tokens ?? []), ...(token ? [token] : [])].filter(Boolean)),
  );

  if (targetTokens.length === 0 || !orderId || !status) {
    return NextResponse.json(
      { error: "Missing notification token, orderId, or status." },
      { status: 400 },
    );
  }

  const title = `Order ${orderId} updated`;
  const body =
    statusNotificationMap[status] ??
    `Your order status is now ${status}. Tap to track your delivery.`;

  try {
    const results = await Promise.allSettled(
      targetTokens.map((targetToken) =>
        firebaseClientEmail && firebasePrivateKey
          ? sendFcmV1({ token: targetToken, orderId, title, body })
          : sendLegacyFcm({ token: targetToken, orderId, title, body }),
      ),
    );
    const sent = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - sent;

    return NextResponse.json({
      success: sent > 0,
      sent,
      failed,
      total: targetTokens.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "FCM request failed.",
      },
      { status: 200 },
    );
  }
}
