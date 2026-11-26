"use client";
import { useState, useTransition } from "react";
import { resetShopPassword, setItemStatus, setOrderStatus, setProductStatus, toggleShop } from "@/app/admin/actions";
import { ORDER_STATUSES } from "@/lib/orders";

export function OrderStatusSelect({ orderId, status }: { orderId: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <select className="input w-auto py-1.5" defaultValue={status} disabled={pending} onChange={(e) => start(() => setOrderStatus(orderId, e.target.value))}>
      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
    </select>
  );
}

export function ItemStatusSelect({ itemId, status }: { itemId: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <select className="input w-auto py-1 text-xs" defaultValue={status} disabled={pending} onChange={(e) => start(() => setItemStatus(itemId, e.target.value))}>
      <option value="pending">To collect</option>
      <option value="collected">Collected</option>
      <option value="cancelled">Cancelled</option>
    </select>
  );
}

export function ProductStatusSelect({ productId, status }: { productId: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <select className="input w-auto py-1 text-xs" defaultValue={status} disabled={pending} onChange={(e) => start(() => setProductStatus(productId, e.target.value))}>
      <option value="active">Active</option>
      <option value="draft">Hidden</option>
      <option value="archived">Archived</option>
    </select>
  );
}

export function ShopControls({ shopId, active, phone }: { shopId: string; active: boolean; phone: string }) {
  const [pending, start] = useTransition();
  const [pw, setPw] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" disabled={pending} onClick={() => start(async () => setPw(await resetShopPassword(shopId)))}>Reset app password</button>
        <button className={active ? "btn border border-red-300 bg-white text-red-700 hover:bg-red-50" : "btn-primary"} disabled={pending} onClick={() => start(() => toggleShop(shopId))}>
          {active ? "Disable shop" : "Enable shop"}
        </button>
      </div>
      {pw && (
        <div className="rounded-lg bg-green-50 p-3 text-sm">
          New app login: phone <b>{phone}</b>, password <b className="font-mono text-base">{pw}</b>. Share it with the shopkeeper now; it won&apos;t be shown again.
        </div>
      )}
    </div>
  );
}
