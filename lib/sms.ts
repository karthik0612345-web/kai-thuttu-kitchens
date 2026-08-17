const msg91AuthKey = process.env.MSG91_AUTH_KEY;
const msg91SenderId = process.env.MSG91_SENDER_ID;
const packageExpiryTemplateId = process.env.MSG91_PACKAGE_EXPIRY_TEMPLATE_ID;
const orderStatusTemplateId = process.env.MSG91_ORDER_STATUS_TEMPLATE_ID;
const msg91FlowUrl = "https://control.msg91.com/api/v5/flow";
const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

type SmsResult =
  | {
      sent: true;
      provider: "msg91";
      result: unknown;
    }
  | {
      sent: false;
      provider: "msg91";
      reason: string;
    };

function normalizeMsg91Mobile(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  return digits;
}

function cleanSmsValue(value: string | number | null | undefined) {
  return String(value ?? "").trim().slice(0, 160);
}

export function isSmsConfigured(templateId?: string) {
  return Boolean(msg91AuthKey && templateId);
}

async function sendMsg91Sms({
  phoneNumber,
  templateId,
  variables,
}: {
  phoneNumber: string;
  templateId?: string;
  variables: Record<string, string | number | null | undefined>;
}): Promise<SmsResult> {
  if (!msg91AuthKey) {
    return { sent: false, provider: "msg91", reason: "MSG91_AUTH_KEY is missing." };
  }

  if (!templateId) {
    return { sent: false, provider: "msg91", reason: "MSG91 template ID is missing." };
  }

  const mobile = normalizeMsg91Mobile(phoneNumber);

  if (mobile.length < 12) {
    return { sent: false, provider: "msg91", reason: "Customer mobile number is invalid." };
  }

  const recipient = Object.fromEntries(
    Object.entries(variables).map(([key, value]) => [key, cleanSmsValue(value)]),
  );

  const response = await fetch(msg91FlowUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      authkey: msg91AuthKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      template_id: templateId,
      ...(msg91SenderId ? { sender: msg91SenderId } : {}),
      short_url: "0",
      recipients: [
        {
          mobiles: mobile,
          ...recipient,
        },
      ],
    }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result?.type === "error") {
    throw new Error(
      typeof result?.message === "string"
        ? result.message
        : "MSG91 SMS request failed.",
    );
  }

  return { sent: true, provider: "msg91", result };
}

export async function sendPackageExpirySms({
  phoneNumber,
  customerName,
  planName,
  expiryDate,
  packageId,
}: {
  phoneNumber: string;
  customerName: string;
  planName: string;
  expiryDate: string;
  packageId: string;
}) {
  const rechargeLink = `${siteUrl}/signature-packages?packageId=${encodeURIComponent(packageId)}`;

  return sendMsg91Sms({
    phoneNumber,
    templateId: packageExpiryTemplateId,
    variables: {
      VAR1: customerName || "Customer",
      VAR2: planName,
      VAR3: expiryDate,
      VAR4: rechargeLink,
    },
  });
}

export async function sendOrderStatusSms({
  phoneNumber,
  orderId,
  message,
}: {
  phoneNumber: string;
  orderId: string;
  message: string;
}) {
  const trackingLink = `${siteUrl}/order-tracking?orderId=${encodeURIComponent(orderId)}`;

  return sendMsg91Sms({
    phoneNumber,
    templateId: orderStatusTemplateId,
    variables: {
      VAR1: orderId,
      VAR2: message,
      VAR3: trackingLink,
    },
  });
}
