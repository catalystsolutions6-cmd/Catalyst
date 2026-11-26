import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPKR } from "@/lib/brand";
import { productImages } from "@/lib/util";
import { PageTitle, Stat, StatusBadge } from "@/components/admin";
import { ShopControls, ProductStatusSelect } from "@/components/AdminControls";

export default async function ShopDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shop = await db.shop.findUnique({
    where: { id },
    include: {
      products: { orderBy: { createdAt: "desc" }, where: { status: { not: "archived" } } },
      orderItems: { orderBy: { order: { createdAt: "desc" } }, include: { order: true }, take: 100 },
    },
  });
  if (!shop) notFound();
  const live = shop.orderItems.filter((i) => i.status !== "cancelled" && i.order.status !== "cancelled");
  const gross = live.reduce((s, i) => s + i.price * i.quantity, 0);
  const toCollect = live.filter((i) => i.status === "pending");

  return (
    <div className="space-y-6">
      <PageTitle right={<StatusBadge status={shop.active ? "active" : "archived"} />}>🏬 {shop.name}</PageTitle>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-2 p-5 text-sm">
          <div><span className="text-slate-500">Market:</span> {shop.market}</div>
          <div><span className="text-slate-500">Shop no.:</span> {shop.shopNumber || "—"}</div>
          <div><span className="text-slate-500">Owner:</span> {shop.ownerName || "—"}</div>
          <div><span className="text-slate-500">Mobile / app login:</span> {shop.phone}</div>
          <div><span className="text-slate-500">Commission:</span> {shop.commission}%</div>
          <div><span className="text-slate-500">Joined:</span> {shop.createdAt.toLocaleDateString("en-PK")}</div>
          <div className="pt-3"><ShopControls shopId={shop.id} active={shop.active} phone={shop.phone} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <Stat label="Live products" value={shop.products.filter((p) => p.status === "active").length} />
          <Stat label="Gross sales" value={formatPKR(gross)} />
          <Stat label="Your commission" value={formatPKR((gross * shop.commission) / 100)} />
          <Stat label="Items to collect" value={toCollect.reduce((s, i) => s + i.quantity, 0)} sub="from this shop" />
        </div>
      </div>

      <section className="card overflow-x-auto">
        <h2 className="border-b p-4 font-bold">Orders containing this shop&apos;s products</h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Order</th><th className="p-3">Item</th><th className="p-3">Qty</th><th className="p-3">Amount</th><th className="p-3">Pickup</th></tr></thead>
          <tbody>
            {shop.orderItems.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="p-3"><Link href={`/admin/orders/${i.orderId}`} className="font-semibold text-brand-600">#{i.order.orderNumber}</Link><div><StatusBadge status={i.order.status} /></div></td>
                <td className="p-3">{i.title}</td>
                <td className="p-3">{i.quantity}</td>
                <td className="p-3">{formatPKR(i.price * i.quantity)}</td>
                <td className="p-3"><StatusBadge status={i.status === "pending" ? "pending" : i.status} /></td>
              </tr>
            ))}
            {!shop.orderItems.length && <tr><td colSpan={5} className="p-6 text-center text-slate-500">No orders yet.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="border-b p-4 font-bold">Products ({shop.products.length})</h2>
        <table className="w-full text-sm">
          <tbody>
            {shop.products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="w-16 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={productImages(p)[0]} alt="" className="h-12 w-12 rounded object-cover" />
                </td>
                <td className="p-3"><Link href={`/p/${p.slug}`} target="_blank" className="font-medium hover:text-brand-600">{p.title}</Link><div className="text-xs capitalize text-slate-500">{p.categorySlug} · {p.condition}</div></td>
                <td className="p-3">{formatPKR(p.price)}</td>
                <td className="p-3">Stock {p.stock}</td>
                <td className="p-3"><ProductStatusSelect productId={p.id} status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
