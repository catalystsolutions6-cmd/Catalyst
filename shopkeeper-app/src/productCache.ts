import type { Product } from "./api";

/** Products from the last list fetch, so the edit screen can open instantly (the API has no GET-by-id). */
const cache = new Map<string, Product>();

export const productCache = {
  setAll(list: Product[]) {
    cache.clear();
    for (const p of list) cache.set(p.id, p);
  },
  get: (id: string) => cache.get(id),
  put: (p: Product) => cache.set(p.id, p),
};
