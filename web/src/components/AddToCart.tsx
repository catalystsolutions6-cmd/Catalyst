"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./cart";

type P = { id: string; slug: string; title: string; price: number; image: string | null; stock: number };

export function AddToCart({ product, compact = false }: { product: P; compact?: boolean }) {
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  if (product.stock <= 0) return <button className="btn-ghost w-full" disabled>Out of stock</button>;

  if (compact)
    return (
      <button
        className="btn-primary w-full py-2"
        onClick={(e) => {
          e.preventDefault();
          add(product);
          setAdded(true);
          setTimeout(() => setAdded(false), 1500);
        }}
      >
        {added ? "Added ✓" : "Add to cart"}
      </button>
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">Quantity</span>
        <div className="flex items-center rounded-lg border border-slate-300 bg-white">
          <button className="px-3 py-2 text-lg" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
          <span className="w-8 text-center font-semibold">{qty}</span>
          <button className="px-3 py-2 text-lg" onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label="Increase">+</button>
        </div>
        <span className="text-sm text-slate-500">{product.stock <= 5 ? `Only ${product.stock} left` : "In stock"}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          className="btn-accent py-3"
          onClick={() => {
            add(product, qty);
            router.push("/checkout");
          }}
        >
          Buy now
        </button>
        <button
          className="btn-primary py-3"
          onClick={() => {
            add(product, qty);
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
          }}
        >
          {added ? "Added to cart ✓" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
