/**
 * In-memory stand-in for the shop API, used only by the clickable preview build
 * (EXPO_PUBLIC_DEMO=1). Nothing here ships in the real app's behaviour.
 */
import data from "./demoData.json";
import type { Category, ListingDraft, Product, ProductInput, Shop } from "./api";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let products: Product[] = (data.products as unknown as Product[]).map((p) => ({ ...p }));
let n = 0;

const SAMPLE_DRAFT: ListingDraft = {
  title: 'HP EliteBook 840 G5 Core i5 8th Gen 8GB 256GB SSD 14"',
  description:
    "HP EliteBook 840 G5 business laptop in clean used condition with light wear on the lid. Slim aluminium body with backlit keyboard. Charger included.",
  categorySlug: "laptops",
  brand: "HP",
  model: "EliteBook 840 G5",
  condition: "used",
  specs: { Processor: "Intel Core i5 8th Gen", RAM: "8GB", Storage: "256GB SSD", Display: '14" Full HD' },
  confidence: 0.86,
};

export const demoApi = {
  login: async (phone: string, password: string) => {
    await wait(500);
    if (!phone || !password) throw new Error("Enter your phone number and password.");
    return { token: "demo", shop: data.shop as Shop };
  },
  me: async () => ({ shop: data.shop as Shop }),
  categories: async () => data.categories as Category[],
  uploadImage: async (localUri: string) => {
    await wait(300);
    return { url: localUri };
  },
  analyze: async (_localUri: string) => {
    await wait(2200);
    return { ...SAMPLE_DRAFT, specs: { ...SAMPLE_DRAFT.specs } };
  },
  listProducts: async () => {
    await wait(200);
    return products.map((p) => ({ ...p }));
  },
  createProduct: async (p: ProductInput) => {
    await wait(500);
    const created: Product = { ...p, id: `demo_${++n}`, createdAt: new Date().toISOString() };
    products = [created, ...products];
    return created;
  },
  updateProduct: async (id: string, patch: Partial<ProductInput>) => {
    await wait(300);
    const i = products.findIndex((p) => p.id === id);
    if (i < 0) throw new Error("Product not found");
    products[i] = { ...products[i], ...patch };
    return { ...products[i] };
  },
};
