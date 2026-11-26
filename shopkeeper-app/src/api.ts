import Constants from "expo-constants";
import { Platform } from "react-native";

/** API base URL: EXPO_PUBLIC_API_URL wins (e.g. a local backend), then app.json "extra.apiUrl" (the live site). */
export const API_URL: string = (
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "https://catalyst-37cd.vercel.app"
).replace(/\/$/, "");

export type Condition = "new" | "used" | "refurbished";
export type ProductStatus = "active" | "draft";

export interface Shop {
  id: string;
  name: string;
  slug: string;
}
export interface Category {
  slug: string;
  name: string;
}
export interface ListingDraft {
  title: string;
  description: string;
  categorySlug: string;
  brand: string;
  model: string;
  condition: Condition;
  specs: Record<string, string>;
  confidence: number;
}
export interface ProductInput {
  title: string;
  description: string;
  categorySlug: string;
  brand: string;
  model: string;
  condition: Condition;
  specs: Record<string, string>;
  price: number;
  stock: number;
  images: string[];
  status: ProductStatus;
}
export interface Product extends ProductInput {
  id: string;
  createdAt?: string;
}

export const FALLBACK_CATEGORIES: Category[] = [
  { slug: "laptops", name: "Laptops" },
  { slug: "desktops", name: "Desktops" },
  { slug: "monitors-lcds", name: "Monitors & LCDs" },
  { slug: "headphones", name: "Headphones" },
  { slug: "accessories", name: "Accessories" },
  { slug: "gaming", name: "Gaming" },
  { slug: "storage", name: "Storage" },
  { slug: "networking", name: "Networking" },
  { slug: "mobiles-tablets", name: "Mobiles & Tablets" },
];

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

/** Turn a relative upload path like /uploads/abc.jpg into a full URL. */
export function imageUrl(url: string): string {
  return /^(https?:\/\/|file:|data:|blob:)/.test(url) ? url : `${API_URL}${url}`;
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (init.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string>) },
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new ApiError("The server took too long to answer. Please try again.", 408);
    }
    throw new ApiError("No internet connection, or the server is not reachable.", 0);
  } finally {
    clearTimeout(timer);
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // empty or non-JSON body
  }
  if (!res.ok) {
    if (res.status === 401 && path !== "/api/shop/auth/login") onUnauthorized?.();
    const fallback =
      res.status === 504 || res.status === 502 || res.status === 503
        ? "The server is busy or took too long. Please try again in a moment."
        : `Something went wrong (${res.status})`;
    const msg = (data as { error?: string } | null)?.error ?? fallback;
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

async function imageForm(localUri: string): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === "web") {
    // Browser previews: the picker returns blob:/data: URIs, so send a real Blob.
    const blob = await (await fetch(localUri)).blob();
    form.append("image", blob, "photo.jpg");
  } else {
    // React Native's FormData accepts {uri, name, type} file objects.
    form.append("image", { uri: localUri, name: "photo.jpg", type: "image/jpeg" } as unknown as Blob);
  }
  return form;
}

const realApi = {
  login: (phone: string, password: string) =>
    request<{ token: string; shop: Shop }>("/api/shop/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    }),
  me: () => request<{ shop: Shop }>("/api/shop/me"),
  categories: () => request<Category[]>("/api/categories"),
  uploadImage: async (localUri: string) =>
    request<{ url: string }>("/api/shop/uploads", { method: "POST", body: await imageForm(localUri) }, 60000),
  analyze: async (localUri: string) =>
    request<ListingDraft>("/api/shop/listings/analyze", { method: "POST", body: await imageForm(localUri) }, 90000),
  listProducts: () => request<Product[]>("/api/shop/products"),
  createProduct: (p: ProductInput) =>
    request<Product>("/api/shop/products", { method: "POST", body: JSON.stringify(p) }),
  updateProduct: (id: string, patch: Partial<ProductInput>) =>
    request<Product>(`/api/shop/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
};

/** EXPO_PUBLIC_DEMO=1 builds a self-contained clickable preview with sample data and no server. */
export const IS_DEMO = process.env.EXPO_PUBLIC_DEMO === "1";
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const api: typeof realApi = IS_DEMO ? require("./demoApi").demoApi : realApi;
