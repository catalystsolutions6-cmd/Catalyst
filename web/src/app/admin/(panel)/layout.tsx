import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

const nav = [
  ["/admin", "📊", "Dashboard"],
  ["/admin/orders", "🧾", "Orders"],
  ["/admin/shops", "🏬", "Shops"],
  ["/admin/products", "📦", "Products"],
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await getAdmin())) redirect("/admin/login");
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-brand-900 text-white md:min-h-screen md:w-60 md:shrink-0">
        <div className="flex items-center justify-between p-4 md:block">
          <Logo light href="/admin" />
          <div className="mt-1 hidden text-xs uppercase tracking-wide text-white/50 md:block">Admin panel</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0">
          {nav.map(([href, icon, label]) => (
            <Link key={href} href={href} className="flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-white/85 hover:bg-white/10 hover:text-white">
              <span>{icon}</span>{label}
            </Link>
          ))}
          <Link href="/" target="_blank" className="flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/10">↗ View store</Link>
          <form action={logout}><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/60 hover:bg-white/10">⎋ Log out</button></form>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
