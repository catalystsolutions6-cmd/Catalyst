import Link from "next/link";
import type { Product } from "@prisma/client";
import { formatPKR } from "@/lib/brand";
import { discountPct, productImages } from "@/lib/util";

export function ProductCard({ p }: { p: Product }) {
  const img = productImages(p)[0];
  const off = discountPct(p.price, p.comparePrice);
  return (
    <Link href={`/p/${p.slug}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-square bg-slate-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
        ) : null}
        {off > 0 && <span className="absolute left-2 top-2 rounded-md bg-accent-500 px-2 py-0.5 text-xs font-bold text-white">-{off}%</span>}
        {p.condition !== "new" && (
          <span className="absolute right-2 top-2 rounded-md bg-slate-900/80 px-2 py-0.5 text-xs font-medium capitalize text-white">{p.condition}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-slate-800 group-hover:text-brand-600">{p.title}</h3>
        <div className="mt-auto pt-1">
          <div className="text-lg font-bold text-brand-700">{formatPKR(p.price)}</div>
          {off > 0 && <div className="text-xs text-slate-400 line-through">{formatPKR(p.comparePrice!)}</div>}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) return <p className="card p-10 text-center text-slate-500">No products found.</p>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  );
}
