/** Generic renderer for AI JSON results — keeps Phase 3 pages readable without hardcoding every shape. */
function label(k: string) {
  return k.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

function Value({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
  if (typeof value === "number" || typeof value === "boolean") return <span>{String(value)}</span>;
  if (typeof value === "string") return <span className="whitespace-pre-wrap">{value}</span>;
  if (Array.isArray(value))
    return (
      <ul className="space-y-1.5">
        {value.map((v, i) => (
          <li key={i} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-sm">
            <Value value={v} />
          </li>
        ))}
      </ul>
    );
  return <AIResult data={value as Record<string, unknown>} nested />;
}

export function AIResult({ data, nested = false }: { data: unknown; nested?: boolean }) {
  if (!data || typeof data !== "object") return <Value value={data} />;
  const entries = Object.entries(data as Record<string, unknown>).filter(
    ([, v]) => !(v === null || v === "" || (Array.isArray(v) && v.length === 0)),
  );
  if (!entries.length) return <p className="text-sm text-muted-foreground">No result yet.</p>;
  return (
    <div className={nested ? "grid gap-2" : "grid gap-4"}>
      {entries.map(([k, v]) => (
        <div key={k}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label(k)}</p>
          <div className="mt-1 text-sm">
            <Value value={v} />
          </div>
        </div>
      ))}
    </div>
  );
}
