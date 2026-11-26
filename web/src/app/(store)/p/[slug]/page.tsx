import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPKR } from "@/lib/brand";
import { discountPct, parseJSON, productImages } from "@/lib/util";
import { AddToCart } from "@/components/AddToCart";
import { ProductGrid } from "@/components/ProductCard";
import { Gallery } from "@/components/Gallery";

async function getProduct(slug: string) {
  // Note: the shop is deliberately NOT selected, customers never see who sells the item.
  return db.product.findFirst({ where: { slug, status: "active", shop: { active: true } }, include: { category: true } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug);
  return { title: p?.title ?? "Product", description: p?.description.slice(0, 160) };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const images = productImages(p);
  const specs = Object.entries(parseJSON<Record<string, string>>(p.specs, {}));
  const off = discountPct(p.price, p.comparePrice);
  const related = await db.product.findMany({
    where: { categorySlug: p.categorySlug, status: "active", shop: { active: true }, id: { not: p.id } },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-10">
      <nav className="text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-600">Home</Link> / <Link href={`/c/${p.categorySlug}`} className="hover:text-brand-600">{p.category.name}</Link>
      </nav>
      <div className="grid gap-8 md:grid-cols-2">
        <Gallery images={images} alt={p.title} />
        <div className="space-y-5">
          <div>
            {p.brand && <div className="text-sm font-semibold uppercase tracking-wide text-brand-600">{p.brand}</div>}
            <h1 className="mt-1 text-2xl font-bold leading-snug">{p.title}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium capitalize">{p.condition}</span>
              {p.model && <span className="rounded-full bg-slate-100 px-2.5 py-1">Model: {p.model}</span>}
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-brand-700">{formatPKR(p.price)}</span>
              {off > 0 && (
                <>
                  <span className="text-slate-400 line-through">{formatPKR(p.comparePrice!)}</span>
                  <span className="rounded bg-accent-500 px-2 py-0.5 text-xs font-bold text-white">-{off}%</span>
                </>
              )}
            </div>
            <div className="mt-4"><AddToCart product={{ id: p.id, slug: p.slug, title: p.title, price: p.price, image: images[0] ?? null, stock: p.stock }} /></div>
          </div>
          <ul className="grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <li>🚚 Cash on delivery, 2 to 5 days</li>
            <li>✅ Checked before dispatch</li>
            <li>↩️ 7-day checking warranty</li>
            <li>📞 Help on WhatsApp</li>
          </ul>
          {specs.length > 0 && (
            <div>
              <h2 className="mb-2 font-semibold">Specifications</h2>
              <table className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
                <tbody>
                  {specs.map(([k, v]) => (
                    <tr key={k} className="border-b border-slate-100 last:border-0">
                      <td className="w-2/5 bg-slate-50 px-3 py-2 font-medium text-slate-600">{k}</td>
                      <td className="px-3 py-2">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div>
            <h2 className="mb-2 font-semibold">Description</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{p.description}</p>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
