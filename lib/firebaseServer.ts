import crypto from "node:crypto";

const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY
  ?.trim()
  .replace(/^"|"[,]?$/g, "")
  .replace(/\\n/g, "\n");
const firebaseProjectId =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

type FirestoreFieldValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null };

export type FirestoreRestDocument = {
  name: string;
  fields?: Record<string, FirestoreFieldValue>;
};

function base64Url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export async function getFirebaseAccessToken(scope: string) {
  if (!firebaseClientEmail || !firebasePrivateKey) {
    throw new Error("Firebase service account credentials are missing.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: firebaseClientEmail,
      scope,
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

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedJwt}.${signature}`,
    }),
  });
  const result = await response.json();

  if (!response.ok || !result.access_token) {
    throw new Error("Unable to authorize Firebase service account.");
  }

  return result.access_token as string;
}

function getOrderDocumentUrl(orderId: string, fieldPaths?: string[]) {
  if (!firebaseProjectId) {
    throw new Error("Firebase project ID is missing.");
  }

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/orders/${encodeURIComponent(orderId)}`;

  if (!fieldPaths || fieldPaths.length === 0) {
    return baseUrl;
  }

  const searchParams = new URLSearchParams();
  fieldPaths.forEach((fieldPath) => {
    searchParams.append("updateMask.fieldPaths", fieldPath);
  });

  return `${baseUrl}?${searchParams.toString()}`;
}

export async function getOrderDocument(orderId: string) {
  const accessToken = await getFirebaseAccessToken(
    "https://www.googleapis.com/auth/datastore",
  );
  const response = await fetch(getOrderDocumentUrl(orderId), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message ?? "Unable to read Firestore order.");
  }

  return result as FirestoreRestDocument;
}

export async function updateOrderDocument(
  orderId: string,
  fields: Record<string, FirestoreFieldValue>,
) {
  const accessToken = await getFirebaseAccessToken(
    "https://www.googleapis.com/auth/datastore",
  );
  const fieldPaths = Object.keys(fields);
  const response = await fetch(getOrderDocumentUrl(orderId, fieldPaths), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message ?? "Unable to update Firestore order.");
  }

  return result as FirestoreRestDocument;
}

export function getFirestoreString(
  document: FirestoreRestDocument,
  fieldName: string,
) {
  const value = document.fields?.[fieldName];
  return value && "stringValue" in value ? value.stringValue : "";
}

export function getFirestoreNumber(
  document: FirestoreRestDocument,
  fieldName: string,
) {
  const value = document.fields?.[fieldName];
  if (!value) {
    return 0;
  }

  if ("integerValue" in value) {
    return Number(value.integerValue);
  }

  if ("doubleValue" in value) {
    return value.doubleValue;
  }

  return 0;
}
