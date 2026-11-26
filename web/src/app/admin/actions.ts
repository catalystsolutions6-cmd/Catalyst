"use server";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ADMIN_COOKIE, createSession, getAdmin } from "@/lib/auth";
import { slugify, randomSuffix } from "@/lib/util";
import { ORDER_STATUSES } from "@/lib/orders";

async function requireAdmin() {
  if (!(await getAdmin())) redirect("/admin/login");
}

export async function login(_: unknown, form: FormData) {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const okEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  if (!okEmail || !process.env.ADMIN_PASSWORD || email !== okEmail || password !== process.env.ADMIN_PASSWORD) {
    return { error: "Wrong email or password" };
  }
  const token = await createSession("admin");
  (await cookies()).set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 86400 });
  redirect("/admin");
}

export async function logout() {
  const c = await cookies();
  const t = c.get(ADMIN_COOKIE)?.value;
  if (t) await db.session.deleteMany({ where: { token: t } });
  c.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

const genPassword = () => String(randomInt(100000, 999999));
const cleanPhone = (s: string) => s.replace(/[^0-9]/g, "").replace(/^92/, "0");

export type CreateShopState = { error?: string; created?: { name: string; phone: string; password: string; id: string } };

export async function createShop(_: CreateShopState, form: FormData): Promise<CreateShopState> {
  await requireAdmin();
  const name = String(form.get("name") || "").trim();
  const market = String(form.get("market") || "").trim();
  const phone = cleanPhone(String(form.get("phone") || ""));
  if (name.length < 2) return { error: "Enter the shop name" };
  if (!market) return { error: "Choose the market" };
  if (!/^03\d{9}$/.test(phone)) return { error: "Enter the owner's mobile as 03XXXXXXXXX" };
  if (await db.shop.findUnique({ where: { phone } })) return { error: "A shop with this mobile number already exists" };
  let slug = slugify(name) || "shop";
  if (await db.shop.findUnique({ where: { slug } })) slug = `${slug}-${randomSuffix(4)}`;
  const password = genPassword();
  const shop = await db.shop.create({
    data: {
      name,
      slug,
      market,
      phone,
      shopNumber: String(form.get("shopNumber") || "").trim() || null,
      ownerName: String(form.get("ownerName") || "").trim() || null,
      commission: Math.max(0, Math.min(50, Number(form.get("commission")) || 5)),
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  revalidatePath("/admin/shops");
  return { created: { name: shop.name, phone, password, id: shop.id } };
}

export async function resetShopPassword(shopId: string) {
  await requireAdmin();
  const password = genPassword();
  await db.shop.update({ where: { id: shopId }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await db.session.deleteMany({ where: { shopId } });
  return password;
}

export async function toggleShop(shopId: string) {
  await requireAdmin();
  const s = await db.shop.findUniqueOrThrow({ where: { id: shopId } });
  await db.shop.update({ where: { id: shopId }, data: { active: !s.active } });
  if (s.active) await db.session.deleteMany({ where: { shopId } });
  revalidatePath("/admin/shops");
  revalidatePath(`/admin/shops/${shopId}`);
}

export async function setOrderStatus(orderId: string, status: string) {
  await requireAdmin();
  if (!ORDER_STATUSES.includes(status as never)) return;
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  await db.$transaction(async (tx) => {
    // Put stock back when an order is cancelled (and take it again if un-cancelled).
    if (status === "cancelled" && order.status !== "cancelled") {
      for (const i of order.items) await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } });
    } else if (order.status === "cancelled" && status !== "cancelled") {
      for (const i of order.items) await tx.product.update({ where: { id: i.productId }, data: { stock: { decrement: i.quantity } } });
    }
    await tx.order.update({ where: { id: orderId }, data: { status } });
  });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function setItemStatus(itemId: string, status: string) {
  await requireAdmin();
  if (!["pending", "collected", "cancelled"].includes(status)) return;
  const item = await db.orderItem.update({ where: { id: itemId }, data: { status } });
  revalidatePath(`/admin/orders/${item.orderId}`);
}

export async function setProductStatus(productId: string, status: string) {
  await requireAdmin();
  if (!["active", "draft", "archived"].includes(status)) return;
  await db.product.update({ where: { id: productId }, data: { status } });
  revalidatePath("/admin/products");
}
