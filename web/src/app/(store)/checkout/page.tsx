"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { brand, formatPKR } from "@/lib/brand";
import { useFreshCart } from "@/components/useFreshCart";

const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Gujranwala", "Sialkot", "Peshawar", "Quetta", "Hyderabad", "Bahawalpur", "Sargodha", "Other"];

export default function CheckoutPage() {
  const { items, ready, subtotal, clear } = useFreshCart();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!ready) return null;
  if (!items.length)
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <h1 className="text-xl font-bold">Nothing to check out</h1>
        <Link href="/" className="btn-primary mt-5">Continue shopping</Link>
      </div>
    );
  const shipping = subtotal >= brand.freeShippingOver ? 0 : brand.shippingFee;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...f, items: items.map((i) => ({ productId: i.id, quantity: i.quantity })) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      setBusy(false);
      return;
    }
    clear();
    router.push(`/order/${data.orderNumber}?phone=${encodeURIComponent(f.phone)}&new=1`);
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
      <div className="card space-y-4 p-5 lg:col-span-2">
        <h1 className="text-2xl font-bold">Delivery details</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Full name</label><input name="customerName" required minLength={2} className="input" autoComplete="name" /></div>
          <div><label className="label">Mobile number</label><input name="phone" required placeholder="03XX XXXXXXX" className="input" inputMode="tel" autoComplete="tel" /></div>
          <div className="sm:col-span-2"><label className="label">Full address</label><textarea name="address" required minLength={8} rows={2} className="input" placeholder="House, street, area" autoComplete="street-address" /></div>
          <div>
            <label className="label">City</label>
            <select name="city" required className="input" defaultValue="">
              <option value="" disabled>Select city</option>
              {CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label">Email (optional)</label><input name="email" type="email" className="input" autoComplete="email" /></div>
          <div className="sm:col-span-2"><label className="label">Order notes (optional)</label><input name="notes" className="input" placeholder="Nearest landmark, preferred time..." /></div>
        </div>
        <div>
          <h2 className="mb-2 font-semibold">Payment</h2>
          <label className="flex items-center gap-3 rounded-lg border-2 border-brand-600 bg-brand-50 p-3">
            <input type="radio" checked readOnly className="accent-brand-600" />
            <span><span className="font-semibold">Cash on Delivery</span><br /><span className="text-sm text-slate-600">Pay in cash when your order arrives.</span></span>
          </label>
          <p className="mt-2 text-xs text-slate-500">Card, JazzCash and Easypaisa coming soon.</p>
        </div>
      </div>
      <aside className="card h-fit space-y-3 p-5">
        <h2 className="font-bold">Your order</h2>
        {items.map((i) => (
          <div key={i.id} className="flex gap-3 text-sm">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-slate-100">{i.image && <img src={i.image} alt="" className="h-full w-full object-cover" />}</div>
            <div className="flex-1"><div className="line-clamp-1">{i.title}</div><div className="text-slate-500">Qty {i.quantity}</div></div>
            <div className="font-medium">{formatPKR(i.price * i.quantity)}</div>
          </div>
        ))}
        <div className="flex justify-between border-t pt-3 text-sm"><span>Subtotal</span><span>{formatPKR(subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span>Delivery</span><span>{shipping ? formatPKR(shipping) : "Free"}</span></div>
        <div className="flex justify-between border-t pt-3 text-lg font-bold"><span>Total</span><span>{formatPKR(subtotal + shipping)}</span></div>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button className="btn-accent w-full py-3" disabled={busy}>{busy ? "Placing order..." : "Place order"}</button>
      </aside>
    </form>
  );
}
