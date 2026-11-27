import { db } from "@/lib/db";
import { getShopFromRequest, jsonError } from "@/lib/auth";
import { SHOP_ITEM_STATUSES, SHOP_VISIBLE_ORDER } from "@/lib/orders";
import { listShopOrders } from "@/lib/shopOrders";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const shop = await getShopFromRequest(req);
  if (!shop) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;
  const [order] = await listShopOrders(shop.id, shop.commission, id);
  return order ? Response.json(order) : jsonError("Order not found", 404);
}

/** Body {status: "pending" | "packed" | "ready"}: sets it on all of this shop's open items in the order. */
export async function PATCH(req: Request, ctx: Ctx) {
  const shop = await getShopFromRequest(req);
  if (!shop) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const status = String(body?.status ?? "");
  if (!SHOP_ITEM_STATUSES.includes(status as never)) return jsonError("status must be pending, packed or ready", 400);

  const order = await db.order.findFirst({ where: { id, ...SHOP_VISIBLE_ORDER, items: { some: { shopId: shop.id } } } });
  if (!order) return jsonError("Order not found", 404);
  if (order.status === "cancelled") return jsonError("This order was cancelled", 409);

  const { count } = await db.orderItem.updateMany({
    where: { orderId: id, shopId: shop.id, status: { in: [...SHOP_ITEM_STATUSES] } },
    data: { status },
  });
  if (count === 0) return jsonError("This order was already collected or cancelled", 409);
  const [updated] = await listShopOrders(shop.id, shop.commission, id);
  return Response.json(updated);
}
