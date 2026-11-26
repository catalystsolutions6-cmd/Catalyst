import Link from "next/link";
import { brand } from "@/lib/brand";

export function Logo({ light = false, href = "/" }: { light?: boolean; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 shrink-0" aria-label={brand.name}>
      <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden>
        <rect width="40" height="40" rx="10" fill="#f39a1e" />
        <path d="M23 5 11 23h8l-2 12 12-18h-8z" fill="#fff" />
      </svg>
      <span className={`text-2xl font-extrabold tracking-tight ${light ? "text-white" : "text-brand-700"}`}>{brand.name}</span>
    </Link>
  );
}
