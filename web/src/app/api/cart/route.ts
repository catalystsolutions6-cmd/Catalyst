import { db } from "@/lib/db";
import { productImages } from "@/lib/util";

// Returns fresh price/stock for the items in a customer's cart. Never exposes the shop.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.slice(0, 50).map(String) : [];
  const products = await db.product.findMany({ where: { id: { in: ids }, status: "active", shop: { active: true } } });
  return Response.json(
    products.map((p) => ({ id: p.id, slug: p.slug, title: p.title, price: p.price, stock: p.stock, image: productImages(p)[0] ?? null })),
  );
}
