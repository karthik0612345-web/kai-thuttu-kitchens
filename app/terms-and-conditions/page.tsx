import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Terms and Conditions | Kai Thuttu Kitchens",
  description: "Terms and conditions for ordering from Kai Thuttu Kitchens.",
};

const sections = [
  {
    title: "Acceptance of Terms",
    body: [
      "By accessing our website, placing an order, using our cart, contacting us on WhatsApp, or receiving delivery from Kai Thuttu Kitchens, you agree to these Terms and Conditions.",
      "If you do not agree with these terms, please do not place an order through the website or any connected ordering channel.",
    ],
  },
  {
    title: "Orders and Availability",
    body: [
      "All orders are subject to item availability, kitchen capacity, delivery feasibility, and confirmation by Kai Thuttu Kitchens.",
      "Menu items, prices, portion descriptions, images, ingredients, packaging, offers, and availability may change without prior notice. Out-of-stock items cannot be ordered even if visible on the menu.",
      "Healthy Food combo items are sold only as the applicable combo offer shown on the menu, not as individual standalone items unless expressly mentioned.",
    ],
  },
  {
    title: "Pricing, Taxes, and Payments",
    body: [
      "Prices shown on the website are in Indian Rupees. The final payable amount may include item price, delivery charges, packaging charges, taxes, platform or payment charges, discounts, or other applicable charges shown before confirmation.",
      "We may support Cash on Delivery, UPI, Razorpay, or other payment methods depending on availability. Online payment confirmation does not guarantee acceptance of an order if the item is unavailable or the delivery address is not serviceable.",
    ],
  },
  {
    title: "Delivery and Customer Responsibilities",
    body: [
      "Customers must provide accurate name, phone number, delivery address, and order details. Delays or failed delivery caused by incorrect address, unreachable phone number, unavailable customer, restricted entry, or unsafe delivery conditions are the customer's responsibility.",
      "Estimated delivery time is only an estimate. Actual delivery may vary due to food preparation time, order volume, traffic, weather, local restrictions, or events outside our control.",
    ],
  },
  {
    title: "Food Quality, Allergies, and Consumption",
    body: [
      "Our food is prepared in a kitchen that may handle grains, dairy, nuts, eggs, meat, spices, and other allergens. Customers with allergies or dietary restrictions must contact us before ordering.",
      "Food should be consumed soon after delivery. Kai Thuttu Kitchens is not responsible for quality issues caused by delayed consumption, improper storage, reheating, or handling after delivery.",
    ],
  },
  {
    title: "Cancellations, Refunds, and Complaints",
    body: [
      "Cancellations, refunds, replacements, and complaints are governed by our Refund and Cancellation Policy.",
      "Food quality or missing-item complaints should be reported immediately with order ID, photos where relevant, and contact details so we can review the issue fairly.",
    ],
  },
  {
    title: "Website and Account Use",
    body: [
      "You agree not to misuse the website, attempt unauthorized access, interfere with Firebase services, manipulate prices, submit false orders, or use the website for unlawful or abusive activity.",
      "Admin pages are restricted to authorized Kai Thuttu Kitchens users only. Unauthorized access attempts may result in blocking and further action where appropriate.",
    ],
  },
  {
    title: "Limitation of Liability",
    body: [
      "To the maximum extent permitted by law, Kai Thuttu Kitchens will not be liable for indirect, incidental, special, or consequential losses arising from website use, order delays, payment gateway issues, third-party service failures, or events outside our reasonable control.",
      "Our maximum liability for an accepted claim will generally be limited to the amount paid for the specific affected order.",
    ],
  },
  {
    title: "Changes to Terms",
    body: [
      "We may update these Terms and Conditions from time to time. Updated terms will be posted on this page with the latest effective date.",
      "Continued use of the website or ordering after updates means you accept the revised terms.",
    ],
  },
];

export default function TermsAndConditionsPage() {
  return (
    <PolicyPage
      eyebrow="Legal"
      title="Terms and Conditions"
      intro="These terms explain how orders, payments, delivery, food availability, customer responsibilities, and website use work for Kai Thuttu Kitchens."
      sections={sections}
    />
  );
}
