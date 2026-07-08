import type { Metadata } from "next";
import AdminDashboard from "@/components/AdminDashboard";
import AdminRoute from "@/components/AdminRoute";

export const metadata: Metadata = {
  title: "Admin Dashboard | Kai Thuttu Kitchens",
  description: "Protected admin dashboard for Kai Thuttu Kitchens.",
};

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <AdminRoute>
        <AdminDashboard />
      </AdminRoute>
    </main>
  );
}
