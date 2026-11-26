/**
 * Dev mock of the marketplace shop API (same shapes as the real backend), so the
 * app can be built and tested before the marketplace backend is live.
 *
 *   npx tsx mock-server.ts            # http://localhost:4000
 *   login: phone 03001234567 / password demo1234
 *
 * /api/shop/listings/analyze calls Gemini if GEMINI_API_KEY is set, else returns a sample draft.
 */
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { analyzeProductImage, AnalyzeError, CATEGORY_SLUGS } from "./analyze.ts";

const PORT = Number(process.env.PORT ?? 4000);
const shop = { id: "shop_1", name: "Ali Computers", slug: "ali-computers" };
const USER = { phone: "03001234567", password: "demo1234" };
const tokens = new Set<string>();
const uploads = new Map<string, { bytes: Buffer; type: string }>();
type Product = Record<string, unknown> & { id: string; shopId: string };
const products: Product[] = [];

const CATEGORY_NAMES: Record<string, string> = {
  laptops: "Laptops",
  desktops: "Desktops",
  "monitors-lcds": "Monitors & LCDs",
  headphones: "Headphones",
  accessories: "Accessories",
  gaming: "Gaming",
  storage: "Storage",
  networking: "Networking",
  "mobiles-tablets": "Mobiles & Tablets",
};

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
  });
  res.end(JSON.stringify(body));
}

function toRequest(req: IncomingMessage): Request {
  return new Request(`http://localhost${req.url}`, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body: req as unknown as ReadableStream,
    // @ts-expect-error node-only option for streaming bodies
    duplex: "half",
  });
}

async function readImage(req: IncomingMessage): Promise<{ bytes: Buffer; type: string } | null> {
  const form = await toRequest(req).formData();
  const file = form.get("image");
  if (!file || typeof file === "string") return null;
  return { bytes: Buffer.from(await file.arrayBuffer()), type: file.type || "image/jpeg" };
}

const SAMPLE = {
  title: "HP EliteBook 840 G5 Core i5 8th Gen 8GB 256GB SSD 14\"",
  description:
    "HP EliteBook 840 G5 business laptop in clean used condition with light wear on the lid. Slim aluminium body with backlit keyboard. Charger included.",
  categorySlug: "laptops",
  brand: "HP",
  model: "EliteBook 840 G5",
  condition: "used",
  specs: { Processor: "Intel Core i5 8th Gen", RAM: "8GB", Storage: "256GB SSD", Display: "14\" Full HD" },
  confidence: 0.6,
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    if (req.method === "OPTIONS") return send(res, 204, {});
    console.log(req.method, path);

    if (req.method === "GET" && path.startsWith("/uploads/")) {
      const f = uploads.get(path);
      if (!f) return send(res, 404, { error: "Not found" });
      res.writeHead(200, { "content-type": f.type, "access-control-allow-origin": "*" });
      return res.end(f.bytes);
    }
    if (req.method === "GET" && path === "/api/categories") {
      return send(res, 200, CATEGORY_SLUGS.map((slug) => ({ slug, name: CATEGORY_NAMES[slug] })));
    }
    if (req.method === "POST" && path === "/api/shop/auth/login") {
      const body = await toRequest(req).json();
      if (body.phone !== USER.phone || body.password !== USER.password) {
        return send(res, 401, { error: "Wrong phone number or password" });
      }
      const token = randomBytes(24).toString("hex");
      tokens.add(token);
      return send(res, 200, { token, shop });
    }

    // Everything below needs a token
    const auth = req.headers.authorization ?? "";
    if (!path.startsWith("/api/shop/") || !tokens.has(auth.replace(/^Bearer /, ""))) {
      return send(res, path.startsWith("/api/shop/") ? 401 : 404, {
        error: path.startsWith("/api/shop/") ? "Please log in again" : "Not found",
      });
    }

    if (req.method === "GET" && path === "/api/shop/me") return send(res, 200, { shop });

    if (req.method === "POST" && path === "/api/shop/uploads") {
      const img = await readImage(req);
      if (!img) return send(res, 400, { error: "No image" });
      const key = `/uploads/${randomBytes(8).toString("hex")}.jpg`;
      uploads.set(key, img);
      return send(res, 200, { url: key });
    }

    if (req.method === "POST" && path === "/api/shop/listings/analyze") {
      const img = await readImage(req);
      if (!img) return send(res, 400, { error: "No image" });
      if (!process.env.GEMINI_API_KEY) {
        await new Promise((r) => setTimeout(r, 1200));
        return send(res, 200, SAMPLE);
      }
      try {
        return send(res, 200, await analyzeProductImage({ bytes: img.bytes, mediaType: img.type }));
      } catch (e) {
        if (e instanceof AnalyzeError) return send(res, e.status, { error: e.message });
        throw e;
      }
    }

    if (req.method === "GET" && path === "/api/shop/products") {
      return send(res, 200, products.filter((p) => p.shopId === shop.id).slice().reverse());
    }
    if (req.method === "POST" && path === "/api/shop/products") {
      const b = await toRequest(req).json();
      if (!b.title || !b.categorySlug || !Number.isInteger(b.price) || b.price <= 0) {
        return send(res, 400, { error: "Title, category and a valid price are required" });
      }
      const p: Product = {
        ...b,
        id: `prod_${randomBytes(4).toString("hex")}`,
        shopId: shop.id,
        stock: b.stock ?? 1,
        status: b.status ?? "active",
        createdAt: new Date().toISOString(),
      };
      products.push(p);
      return send(res, 201, p);
    }
    const m = path.match(/^\/api\/shop\/products\/([\w-]+)$/);
    if (req.method === "PATCH" && m) {
      const p = products.find((x) => x.id === m[1] && x.shopId === shop.id);
      if (!p) return send(res, 404, { error: "Product not found" });
      Object.assign(p, await toRequest(req).json(), { id: p.id, shopId: p.shopId });
      return send(res, 200, p);
    }
    send(res, 404, { error: "Not found" });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: "Server error" });
  }
});

server.listen(PORT, () => console.log(`Mock shop API on http://localhost:${PORT}`));
