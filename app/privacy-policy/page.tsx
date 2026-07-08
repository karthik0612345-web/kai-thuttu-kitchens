import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Kai Thuttu Kitchens",
  description: "Privacy policy for Kai Thuttu Kitchens customer and order data.",
};

const sections = [
  {
    title: "Information We Collect",
    body: [
      "When you use our website or place an order, we may collect your name, phone number, delivery address, order items, payment method, order status, order history, and messages you send to us.",
      "If you enable notifications, we may store a browser notification token linked to your order so we can send order status updates.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "We use customer information to accept orders, prepare food, deliver orders, contact customers, send order status updates, process payments, manage refunds, provide support, prevent misuse, and improve our menu and service.",
      "Admin users may use order and customer information to manage delivery, update order status, view sales, and handle customer service.",
    ],
  },
  {
    title: "Payments",
    body: [
      "Online payments may be processed through Razorpay or other payment providers. We do not store full card numbers, UPI PINs, CVV, or payment passwords on our website.",
      "Payment providers may collect and process payment information under their own privacy and security practices.",
    ],
  },
  {
    title: "Firebase, Hosting, and Technical Data",
    body: [
      "Our website uses Firebase services such as Firestore, Authentication, and Cloud Messaging to store orders, manage admin access, and support notifications.",
      "Basic technical information such as browser, device type, IP-related logs, timestamps, and error logs may be processed by hosting, Firebase, browser, or security systems to keep the service reliable and secure.",
    ],
  },
  {
    title: "WhatsApp and Communication",
    body: [
      "If you contact us through WhatsApp, phone, or another communication channel, the information you share may be used to respond to your order, delivery, catering, refund, or support request.",
      "WhatsApp and phone service providers may process communication data under their own policies.",
    ],
  },
  {
    title: "Sharing of Information",
    body: [
      "We do not sell customer personal information. We may share necessary information with delivery partners, payment processors, Firebase/hosting providers, support staff, legal authorities, or service providers only as needed to operate the business, comply with law, prevent fraud, or resolve disputes.",
      "Delivery persons may receive customer name, phone number, address, and order details required to complete delivery.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      "We keep order, customer, payment status, and support records for as long as reasonably needed for business, tax, accounting, legal, safety, dispute resolution, and service improvement purposes.",
      "Notification tokens may be updated or removed when they are no longer needed or when permissions are withdrawn.",
    ],
  },
  {
    title: "Customer Choices",
    body: [
      "You may choose not to allow browser notifications. You may also contact us to request correction of order contact details or ask questions about your personal information.",
      "Some information is required to complete orders. If you do not provide required details such as phone number or address, we may not be able to accept or deliver the order.",
    ],
  },
  {
    title: "Security",
    body: [
      "We use reasonable technical and organizational safeguards such as Firebase security rules, authenticated admin access, and restricted admin routes.",
      "No online system is completely risk-free. Customers should avoid sharing payment passwords, OTPs, or sensitive unrelated information through the website or chat.",
    ],
  },
  {
    title: "Policy Updates",
    body: [
      "We may update this Privacy Policy to reflect changes in our website, ordering process, technology, or legal requirements.",
      "The latest version will be posted on this page with the updated date.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="This policy explains what information Kai Thuttu Kitchens collects, why we use it, how we share it, and the choices customers have."
      sections={sections}
    />
  );
}
