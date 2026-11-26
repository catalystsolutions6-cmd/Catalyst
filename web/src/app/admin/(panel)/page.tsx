import Link from "next/link";
import { db } from "@/lib/db";
import { formatPKR } from "@/lib/brand";
import { PageTitle, Stat, StatusBadge } from "@/components/admin";

export default async function Dashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [ordersToday, pending, shops, products, revenue, recent, byShop, shopList] = await Promise.all([
    db.order.count({ where: { createdAt: { gte: today } } }),
    db.order.count({ where: { status: "pending" } }),
    db.shop.count({ where: { active: true } }),
    db.product.count({ where: { status: "active" } }),
    db.order.aggregate({ _sum: { total: true }, where: { status: { not: "cancelled" } } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { _count: { select: { items: true } } } }),
    db.orderItem.groupBy({
      by: ["shopId"],
      where: { status: { not: "cancelled" }, order: { status: { not: "cancelled" } } },
      _sum: { quantity: true },
      _count: true,
    }),
    db.shop.findMany({ select: { id: true, name: true, market: true, commission: true } }),
  ]);
  // Sales per shop (price x qty) computed from items.
  const items = await db.orderItem.findMany({
    where: { status: { not: "cancelled" }, order: { status: { not: "cancelled" } } },
    select: { shopId: true, price: true, quantity: true, status: true },
  });
  const sales = new Map<string, { gross: number; toCollect: number }>();
  for (const i of items) {
    const s = sales.get(i.shopId) ?? { gross: 0, toCollect: 0 };
    s.gross += i.price * i.quantity;
    if (i.status === "pending") s.toCollect += i.quantity;
    sales.set(i.shopId, s);
  }
  const rows = byShop
    .map((b) => ({ shop: shopList.find((s) => s.id === b.shopId)!, units: b._sum.quantity ?? 0, ...sales.get(b.shopId)! }))
    .filter((r) => r.shop)
    .sort((a, b) => b.gross - a.gross);

  return (
    <div className="space-y-8">
      <PageTitle>Dashboard</PageTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Orders today" value={ordersToday} />
        <Stat label="Pending orders" value={pending} sub="need a confirmation call" />
        <Stat label="Sales (all time)" value={formatPKR(revenue._sum.total ?? 0)} />
        <Stat label="Active shops" value={shops} />
        <Stat label="Live products" value={products} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b p-4"><h2 className="font-bold">Recent orders</h2><Link href="/admin/orders" className="text-sm text-brand-600">All orders →</Link></div>
          <table className="w-full text-sm">
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-600">#{o.orderNumber}</Link><div className="text-xs text-slate-500">{o.customerName}, {o.city}</div></td>
                  <td className="p-3 text-slate-500">{o._count.items} items</td>
                  <td className="p-3 font-medium">{formatPKR(o.total)}</td>
                  <td className="p-3"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
              {!recent.length && <tr><td className="p-6 text-center text-slate-500">No orders yet.</td></tr>}
            </tbody>
          </table>
        </section>
        <section className="card overflow-hidden">
          <div className="border-b p-4"><h2 className="font-bold">Sales by shop</h2><p className="text-xs text-slate-500">Only you see this. Customers never see shop names.</p></div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Shop</th><th className="p-3">Units</th><th className="p-3">Gross</th><th className="p-3">Commission</th><th className="p-3">To collect</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.shop.id} className="border-b last:border-0">
                  <td className="p-3"><Link href={`/admin/shops/${r.shop.id}`} className="font-semibold text-brand-600">{r.shop.name}</Link><div className="text-xs text-slate-500">{r.shop.market}</div></td>
                  <td className="p-3">{r.units}</td>
                  <td className="p-3">{formatPKR(r.gross)}</td>
                  <td className="p-3 text-green-700">{formatPKR((r.gross * r.shop.commission) / 100)}</td>
                  <td className="p-3">{r.toCollect ? <span className="font-semibold text-amber-700">{r.toCollect} items</span> : "—"}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="p-6 text-center text-slate-500">No sales yet.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
