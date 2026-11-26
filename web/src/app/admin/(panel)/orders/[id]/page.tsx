import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPKR } from "@/lib/brand";
import { PageTitle, StatusBadge } from "@/components/admin";
import { ItemStatusSelect, OrderStatusSelect } from "@/components/AdminControls";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id }, include: { items: { include: { shop: true } } } });
  if (!order) notFound();
  const groups = new Map<string, typeof order.items>();
  for (const i of order.items) groups.set(i.shopId, [...(groups.get(i.shopId) ?? []), i]);

  return (
    <div className="space-y-6">
      <PageTitle right={<div className="flex items-center gap-2"><StatusBadge status={order.status} /><OrderStatusSelect orderId={order.id} status={order.status} /></div>}>
        Order #{order.orderNumber}
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="font-bold">Pick up from {groups.size} shop{groups.size > 1 ? "s" : ""}</h2>
          {[...groups.values()].map((items) => {
            const s = items[0].shop;
            return (
              <div key={s.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-accent-400/15 p-4">
                  <div>
                    <Link href={`/admin/shops/${s.id}`} className="font-bold text-slate-900 hover:underline">🏬 {s.name}</Link>
                    <div className="text-xs text-slate-600">{s.market}{s.shopNumber ? `, ${s.shopNumber}` : ""} · {s.ownerName} · <a href={`tel:${s.phone}`} className="underline">{s.phone}</a></div>
                  </div>
                  <div className="text-sm font-semibold">{formatPKR(items.reduce((t, i) => t + i.price * i.quantity, 0))}</div>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.id} className="border-t">
                        <td className="w-16 p-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {i.image && <img src={i.image} alt="" className="h-12 w-12 rounded object-cover" />}
                        </td>
                        <td className="p-3">{i.title}<div className="text-xs text-slate-500">{formatPKR(i.price)} × {i.quantity}</div></td>
                        <td className="p-3 font-medium">{formatPKR(i.price * i.quantity)}</td>
                        <td className="p-3"><ItemStatusSelect itemId={i.id} status={i.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
        <div className="space-y-4">
          <div className="card space-y-1 p-5 text-sm">
            <h2 className="mb-2 font-bold">Customer</h2>
            <div className="font-medium">{order.customerName}</div>
            <div><a href={`tel:${order.phone}`} className="text-brand-600">{order.phone}</a> · <a href={`https://wa.me/92${order.phone.replace(/\D/g, "").replace(/^0|^92/, "")}`} target="_blank" rel="noreferrer" className="text-green-700">WhatsApp</a></div>
            {order.email && <div>{order.email}</div>}
            <div className="pt-2 text-slate-600">{order.address}, {order.city}</div>
            {order.notes && <div className="mt-2 rounded bg-amber-50 p-2 text-amber-900">Note: {order.notes}</div>}
          </div>
          <div className="card space-y-1 p-5 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatPKR(order.subtotal)}</span></div>
            <div className="flex justify-between"><span>Delivery</span><span>{formatPKR(order.shippingFee)}</span></div>
            <div className="flex justify-between border-t pt-2 text-base font-bold"><span>COD to collect</span><span>{formatPKR(order.total)}</span></div>
            <div className="pt-1 text-xs text-slate-500">Placed {order.createdAt.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
