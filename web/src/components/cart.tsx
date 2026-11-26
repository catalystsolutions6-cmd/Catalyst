"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type CartItem = { id: string; slug: string; title: string; price: number; image: string | null; quantity: number; stock: number };
type Ctx = {
  items: CartItem[];
  ready: boolean;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  replace: (items: CartItem[]) => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(KEY) || "[]"));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  const add = useCallback((item: Omit<CartItem, "quantity">, qty = 1) => {
    setItems((cur) => {
      const ex = cur.find((i) => i.id === item.id);
      if (ex) return cur.map((i) => (i.id === item.id ? { ...i, ...item, quantity: Math.min(i.quantity + qty, item.stock) } : i));
      return [...cur, { ...item, quantity: Math.min(qty, item.stock) }];
    });
  }, []);
  const setQty = useCallback((id: string, qty: number) => {
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, Math.min(qty, i.stock)) } : i)));
  }, []);
  const remove = useCallback((id: string) => setItems((cur) => cur.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  return (
    <CartContext.Provider value={{ items, ready, add, setQty, remove, clear, replace: setItems, count, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
