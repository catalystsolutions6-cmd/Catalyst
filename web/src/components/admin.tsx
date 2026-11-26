export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-blue-100 text-blue-800",
    shipped: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-700",
    collected: "bg-green-100 text-green-800",
    active: "bg-green-100 text-green-800",
    draft: "bg-slate-200 text-slate-700",
    archived: "bg-red-100 text-red-700",
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${colors[status] ?? "bg-slate-100"}`}>{status}</span>;
}

export function ShopTag({ name, market }: { name: string; market?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-accent-400/20 px-2 py-0.5 text-xs font-semibold text-accent-600">
      🏬 {name}{market ? <span className="font-normal text-slate-500"> · {market}</span> : null}
    </span>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function PageTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{children}</h1>
      {right}
    </div>
  );
}
