import type { Metadata } from "next";
import AdminOrderManagement from "@/components/AdminOrderManagement";
import AdminRoute from "@/components/AdminRoute";

export const metadata: Metadata = {
  title: "Admin Order Management | Kai Thuttu Kitchens",
  description: "Manage customer orders, update status, and send notifications from the admin dashboard.",
};

export default function AdminOrderManagementPage() {
  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <AdminRoute>
        <AdminOrderManagement />
      </AdminRoute>
    </main>
  );
}
