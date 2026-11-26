import Link from "next/link";
import { db } from "@/lib/db";
import { brand } from "@/lib/brand";
import { ProductGrid } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

const catIcons: Record<string, string> = {
  laptops: "💻", desktops: "🖥️", "monitors-lcds": "🖵", headphones: "🎧", accessories: "⌨️",
  gaming: "🎮", storage: "💾", networking: "📶", "mobiles-tablets": "📱",
};

export default async function Home() {
  const live = { status: "active", shop: { active: true } };
  const [categories, latest, deals] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: { where: live } } } } }),
    db.product.findMany({ where: live, orderBy: { createdAt: "desc" }, take: 10 }),
    db.product.findMany({ where: { ...live, comparePrice: { not: null } }, take: 40 }),
  ]);
  const topDeals = deals
    .sort((a, b) => (b.comparePrice! - b.price) / b.comparePrice! - (a.comparePrice! - a.price) / a.comparePrice!)
    .slice(0, 5);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-8 text-white sm:p-12">
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-accent-500/30 blur-2xl" />
        <div className="relative max-w-xl">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Hafeez Center + Hall Road, now online</span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">Lahore&apos;s tech markets, delivered to your door</h1>
          <p className="mt-3 text-white/85">Laptops, PCs, LCDs, headphones and accessories at market prices. Checked before dispatch. Pay cash when it arrives.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/c/laptops" className="btn-accent px-6 py-3">Shop laptops</Link>
            <Link href="/search" className="btn border border-white/40 px-6 py-3 text-white hover:bg-white/10">Browse everything</Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[
          ["🚚", "Cash on delivery", "Pay when you receive"],
          ["✅", "Checked items", "Tested before dispatch"],
          ["↩️", "7-day warranty", "Easy checking period"],
          ["🏷️", "Market prices", `Free delivery over Rs ${brand.freeShippingOver.toLocaleString()}`],
        ].map(([i, t, d]) => (
          <div key={t} className="card flex items-center gap-3 p-4">
            <span className="text-2xl">{i}</span>
            <div><div className="font-semibold">{t}</div><div className="text-slate-500">{d}</div></div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Shop by category</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {categories.map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}`} className="card flex flex-col items-center gap-2 p-4 text-center transition hover:border-brand-500 hover:shadow">
              <span className="text-3xl">{catIcons[c.slug] ?? "🛒"}</span>
              <span className="text-xs font-semibold leading-tight">{c.name}</span>
              <span className="text-[11px] text-slate-400">{c._count.products} items</span>
            </Link>
          ))}
        </div>
      </section>

      {topDeals.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-bold">🔥 Top deals</h2>
          </div>
          <ProductGrid products={topDeals} />
        </section>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-bold">Just listed</h2>
          <Link href="/search?sort=new" className="text-sm font-semibold text-brand-600 hover:underline">See all</Link>
        </div>
        <ProductGrid products={latest} />
      </section>
    </div>
  );
}
