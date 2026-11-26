import type { Prisma } from "@prisma/client";
import { db } from "./db";

export type CatalogParams = { q?: string; sort?: string; condition?: string; brand?: string };

export async function findProducts(base: Prisma.ProductWhereInput, p: CatalogParams) {
  const where: Prisma.ProductWhereInput = { ...base, status: "active", shop: { active: true } };
  const and: Prisma.ProductWhereInput[] = [];
  if (p.q) {
    for (const word of p.q.trim().split(/\s+/).slice(0, 6)) {
      and.push({ OR: [{ title: { contains: word, mode: "insensitive" } }, { brand: { contains: word, mode: "insensitive" } }, { model: { contains: word, mode: "insensitive" } }, { description: { contains: word, mode: "insensitive" } }] });
    }
  }
  if (p.condition) and.push({ condition: p.condition });
  const brandsSource = await db.product.findMany({ where: { ...where, AND: and }, select: { brand: true }, distinct: ["brand"] });
  if (p.brand) and.push({ brand: p.brand });
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    p.sort === "price_asc" ? { price: "asc" } : p.sort === "price_desc" ? { price: "desc" } : { createdAt: "desc" };
  const products = await db.product.findMany({ where: { ...where, AND: and }, orderBy, take: 100 });
  const brands = brandsSource.map((b) => b.brand).filter((b): b is string => !!b).sort();
  return { products, brands };
}
