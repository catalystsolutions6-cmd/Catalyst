import { getShopFromRequest, jsonError } from "@/lib/auth";
import { listShopOrders } from "@/lib/shopOrders";

/** Orders containing this shop's products, once admin has confirmed them with the customer. */
export async function GET(req: Request) {
  const shop = await getShopFromRequest(req);
  if (!shop) return jsonError("Unauthorized", 401);
  return Response.json(await listShopOrders(shop.id, shop.commission));
}
