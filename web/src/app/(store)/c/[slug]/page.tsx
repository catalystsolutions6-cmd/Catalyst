import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { findProducts, type CatalogParams } from "@/lib/catalog";
import { ProductGrid } from "@/components/ProductCard";
import { Filters } from "@/components/Filters";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const c = await db.category.findUnique({ where: { slug: (await params).slug } });
  return { title: c?.name ?? "Category" };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<CatalogParams> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await db.category.findUnique({ where: { slug } });
  if (!category) notFound();
  const { products, brands } = await findProducts({ categorySlug: slug }, sp);
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{category.name}</h1>
      <p className="mb-4 text-sm text-slate-500">{products.length} products</p>
      <Filters base={`/c/${slug}`} params={{ ...sp }} brands={brands} />
      <ProductGrid products={products} />
    </div>
  );
}
