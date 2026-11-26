import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, jsonError } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const phone = String(body?.phone ?? "").replace(/[^0-9+]/g, "");
  const password = String(body?.password ?? "");
  if (!phone || !password) return jsonError("Phone and password are required", 400);
  const shop = await db.shop.findUnique({ where: { phone } });
  if (!shop || !(await bcrypt.compare(password, shop.passwordHash))) return jsonError("Wrong phone or password", 401);
  if (!shop.active) return jsonError("This shop is disabled. Contact support.", 403);
  const token = await createSession("shop", shop.id);
  return Response.json({ token, shop: { id: shop.id, name: shop.name, slug: shop.slug } });
}
