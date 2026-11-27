export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
/** Per-shop fulfilment of an order item. Shops set pending/packed/ready; admin also sets collected/cancelled. */
export const ITEM_STATUSES = ["pending", "packed", "ready", "collected", "cancelled"] as const;
export const SHOP_ITEM_STATUSES = ["pending", "packed", "ready"] as const;
export const ITEM_STATUS_LABELS: Record<string, string> = {
  pending: "To pack",
  packed: "Packed",
  ready: "Ready for pickup",
  collected: "Collected",
  cancelled: "Cancelled",
};
/** Orders shops can see: confirmed by admin at some point (older orders have no confirmedAt). */
export const SHOP_VISIBLE_ORDER = {
  OR: [{ confirmedAt: { not: null } }, { status: { in: ["confirmed", "shipped", "delivered"] } }],
};
export const CONDITIONS = ["new", "used", "refurbished"] as const;

export function newOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear() % 100}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
}
