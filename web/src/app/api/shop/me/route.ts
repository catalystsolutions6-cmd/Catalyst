import { getShopFromRequest, jsonError } from "@/lib/auth";

export async function GET(req: Request) {
  const shop = await getShopFromRequest(req);
  if (!shop) return jsonError("Unauthorized", 401);
  return Response.json({
    shop: { id: shop.id, name: shop.name, slug: shop.slug, market: shop.market, shopNumber: shop.shopNumber, phone: shop.phone },
  });
}
