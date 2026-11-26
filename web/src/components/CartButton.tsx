"use client";
import Link from "next/link";
import { useCart } from "./cart";

export function CartButton() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="relative flex items-center gap-2 rounded-lg px-3 py-2 text-white hover:bg-white/10" aria-label="Cart">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
        <path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6" />
      </svg>
      <span className="hidden text-sm font-medium sm:inline">Cart</span>
      {count > 0 && (
        <span className="absolute -top-0.5 left-6 min-w-5 rounded-full bg-accent-500 px-1.5 text-center text-xs font-bold leading-5 text-white">{count}</span>
      )}
    </Link>
  );
}
