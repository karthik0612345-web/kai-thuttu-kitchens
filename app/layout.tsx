import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/components/CartContext";
import CartSidebar from "@/components/CartSidebar";
import { CustomerAuthGateProvider } from "@/components/CustomerAuthGate";
import Footer from "@/components/Footer";
import FirebaseConnectionLogger from "@/components/FirebaseConnectionLogger";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kai Thuttu Kitchens | Healthy Traditional Food Delivered Fresh",
  description:
    "Order healthy traditional South Indian food from Kai Thuttu Kitchens, delivered fresh to your doorstep.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <CustomerAuthGateProvider>
            <CartProvider>
              <FirebaseConnectionLogger />
              {children}
              <Footer />
              <CartSidebar />
            </CartProvider>
          </CustomerAuthGateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
