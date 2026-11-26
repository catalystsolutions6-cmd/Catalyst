import { redirect } from "next/navigation";

export const metadata = { title: "Track order" };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string; phone?: string }> }) {
  const sp = await searchParams;
  if (sp.order && sp.phone) redirect(`/order/${encodeURIComponent(sp.order.replace(/^#/, "").trim())}?phone=${encodeURIComponent(sp.phone)}`);
  return (
    <form className="card mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-bold">Track your order</h1>
      <div><label className="label">Order number</label><input name="order" required className="input" placeholder="e.g. 261126-4821" /></div>
      <div><label className="label">Mobile number used for the order</label><input name="phone" required className="input" placeholder="03XX XXXXXXX" /></div>
      <button className="btn-primary w-full">Track</button>
    </form>
  );
}
