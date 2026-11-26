import { findProducts, type CatalogParams } from "@/lib/catalog";
import { ProductGrid } from "@/components/ProductCard";
import { Filters } from "@/components/Filters";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const sp = await searchParams;
  const { products, brands } = await findProducts({}, sp);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{sp.q ? <>Results for &ldquo;{sp.q}&rdquo;</> : "All products"}</h1>
      <p className="mb-4 text-sm text-slate-500">{products.length} products</p>
      <Filters base="/search" params={{ ...sp }} brands={brands} />
      <ProductGrid products={products} />
    </div>
  );
}
