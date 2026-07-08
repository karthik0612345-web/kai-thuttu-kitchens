import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Refund and Cancellation Policy | Kai Thuttu Kitchens",
  description: "Cancellation, refund, replacement, and complaint policy for Kai Thuttu Kitchens.",
};

const sections = [
  {
    title: "Order Cancellation by Customer",
    body: [
      "Customers may request cancellation only before the kitchen has accepted the order or started preparation. Once preparation has started, cancellation may not be possible because food is made fresh for the order.",
      "For urgent cancellation requests, contact us immediately by phone or WhatsApp with the order ID and phone number used for the order.",
    ],
  },
  {
    title: "Cancellation by Kai Thuttu Kitchens",
    body: [
      "We may cancel an order if items are unavailable, the delivery address is outside serviceable limits, customer details are incomplete, payment is not confirmed, the customer is unreachable, or there are operational, safety, weather, traffic, or kitchen capacity issues.",
      "If we cancel a prepaid order after payment is captured, we will initiate an eligible refund according to this policy.",
    ],
  },
  {
    title: "Refund Eligibility",
    body: [
      "Refunds may be considered for prepaid orders if the order is cancelled before preparation, if we cancel the order, if a paid item is unavailable and not replaced, if a wrong item is delivered, or if there is a verified major quality issue reported promptly.",
      "Refunds are generally not available for taste preference, spice level preference, delayed consumption, incorrect address provided by the customer, customer not reachable, refusal to accept delivery, or issues reported after unreasonable delay.",
    ],
  },
  {
    title: "Food Quality or Missing Item Complaints",
    body: [
      "Complaints about missing items, wrong items, leakage, damage, or quality concerns should be reported as soon as possible after delivery with order ID, phone number, and clear photos where applicable.",
      "After review, we may offer a replacement, partial refund, coupon, correction in next order, or other fair resolution depending on the issue.",
    ],
  },
  {
    title: "Refund Method and Timeline",
    body: [
      "Approved refunds for online payments will usually be initiated to the original payment method through the payment provider. Bank, UPI, wallet, or card processing timelines may vary depending on the provider.",
      "Cash on Delivery orders are not eligible for online reversal. Any approved COD adjustment may be handled as replacement, correction, coupon, or another method decided by Kai Thuttu Kitchens.",
    ],
  },
  {
    title: "Delivery Delays",
    body: [
      "Delivery times shown on the website are estimates. Delays due to traffic, weather, peak order volume, customer location, access restrictions, or events outside our control do not automatically qualify for refund.",
      "If a delay is excessive and caused by our side, we may review the order and offer an appropriate resolution.",
    ],
  },
  {
    title: "Rejected or Failed Delivery",
    body: [
      "If delivery fails because the customer provided an incorrect address, did not answer calls, was unavailable, refused the order, or prevented safe delivery, the order may be marked failed and refund may not be provided.",
      "Re-delivery, if possible, may require additional delivery charges and depends on food safety, delivery feasibility, and kitchen approval.",
    ],
  },
  {
    title: "Meal Box Plans and Add-ons",
    body: [
      "For Signature Meal Boxes, weekly and monthly plan orders may have separate preparation and scheduling commitments. Cancellations after confirmation may be limited once planning, procurement, or preparation has started.",
      "Healthy drinks and add-ons follow the same food order cancellation and refund rules unless separately confirmed by Kai Thuttu Kitchens.",
    ],
  },
  {
    title: "Refund Abuse and Final Decision",
    body: [
      "We may reject refund or replacement requests that appear fraudulent, repeated without valid reason, unsupported by evidence, or inconsistent with order and delivery records.",
      "All refund, replacement, and cancellation decisions will be made after reasonable review of order details, payment status, delivery status, and customer communication.",
    ],
  },
];

export default function RefundCancellationPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Orders"
      title="Refund and Cancellation Policy"
      intro="This policy explains when orders can be cancelled, when refunds or replacements may be considered, and how food delivery issues are handled by Kai Thuttu Kitchens."
      sections={sections}
    />
  );
}
