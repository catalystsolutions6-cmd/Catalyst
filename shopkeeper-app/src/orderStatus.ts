import type { OrderStatus } from "./api";
import { C } from "./ui";

export const ORDER_STATUS: Record<OrderStatus, { label: string; color: string; hint: string }> = {
  pending: { label: "To pack", color: C.warning, hint: "Confirmed with the customer. Pack it and mark it ready." },
  packed: { label: "Packed", color: C.primary, hint: "Mark it ready when it can be picked up." },
  ready: { label: "Ready for pickup", color: "#7C3AED", hint: "Our rider will collect it from your shop." },
  collected: { label: "Collected", color: C.success, hint: "Picked up by our rider." },
  cancelled: { label: "Cancelled", color: C.danger, hint: "This order was cancelled. Do not send it." },
};

export function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" });
}
