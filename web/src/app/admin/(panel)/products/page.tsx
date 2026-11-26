import Link from "next/link";
import { db } from "@/lib/db";
import { formatPKR } from "@/lib/brand";
import { productImages } from "@/lib/util";
import { PageTitle, ShopTag } from "@/components/admin";
import { ProductStatusSelect } from "@/components/AdminControls";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; shop?: string }> }) {
  const sp = await searchParams;
  const [products, shops] = await Promise.all([
    db.product.findMany({
      where: { ...(sp.shop ? { shopId: sp.shop } : {}), ...(sp.q ? { title: { contains: sp.q } } : {}) },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { shop: { select: { name: true, market: true } } },
    }),
    db.shop.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div>
      <PageTitle>Products ({products.length})</PageTitle>
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search title" className="input w-64" />
        <select name="shop" defaultValue={sp.shop || ""} className="input w-auto">
          <option value="">All shops</option>
          {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button className="btn-ghost">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-3" /><th className="p-3">Product</th><th className="p-3">Shop</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Visibility</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="w-16 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={productImages(p)[0]} alt="" className="h-12 w-12 rounded object-cover" />
                </td>
                <td className="p-3"><Link href={`/p/${p.slug}`} target="_blank" className="font-medium hover:text-brand-600">{p.title}</Link><div className="text-xs capitalize text-slate-500">{p.categorySlug} · {p.condition}</div></td>
                <td className="p-3"><ShopTag name={p.shop.name} market={p.shop.market} /></td>
                <td className="p-3">{formatPKR(p.price)}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3"><ProductStatusSelect productId={p.id} status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
