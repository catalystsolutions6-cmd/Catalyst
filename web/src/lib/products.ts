import { z } from "zod";
import type { Product } from "@prisma/client";
import { db } from "./db";
import { parseJSON, randomSuffix, slugify } from "./util";
import { CONDITIONS } from "./orders";
import { isOwnImageUrl } from "./uploads";

const imageUrl = z
  .string()
  .max(500)
  .refine((u) => isOwnImageUrl(u) || /^\/seed\/[A-Za-z0-9._-]+$/.test(u), "use an image url returned by /api/shop/uploads");

export const productInput = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).default(""),
  categorySlug: z.string(),
  brand: z.string().trim().max(80).nullish(),
  model: z.string().trim().max(120).nullish(),
  condition: z.enum(CONDITIONS).default("new"),
  specs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]).transform(String)).default({}),
  price: z.coerce.number().int().positive(),
  comparePrice: z.coerce.number().int().positive().nullish(),
  stock: z.coerce.number().int().min(0).default(1),
  images: z.array(imageUrl).max(10).default([]),
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const productPatch = productInput.partial();

export async function uniqueProductSlug(title: string) {
  const base = slugify(title) || "product";
  for (;;) {
    const slug = `${base}-${randomSuffix(5)}`;
    if (!(await db.product.findUnique({ where: { slug } }))) return slug;
  }
}

export async function assertCategory(slug: string | undefined) {
  if (!slug) return true;
  return !!(await db.category.findUnique({ where: { slug } }));
}

/** Shape returned to the shopkeeper app. */
export function serializeProduct(p: Product) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    categorySlug: p.categorySlug,
    brand: p.brand,
    model: p.model,
    condition: p.condition,
    specs: parseJSON<Record<string, string>>(p.specs, {}),
    price: p.price,
    comparePrice: p.comparePrice,
    stock: p.stock,
    images: parseJSON<string[]>(p.images, []),
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
