import { Suspense } from "react";
import OrderTrackingClient from "@/components/OrderTrackingClient";

export const dynamic = "force-dynamic";

export default function OrderTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#111111] text-white">
          <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-5 text-center">
            <div>
              <p className="text-lg font-black text-[#E9B44C]">Loading order tracking…</p>
            </div>
          </div>
        </div>
      }
    >
      <OrderTrackingClient />
    </Suspense>
  );
}
