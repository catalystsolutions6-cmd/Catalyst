import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";

const DAY = 24 * 60 * 60 * 1000;
export const ADMIN_COOKIE = "admin_session";

export async function createSession(role: "admin" | "shop", shopId?: string) {
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: { token, role, shopId, expiresAt: new Date(Date.now() + (role === "shop" ? 90 : 7) * DAY) },
  });
  return token;
}

async function lookup(token: string | undefined | null, role: "admin" | "shop") {
  if (!token) return null;
  const s = await db.session.findUnique({ where: { token }, include: { shop: true } });
  if (!s || s.role !== role || s.expiresAt < new Date()) return null;
  return s;
}

/** For server components / actions in the admin panel. */
export async function getAdmin() {
  const c = await cookies();
  return lookup(c.get(ADMIN_COOKIE)?.value, "admin");
}

/** For the shopkeeper app API: reads "Authorization: Bearer <token>". */
export async function getShopFromRequest(req: Request) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : null;
  const s = await lookup(token, "shop");
  if (!s?.shop || !s.shop.active) return null;
  return s.shop;
}

export function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}
