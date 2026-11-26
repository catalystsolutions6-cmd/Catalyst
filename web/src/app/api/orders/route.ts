import { z } from "zod";
import { db } from "@/lib/db";
import { brand } from "@/lib/brand";
import { newOrderNumber } from "@/lib/orders";
import { productImages } from "@/lib/util";

const orderInput = z.object({
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^(\+92|0)?3\d{2}[- ]?\d{7}$/, "Enter a valid Pakistani mobile number"),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().min(8).max(500),
  city: z.string().trim().min(2).max(60),
  notes: z.string().trim().max(500).optional(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(20) })).min(1).max(50),
});

export async function POST(req: Request) {
  const parsed = orderInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid order" }, { status: 400 });
  const d = parsed.data;

  try {
    const order = await db.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: d.items.map((i) => i.productId) }, status: "active", shop: { active: true } },
      });
      const lines = d.items.map((i) => {
        const p = products.find((x) => x.id === i.productId);
        if (!p) throw new Error("One of the items is no longer available");
        if (p.stock < i.quantity) throw new Error(`Only ${p.stock} left of "${p.title}"`);
        return { p, quantity: i.quantity };
      });
      const subtotal = lines.reduce((s, l) => s + l.p.price * l.quantity, 0);
      const shippingFee = subtotal >= brand.freeShippingOver ? 0 : brand.shippingFee;
      for (const l of lines) {
        const res = await tx.product.updateMany({
          where: { id: l.p.id, stock: { gte: l.quantity } },
          data: { stock: { decrement: l.quantity } },
        });
        if (res.count !== 1) throw new Error(`"${l.p.title}" just sold out`);
      }
      return tx.order.create({
        data: {
          orderNumber: newOrderNumber(),
          customerName: d.customerName,
          phone: d.phone,
          email: d.email || null,
          address: d.address,
          city: d.city,
          notes: d.notes || null,
          subtotal,
          shippingFee,
          total: subtotal + shippingFee,
          items: {
            create: lines.map((l) => ({
              productId: l.p.id,
              shopId: l.p.shopId,
              title: l.p.title,
              image: productImages(l.p)[0] ?? null,
              price: l.p.price,
              quantity: l.quantity,
            })),
          },
        },
      });
    });
    return Response.json({ orderNumber: order.orderNumber, total: order.total }, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 409 });
  }
}
