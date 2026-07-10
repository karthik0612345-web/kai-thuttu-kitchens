import type { Metadata } from "next";
import DeliveryDashboard from "@/components/DeliveryDashboard";
import DeliveryRoute from "@/components/DeliveryRoute";

export const metadata: Metadata = {
  title: "Delivery Dashboard | Kai Thuttu Kitchens",
  description: "Delivery order dashboard for Kai Thuttu Kitchens.",
};

export default function DeliveryPage() {
  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <DeliveryRoute>
        <DeliveryDashboard />
      </DeliveryRoute>
    </main>
  );
}
