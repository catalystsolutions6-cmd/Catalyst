/**
 * In-memory stand-in for the shop API, used only by the clickable preview build
 * (EXPO_PUBLIC_DEMO=1). Nothing here ships in the real app's behaviour.
 */
import data from "./demoData.json";
import type { Category, ListingDraft, Product, ProductInput, Shop, ShopOrder } from "./api";

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

const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
let orders: ShopOrder[] = [
  {
    id: "o1", orderNumber: "261127-4821", orderStatus: "confirmed", status: "pending", createdAt: ago(2), confirmedAt: ago(1), city: "Lahore",
    items: [{ id: "i1", title: products[0]?.title ?? "Dell Latitude 5420", image: products[0]?.images[0] ?? null, price: products[0]?.price ?? 85000, quantity: 1, status: "pending" }],
    total: products[0]?.price ?? 85000, commissionPercent: 5, payout: Math.round((products[0]?.price ?? 85000) * 0.95),
  },
  {
    id: "o2", orderNumber: "261126-1377", orderStatus: "confirmed", status: "ready", createdAt: ago(26), confirmedAt: ago(25), city: "Karachi",
    items: [{ id: "i2", title: products[1]?.title ?? "Logitech G102 Mouse", image: products[1]?.images[0] ?? null, price: products[1]?.price ?? 4500, quantity: 2, status: "ready" }],
    total: (products[1]?.price ?? 4500) * 2, commissionPercent: 5, payout: Math.round((products[1]?.price ?? 4500) * 2 * 0.95),
  },
  {
    id: "o3", orderNumber: "261124-9012", orderStatus: "delivered", status: "collected", createdAt: ago(80), confirmedAt: ago(79), city: "Lahore",
    items: [{ id: "i3", title: products[2]?.title ?? "Samsung 24\" Monitor", image: products[2]?.images[0] ?? null, price: products[2]?.price ?? 32000, quantity: 1, status: "collected" }],
    total: products[2]?.price ?? 32000, commissionPercent: 5, payout: Math.round((products[2]?.price ?? 32000) * 0.95),
  },
];

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
  listOrders: async () => {
    await wait(300);
    return orders.map((o) => ({ ...o, items: o.items.map((i) => ({ ...i })) }));
  },
  getOrder: async (id: string) => {
    const o = orders.find((x) => x.id === id);
    if (!o) throw new Error("Order not found");
    return { ...o, items: o.items.map((i) => ({ ...i })) };
  },
  setOrderStatus: async (id: string, status: "pending" | "packed" | "ready") => {
    await wait(300);
    orders = orders.map((o) => (o.id === id ? { ...o, status, items: o.items.map((i) => ({ ...i, status })) } : o));
    return { ...orders.find((o) => o.id === id)! };
  },
  updateProduct: async (id: string, patch: Partial<ProductInput>) => {
    await wait(300);
    const i = products.findIndex((p) => p.id === id);
    if (i < 0) throw new Error("Product not found");
    products[i] = { ...products[i], ...patch };
    return { ...products[i] };
  },
};
