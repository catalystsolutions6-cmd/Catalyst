import Link from "next/link";
import { db } from "@/lib/db";
import { brand } from "@/lib/brand";
import { CartProvider } from "@/components/cart";
import { CartButton } from "@/components/CartButton";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <CartProvider>
      <div className="bg-brand-900 text-xs text-white/80">
        <div className="mx-auto flex max-w-7xl justify-between px-4 py-1.5">
          <span>Cash on delivery all over Pakistan</span>
          <span className="hidden sm:inline">Free delivery over {`Rs ${brand.freeShippingOver.toLocaleString()}`} · Help: {brand.supportPhone}</span>
        </div>
      </div>
      <header className="sticky top-0 z-30 bg-brand-700 shadow">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Logo light />
          <form action="/search" className="flex flex-1">
            <input
              name="q"
              placeholder="Search laptops, LCDs, headphones..."
              className="w-full min-w-0 rounded-l-lg border-0 bg-white px-4 py-2.5 text-sm outline-none"
            />
            <button className="rounded-r-lg bg-accent-500 px-4 text-white hover:bg-accent-600" aria-label="Search">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </button>
          </form>
          <CartButton />
        </div>
        <nav className="border-t border-white/10 bg-brand-600">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-1.5 text-sm [scrollbar-width:none]">
            {categories.map((c) => (
              <Link key={c.slug} href={`/c/${c.slug}`} className="whitespace-nowrap rounded-md px-3 py-1 text-white/90 hover:bg-white/10 hover:text-white">
                {c.name}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-6">{children}</main>
      <footer className="mt-12 bg-brand-900 text-white/80">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <Logo light />
            <p className="mt-3 text-sm">{brand.tagline}. Genuine tech from Hafeez Center and Hall Road, checked and delivered to your door.</p>
          </div>
          <div>
            <h4 className="mb-2 font-semibold text-white">Shop</h4>
            <ul className="grid grid-cols-2 gap-1 text-sm">
              {categories.map((c) => (
                <li key={c.slug}><Link href={`/c/${c.slug}`} className="hover:text-white">{c.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-semibold text-white">Help</h4>
            <ul className="space-y-1 text-sm">
              <li>Call / WhatsApp: {brand.supportPhone}</li>
              <li>Email: {brand.supportEmail}</li>
              <li><Link href="/track" className="hover:text-white">Track your order</Link></li>
              <li>7-day checking warranty</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs">
          © {new Date().getFullYear()} {brand.name}. A{" "}
          <a href={brand.companyUrl} className="underline hover:text-white" target="_blank" rel="noreferrer">{brand.company}</a> platform.
        </div>
      </footer>
    </CartProvider>
  );
}
