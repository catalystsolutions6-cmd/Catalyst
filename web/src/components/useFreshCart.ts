"use client";
import { useEffect, useState } from "react";
import { useCart } from "./cart";

/** Refreshes cart prices and stock from the server once on load. */
export function useFreshCart() {
  const cart = useCart();
  const [synced, setSynced] = useState(false);
  const { ready, items, replace } = cart;
  useEffect(() => {
    if (!ready || synced) return;
    if (!items.length) return;
    fetch("/api/cart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: items.map((i) => i.id) }) })
      .then((r) => r.json())
      .then((fresh: { id: string; price: number; stock: number; title: string; image: string | null; slug: string }[]) => {
        replace(
          items
            .map((i) => {
              const f = fresh.find((x) => x.id === i.id);
              return f && f.stock > 0 ? { ...i, ...f, quantity: Math.min(i.quantity, f.stock) } : null;
            })
            .filter((x): x is NonNullable<typeof x> => !!x),
        );
      })
      .catch(() => {})
      .finally(() => setSynced(true));
  }, [ready, synced, items, replace]);
  return { ...cart, synced: synced || (ready && !items.length) };
}
