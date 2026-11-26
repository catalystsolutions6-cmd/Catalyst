import Link from "next/link";
import { db } from "@/lib/db";
import { formatPKR } from "@/lib/brand";
import { ORDER_STATUSES } from "@/lib/orders";
import { PageTitle, ShopTag, StatusBadge } from "@/components/admin";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; shop?: string }> }) {
  const sp = await searchParams;
  const [orders, shops] = await Promise.all([
    db.order.findMany({
      where: { ...(sp.status ? { status: sp.status } : {}), ...(sp.shop ? { items: { some: { shopId: sp.shop } } } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { items: { include: { shop: { select: { name: true, market: true } } } } },
    }),
    db.shop.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const q = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/orders${p.size ? `?${p}` : ""}`;
  };
  return (
    <div>
      <PageTitle>Orders</PageTitle>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {["", ...ORDER_STATUSES].map((s) => (
          <Link key={s} href={q({ status: s || undefined })} className={`rounded-full border px-3 py-1 capitalize ${(sp.status || "") === s ? "border-brand-600 bg-brand-600 text-white" : "bg-white"}`}>{s || "All"}</Link>
        ))}
        <form className="ml-auto flex gap-2">
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <select name="shop" defaultValue={sp.shop || ""} className="input w-auto py-1.5">
            <option value="">All shops</option>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn-ghost py-1.5">Filter</button>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Items &amp; shops</th><th className="p-3">Total</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t align-top hover:bg-slate-50">
                <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-600">#{o.orderNumber}</Link><div className="text-xs text-slate-500">{o.createdAt.toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}</div></td>
                <td className="p-3">{o.customerName}<div className="text-xs text-slate-500">{o.phone} · {o.city}</div></td>
                <td className="space-y-1 p-3">
                  {o.items.map((i) => (
                    <div key={i.id} className="flex flex-wrap items-center gap-2"><span className="line-clamp-1 max-w-64">{i.quantity}× {i.title}</span><ShopTag name={i.shop.name} /></div>
                  ))}
                </td>
                <td className="p-3 font-medium">{formatPKR(o.total)}</td>
                <td className="p-3"><StatusBadge status={o.status} /></td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No orders.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
