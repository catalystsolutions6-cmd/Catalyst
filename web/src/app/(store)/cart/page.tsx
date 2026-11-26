"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { brand, formatPKR } from "@/lib/brand";
import { useFreshCart } from "@/components/useFreshCart";

export default function CartPage() {
  const { items, ready, setQty, remove, subtotal } = useFreshCart();
  if (!ready) return null;
  const shipping = subtotal >= brand.freeShippingOver || subtotal === 0 ? 0 : brand.shippingFee;
  if (!items.length)
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <div className="text-5xl">🛒</div>
        <h1 className="mt-3 text-xl font-bold">Your cart is empty</h1>
        <Link href="/" className="btn-primary mt-5">Start shopping</Link>
      </div>
    );
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <h1 className="text-2xl font-bold">Cart ({items.length})</h1>
        {items.map((i) => (
          <div key={i.id} className="card flex gap-4 p-3">
            <Link href={`/p/${i.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {i.image && <img src={i.image} alt="" className="h-full w-full object-cover" />}
            </Link>
            <div className="flex flex-1 flex-col">
              <Link href={`/p/${i.slug}`} className="line-clamp-2 text-sm font-medium hover:text-brand-600">{i.title}</Link>
              <div className="mt-1 font-bold text-brand-700">{formatPKR(i.price)}</div>
              <div className="mt-auto flex items-center justify-between pt-2">
                <div className="flex items-center rounded-lg border border-slate-300">
                  <button className="px-3 py-1" onClick={() => setQty(i.id, i.quantity - 1)} aria-label="Decrease">−</button>
                  <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                  <button className="px-3 py-1" onClick={() => setQty(i.id, i.quantity + 1)} aria-label="Increase">+</button>
                </div>
                <button className="text-sm text-red-600 hover:underline" onClick={() => remove(i.id)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <aside className="card h-fit space-y-3 p-5">
        <h2 className="font-bold">Order summary</h2>
        <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatPKR(subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span>Delivery</span><span>{shipping ? formatPKR(shipping) : "Free"}</span></div>
        {shipping > 0 && <p className="text-xs text-slate-500">Add {formatPKR(brand.freeShippingOver - subtotal)} more for free delivery.</p>}
        <div className="flex justify-between border-t pt-3 text-lg font-bold"><span>Total</span><span>{formatPKR(subtotal + shipping)}</span></div>
        <Link href="/checkout" className="btn-accent w-full py-3">Proceed to checkout</Link>
      </aside>
    </div>
  );
}
