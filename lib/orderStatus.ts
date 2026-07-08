export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "food_ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export const orderStatusSequence: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "food_ready",
  "out_for_delivery",
  "delivered",
];

export const adminOrderStatusOptions: OrderStatus[] = [
  "confirmed",
  "preparing",
  "food_ready",
  "out_for_delivery",
  "delivered",
];

export const statusLabels: Record<OrderStatus, string> = {
  pending: "Order Placed",
  confirmed: "Order Confirmed",
  preparing: "Preparing Food",
  food_ready: "Food Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const statusNotificationText: Record<OrderStatus, string> = {
  pending: "Your order has been placed and is awaiting confirmation.",
  confirmed: "Your order has been confirmed.",
  preparing: "Our chefs are preparing your delicious meal.",
  food_ready: "Your food is ready and will be dispatched shortly.",
  out_for_delivery: "Your order is on the way.",
  delivered: "Your order has been delivered. Thank you for choosing Kai Thuttu Kitchens.",
  cancelled: "Your order has been cancelled.",
};

export function formatStatus(status: OrderStatus | string) {
  return statusLabels[status as OrderStatus] ?? String(status).replaceAll("_", " ");
}
