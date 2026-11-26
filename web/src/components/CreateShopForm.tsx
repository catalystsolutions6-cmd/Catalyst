"use client";
import { useActionState, useRef, useEffect } from "react";
import Link from "next/link";
import { createShop, type CreateShopState } from "@/app/admin/actions";

const MARKETS = ["Hafeez Center", "Hall Road", "Pace Mall", "Mall of Lahore", "Saddar (Karachi)", "Other"];

export function CreateShopForm() {
  const [state, action, pending] = useActionState<CreateShopState, FormData>(createShop, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.created) ref.current?.reset();
  }, [state]);
  return (
    <div className="card p-5">
      <h2 className="mb-1 text-lg font-bold">Onboard a shop</h2>
      <p className="mb-4 text-sm text-slate-500">Creates the virtual shop and a login for the shopkeeper app in one step.</p>
      <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label">Shop name *</label><input name="name" required className="input" placeholder="e.g. Al-Rehman Computers" /></div>
        <div>
          <label className="label">Market *</label>
          <select name="market" required className="input" defaultValue="Hafeez Center">{MARKETS.map((m) => <option key={m}>{m}</option>)}</select>
        </div>
        <div><label className="label">Shop no. / floor</label><input name="shopNumber" className="input" placeholder="Shop 14, Ground Floor" /></div>
        <div><label className="label">Owner name</label><input name="ownerName" className="input" /></div>
        <div><label className="label">Owner mobile * (app login)</label><input name="phone" required className="input" placeholder="03XXXXXXXXX" inputMode="tel" /></div>
        <div><label className="label">Commission %</label><input name="commission" type="number" min={0} max={50} defaultValue={5} className="input" /></div>
        <div className="flex items-end"><button className="btn-accent w-full" disabled={pending}>{pending ? "Creating..." : "Create shop"}</button></div>
      </form>
      {state.error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {state.created && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
          <div className="font-semibold text-green-800">✓ {state.created.name} is live</div>
          <div className="mt-1">Shopkeeper app login: phone <b>{state.created.phone}</b>, password <b className="font-mono text-base">{state.created.password}</b></div>
          <div className="mt-1 text-xs text-slate-500">Write this down or send it on WhatsApp now; the password is not shown again (you can reset it).</div>
          <Link href={`/admin/shops/${state.created.id}`} className="mt-2 inline-block font-semibold text-brand-600 hover:underline">Open shop →</Link>
        </div>
      )}
    </div>
  );
}
