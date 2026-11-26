import { randomBytes } from "crypto";

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function randomSuffix(n = 5) {
  return randomBytes(8).toString("base64url").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, n);
}

export function parseJSON<T>(s: string | null | undefined, fallback: T): T {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function productImages(p: { images: string }) {
  return parseJSON<string[]>(p.images, []);
}

export function discountPct(price: number, compare?: number | null) {
  if (!compare || compare <= price) return 0;
  return Math.round(((compare - price) / compare) * 100);
}
