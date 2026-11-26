import Link from "next/link";
import { db } from "@/lib/db";
import { PageTitle, StatusBadge } from "@/components/admin";
import { CreateShopForm } from "@/components/CreateShopForm";

export default async function ShopsPage() {
  const shops = await db.shop.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: { where: { status: "active" } }, orderItems: true } } },
  });
  return (
    <div className="space-y-6">
      <PageTitle>Shops ({shops.length})</PageTitle>
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2"><CreateShopForm /></div>
        <div className="card overflow-x-auto xl:col-span-3">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="p-3">Shop</th><th className="p-3">Market</th><th className="p-3">Owner</th><th className="p-3">Products</th><th className="p-3">Items sold</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody>
              {shops.map((s) => (
                <tr key={s.id} className="border-t hover:bg-slate-50">
                  <td className="p-3"><Link href={`/admin/shops/${s.id}`} className="font-semibold text-brand-600">{s.name}</Link><div className="text-xs text-slate-500">{s.shopNumber}</div></td>
                  <td className="p-3">{s.market}</td>
                  <td className="p-3">{s.ownerName}<div className="text-xs text-slate-500">{s.phone}</div></td>
                  <td className="p-3">{s._count.products}</td>
                  <td className="p-3">{s._count.orderItems}</td>
                  <td className="p-3"><StatusBadge status={s.active ? "active" : "archived"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
