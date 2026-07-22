import { NextResponse } from "next/server";
import { getFirebaseAccessToken, updateFirestoreDocument } from "@/lib/firebaseServer";
import {
  signaturePackageCollection,
  signaturePackageExpiryNoticeDays,
} from "@/lib/signaturePackages";

export const runtime = "nodejs";

const firebaseProjectId =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const cronSecret = process.env.CRON_SECRET;

type FirestoreRunQueryResult = {
  document?: {
    name: string;
    fields?: {
      packageId?: { stringValue?: string };
      customerName?: { stringValue?: string };
      planName?: { stringValue?: string };
      expiryDate?: { timestampValue?: string };
      lastExpiryNotificationAt?: { timestampValue?: string };
      notificationToken?: { stringValue?: string };
      notificationTokens?: {
        arrayValue?: {
          values?: { stringValue?: string }[];
        };
      };
    };
  };
};

function getDocumentId(documentName: string) {
  return decodeURIComponent(documentName.split("/").pop() ?? "");
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getPackageTokens(document: NonNullable<FirestoreRunQueryResult["document"]>) {
  const tokens = [
    document.fields?.notificationToken?.stringValue,
    ...(document.fields?.notificationTokens?.arrayValue?.values ?? []).map(
      (value) => value.stringValue,
    ),
  ].filter((token): token is string => Boolean(token));

  return Array.from(new Set(tokens));
}

async function sendPackageExpiryNotification({
  token,
  packageId,
  planName,
  expiryDate,
}: {
  token: string;
  packageId: string;
  planName: string;
  expiryDate: string;
}) {
  if (!firebaseProjectId) {
    throw new Error("Firebase project ID is missing.");
  }

  const accessToken = await getFirebaseAccessToken(
    "https://www.googleapis.com/auth/firebase.messaging",
  );
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
            title: "Signature Meal Box expiring soon",
            body: `${planName} expires on ${expiryDate}. Recharge now to continue your monthly meals.`,
          },
          webpush: {
            notification: {
              icon: "/kai-thuttu-logo.jpeg",
            },
            fcm_options: {
              link: `${siteUrl}/signature-packages?packageId=${encodeURIComponent(packageId)}`,
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

async function getExpiringPackages() {
  if (!firebaseProjectId) {
    throw new Error("Firebase project ID is missing.");
  }

  const accessToken = await getFirebaseAccessToken(
    "https://www.googleapis.com/auth/datastore",
  );
  const now = new Date();
  const noticeDate = new Date(now);
  noticeDate.setDate(noticeDate.getDate() + signaturePackageExpiryNoticeDays);

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: signaturePackageCollection }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: "status" },
                    op: "EQUAL",
                    value: { stringValue: "active" },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "expiryDate" },
                    op: "GREATER_THAN_OR_EQUAL",
                    value: { timestampValue: now.toISOString() },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "expiryDate" },
                    op: "LESS_THAN_OR_EQUAL",
                    value: { timestampValue: noticeDate.toISOString() },
                  },
                },
              ],
            },
          },
        },
      }),
    },
  );
  const result = (await response.json()) as FirestoreRunQueryResult[];

  if (!response.ok) {
    throw new Error(JSON.stringify(result));
  }

  return result
    .map((entry) => entry.document)
    .filter((document): document is NonNullable<FirestoreRunQueryResult["document"]> =>
      Boolean(document),
    );
}

export async function GET(request: Request) {
  if (cronSecret) {
    const authorization = request.headers.get("authorization");

    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  try {
    const packages = await getExpiringPackages();
    const today = startOfToday();
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const pkg of packages) {
      const packageDocumentId = getDocumentId(pkg.name);
      const packageId = pkg.fields?.packageId?.stringValue ?? packageDocumentId;
      const planName = pkg.fields?.planName?.stringValue ?? "Signature Meal Box";
      const expiryDate = pkg.fields?.expiryDate?.timestampValue
        ? new Date(pkg.fields.expiryDate.timestampValue).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "soon";
      const lastSentAt = pkg.fields?.lastExpiryNotificationAt?.timestampValue
        ? new Date(pkg.fields.lastExpiryNotificationAt.timestampValue)
        : null;

      if (lastSentAt && lastSentAt >= today) {
        skipped += 1;
        continue;
      }

      const tokens = getPackageTokens(pkg);

      if (tokens.length === 0) {
        skipped += 1;
        continue;
      }

      const results = await Promise.allSettled(
        tokens.map((token) =>
          sendPackageExpiryNotification({
            token,
            packageId,
            planName,
            expiryDate,
          }),
        ),
      );
      const packageSent = results.filter((result) => result.status === "fulfilled").length;

      sent += packageSent;
      failed += results.length - packageSent;

      if (packageSent > 0) {
        await updateFirestoreDocument(signaturePackageCollection, packageDocumentId, {
          lastExpiryNotificationAt: { timestampValue: new Date().toISOString() },
          updatedAt: { timestampValue: new Date().toISOString() },
        });
      }
    }

    return NextResponse.json({
      success: true,
      checked: packages.length,
      sent,
      skipped,
      failed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to send package expiry notifications.",
      },
      { status: 500 },
    );
  }
}
