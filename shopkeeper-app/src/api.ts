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

type RawResponse = { status: number; data: unknown };

function parseJson(text: string): unknown {
  try {
    return text.trim() ? JSON.parse(text) : null;
  } catch {
    return null; // empty or non-JSON body
  }
}

/**
 * Photo uploads on Android/iOS go through XMLHttpRequest. Expo replaces the global fetch with
 * expo/fetch, which rejects React Native's {uri, name, type} file parts ("Unsupported FormDataPart
 * implementation"). XMLHttpRequest still uses React Native's own networking, which streams the file
 * straight from disk.
 */
function xhrSend(url: string, body: FormData, headers: Record<string, string>, timeoutMs: number): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.timeout = timeoutMs;
    xhr.onload = () => resolve({ status: xhr.status, data: parseJson(xhr.responseText ?? "") });
    xhr.ontimeout = () => reject(new ApiError("The server took too long to answer. Please try again.", 408));
    xhr.onerror = () => reject(new ApiError("No internet connection, or the server is not reachable.", 0));
    xhr.send(body);
  });
}

async function fetchSend(url: string, init: RequestInit, headers: Record<string, string>, timeoutMs: number): Promise<RawResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, headers, signal: controller.signal });
    return { status: res.status, data: parseJson(await res.text()) };
  } catch (e) {
    if (controller.signal.aborted) {
      throw new ApiError("The server took too long to answer. Please try again.", 408);
    }
    const detail = e instanceof Error && e.message ? ` (${e.message})` : "";
    throw new ApiError(`No internet connection, or the server is not reachable.${detail}`, 0);
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const isForm = init.body instanceof FormData;
  if (init.body && !isForm) headers["Content-Type"] = "application/json";
  Object.assign(headers, init.headers as Record<string, string> | undefined);

  const url = `${API_URL}${path}`;
  const { status, data } =
    isForm && Platform.OS !== "web"
      ? await xhrSend(url, init.body as FormData, headers, timeoutMs)
      : await fetchSend(url, init, headers, timeoutMs);

  if (status < 200 || status >= 300) {
    if (status === 401 && path !== "/api/shop/auth/login") onUnauthorized?.();
    const fallback =
      status === 504 || status === 502 || status === 503
        ? "The server is busy or took too long. Please try again in a moment."
        : `Something went wrong (${status})`;
    const msg = (data as { error?: string } | null)?.error ?? fallback;
    throw new ApiError(msg, status);
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
  /**
   * Prefers the already-uploaded photo (small JSON request) and falls back to sending the file.
   * ?stream=1 makes the server send keep-alive spaces while the AI works, so slow answers
   * are not cut off by the network; errors then arrive in the body as {error, status}.
   */
  analyze: async (localUri: string, uploadedUrl?: string) => {
    const once = async () => {
      const body = uploadedUrl ? JSON.stringify({ imageUrl: uploadedUrl }) : await imageForm(localUri);
      const d = await request<ListingDraft & { error?: string; status?: number }>(
        "/api/shop/listings/analyze?stream=1",
        { method: "POST", body },
        90000,
      );
      if (d && typeof d.error === "string") throw new ApiError(d.error, d.status ?? 502);
      return d as ListingDraft;
    };
    try {
      return await once();
    } catch (e) {
      // One automatic retry when the connection dropped.
      if (e instanceof ApiError && e.status === 0) return once();
      throw e;
    }
  },
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
