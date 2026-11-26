import { db } from "@/lib/db";
import { getShopFromRequest, jsonError } from "@/lib/auth";
import { assertCategory, productInput, serializeProduct, uniqueProductSlug } from "@/lib/products";

export async function GET(req: Request) {
  const shop = await getShopFromRequest(req);
  if (!shop) return jsonError("Unauthorized", 401);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const products = await db.product.findMany({
    where: { shopId: shop.id, ...(status ? { status } : { status: { not: "archived" } }) },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(products.map(serializeProduct));
}

export async function POST(req: Request) {
  const shop = await getShopFromRequest(req);
  if (!shop) return jsonError("Unauthorized", 401);
  const parsed = productInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 400);
  const d = parsed.data;
  if (!(await assertCategory(d.categorySlug))) return jsonError("Unknown categorySlug", 400);
  const product = await db.product.create({
    data: {
      ...d,
      specs: JSON.stringify(d.specs),
      images: JSON.stringify(d.images),
      slug: await uniqueProductSlug(d.title),
      shopId: shop.id,
    },
  });
  return Response.json(serializeProduct(product), { status: 201 });
}
