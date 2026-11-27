import { db } from "@/lib/db";
import { SHOP_VISIBLE_ORDER } from "@/lib/orders";

/** What a shop sees of an order: only its own items, no customer contact details (the platform delivers). */
export type ShopOrder = {
  id: string;
  orderNumber: string;
  orderStatus: string;
  /** Overall status of this shop's part: pending | packed | ready | collected | cancelled */
  status: string;
  createdAt: string;
  confirmedAt: string | null;
  city: string;
  items: { id: string; title: string; image: string | null; price: number; quantity: number; status: string }[];
  total: number;
  commissionPercent: number;
  payout: number;
};

const PROGRESS = ["pending", "packed", "ready", "collected"];

function shopStatus(orderStatus: string, itemStatuses: string[]) {
  if (orderStatus === "cancelled") return "cancelled";
  const live = itemStatuses.filter((s) => s !== "cancelled");
  if (live.length === 0) return "cancelled";
  // The least advanced item decides: the order is only "ready" when every item is.
  return PROGRESS[Math.min(...live.map((s) => Math.max(0, PROGRESS.indexOf(s))))];
}

export async function listShopOrders(shopId: string, commission: number, orderId?: string): Promise<ShopOrder[]> {
  const orders = await db.order.findMany({
    where: { ...SHOP_VISIBLE_ORDER, ...(orderId ? { id: orderId } : {}), items: { some: { shopId } } },
    include: { items: { where: { shopId } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return orders.map((o) => {
    const live = o.items.filter((i) => i.status !== "cancelled" && o.status !== "cancelled");
    const total = live.reduce((t, i) => t + i.price * i.quantity, 0);
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      orderStatus: o.status,
      status: shopStatus(o.status, o.items.map((i) => i.status)),
      createdAt: o.createdAt.toISOString(),
      confirmedAt: o.confirmedAt?.toISOString() ?? null,
      city: o.city,
      items: o.items.map((i) => ({ id: i.id, title: i.title, image: i.image, price: i.price, quantity: i.quantity, status: i.status })),
      total,
      commissionPercent: commission,
      payout: Math.round(total * (1 - commission / 100)),
    };
  });
}
