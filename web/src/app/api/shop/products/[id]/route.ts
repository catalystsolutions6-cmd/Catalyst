import { db } from "@/lib/db";
import { getShopFromRequest, jsonError } from "@/lib/auth";
import { assertCategory, productPatch, serializeProduct } from "@/lib/products";

type Ctx = { params: Promise<{ id: string }> };

async function own(req: Request, ctx: Ctx) {
  const shop = await getShopFromRequest(req);
  if (!shop) return { err: jsonError("Unauthorized", 401) };
  const { id } = await ctx.params;
  const product = await db.product.findFirst({ where: { id, shopId: shop.id } });
  if (!product) return { err: jsonError("Product not found", 404) };
  return { product };
}

export async function GET(req: Request, ctx: Ctx) {
  const r = await own(req, ctx);
  return r.err ?? Response.json(serializeProduct(r.product));
}

export async function PATCH(req: Request, ctx: Ctx) {
  const r = await own(req, ctx);
  if (r.err) return r.err;
  const parsed = productPatch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 400);
  const { specs, images, ...rest } = parsed.data;
  if (!(await assertCategory(rest.categorySlug))) return jsonError("Unknown categorySlug", 400);
  const product = await db.product.update({
    where: { id: r.product.id },
    data: {
      ...rest,
      ...(specs ? { specs: JSON.stringify(specs) } : {}),
      ...(images ? { images: JSON.stringify(images) } : {}),
    },
  });
  return Response.json(serializeProduct(product));
}

export async function DELETE(req: Request, ctx: Ctx) {
  const r = await own(req, ctx);
  if (r.err) return r.err;
  await db.product.update({ where: { id: r.product.id }, data: { status: "archived" } });
  return Response.json({ ok: true });
}
