/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPKR } from "@/lib/brand";
import { ORDER_STATUSES } from "@/lib/orders";

export const metadata = { title: "Your order" };

const digits = (s: string) => s.replace(/\D/g, "").slice(-10);

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ phone?: string; new?: string }> }) {
  const { number } = await params;
  const sp = await searchParams;
  // Shop is never selected here: the customer only sees the platform.
  const order = await db.order.findUnique({
    where: { orderNumber: number },
    select: { orderNumber: true, customerName: true, phone: true, address: true, city: true, status: true, subtotal: true, shippingFee: true, total: true, createdAt: true, items: { select: { id: true, title: true, image: true, price: true, quantity: true } } },
  });
  if (!order || !sp.phone || digits(sp.phone) !== digits(order.phone)) notFound();
  const step = ORDER_STATUSES.indexOf(order.status as (typeof ORDER_STATUSES)[number]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {sp.new && (
        <div className="card border-green-200 bg-green-50 p-6 text-center">
          <div className="text-4xl">🎉</div>
          <h1 className="mt-2 text-2xl font-bold text-green-800">Order placed!</h1>
          <p className="text-green-700">We&apos;ll call you on {order.phone} to confirm. Please keep {formatPKR(order.total)} ready on delivery.</p>
        </div>
      )}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><div className="text-sm text-slate-500">Order number</div><div className="text-xl font-bold">#{order.orderNumber}</div></div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold capitalize text-brand-700">{order.status}</span>
        </div>
        {order.status !== "cancelled" && (
          <div className="mt-5 grid grid-cols-4 gap-1 text-center text-xs">
            {ORDER_STATUSES.slice(0, 4).map((s, i) => (
              <div key={s}>
                <div className={`h-1.5 rounded-full ${i <= step ? "bg-brand-600" : "bg-slate-200"}`} />
                <div className={`mt-1 capitalize ${i <= step ? "font-semibold text-brand-700" : "text-slate-400"}`}>{s}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card divide-y p-5">
        {order.items.map((i) => (
          <div key={i.id} className="flex gap-3 py-3 text-sm first:pt-0">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-slate-100">{i.image && <img src={i.image} alt="" className="h-full w-full object-cover" />}</div>
            <div className="flex-1"><div>{i.title}</div><div className="text-slate-500">Qty {i.quantity}</div></div>
            <div className="font-medium">{formatPKR(i.price * i.quantity)}</div>
          </div>
        ))}
        <div className="space-y-1 pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatPKR(order.subtotal)}</span></div>
          <div className="flex justify-between"><span>Delivery</span><span>{order.shippingFee ? formatPKR(order.shippingFee) : "Free"}</span></div>
          <div className="flex justify-between text-base font-bold"><span>Total (Cash on Delivery)</span><span>{formatPKR(order.total)}</span></div>
        </div>
      </div>
      <div className="card p-5 text-sm">
        <div className="font-semibold">Delivering to</div>
        <div className="text-slate-600">{order.customerName}, {order.address}, {order.city}</div>
      </div>
      <Link href="/" className="btn-primary">Continue shopping</Link>
    </div>
  );
}
