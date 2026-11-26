import Link from "next/link";

type Params = Record<string, string | undefined>;

function href(base: string, params: Params, patch: Params) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, ...patch })) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

export function Filters({ base, params, brands }: { base: string; params: Params; brands: string[] }) {
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium ${active ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-brand-500"}`;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase text-slate-400">Sort</span>
      {[["", "Relevance"], ["new", "Newest"], ["price_asc", "Price ↑"], ["price_desc", "Price ↓"]].map(([v, l]) => (
        <Link key={v} href={href(base, params, { sort: v })} className={chip((params.sort || "") === v)}>{l}</Link>
      ))}
      <span className="ml-2 text-xs font-semibold uppercase text-slate-400">Condition</span>
      {[["", "All"], ["new", "New"], ["used", "Used"], ["refurbished", "Refurbished"]].map(([v, l]) => (
        <Link key={v} href={href(base, params, { condition: v })} className={chip((params.condition || "") === v)}>{l}</Link>
      ))}
      {brands.length > 1 && (
        <>
          <span className="ml-2 text-xs font-semibold uppercase text-slate-400">Brand</span>
          {["", ...brands].map((b) => (
            <Link key={b} href={href(base, params, { brand: b })} className={chip((params.brand || "") === b)}>{b || "All"}</Link>
          ))}
        </>
      )}
    </div>
  );
}
