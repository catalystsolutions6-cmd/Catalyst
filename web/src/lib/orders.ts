export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
export const CONDITIONS = ["new", "used", "refurbished"] as const;

export function newOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear() % 100}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
}
