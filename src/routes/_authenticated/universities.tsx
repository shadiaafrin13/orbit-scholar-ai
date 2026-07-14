import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Bookmark, BookmarkCheck, Globe, Loader2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/universities")({
  head: () => ({ meta: [{ title: "Global Universities — Atlas" }, { name: "robots", content: "noindex" }] }),
  component: UnivPage,
});

type Univ = {
  id: string; name: string; country: string; city: string | null;
  world_rank: number | null; tuition_usd: number | null; acceptance_rate: number | null;
  programs: string[] | null; levels: string[] | null; language: string | null;
  website: string | null; description: string | null;
};

function UnivPage() {
  const { user } = Route.useRouteContext();
  const [items, setItems] = useState<Univ[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [level, setLevel] = useState("");
  const [maxTuition, setMaxTuition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: saved }] = await Promise.all([
        supabase.from("universities").select("*").order("world_rank", { nullsFirst: false }),
        supabase.from("saved_items").select("item_id").eq("user_id", user.id).eq("item_type", "university"),
      ]);
      setItems((data as Univ[]) ?? []);
      setSavedIds(new Set((saved ?? []).map((r: { item_id: string }) => r.item_id)));
      setLoading(false);
    })();
  }, [user.id]);

  const countries = useMemo(() => Array.from(new Set(items.map((i) => i.country))).sort(), [items]);
  const filtered = items.filter((u) => {
    if (country && u.country !== country) return false;
    if (level && !(u.levels ?? []).includes(level)) return false;
    if (maxTuition != null && (u.tuition_usd ?? 0) > maxTuition) return false;
    if (q) {
      const s = q.toLowerCase();
      const inProgs = (u.programs ?? []).some((p) => p.toLowerCase().includes(s));
      if (!u.name.toLowerCase().includes(s) && !u.country.toLowerCase().includes(s) && !inProgs) return false;
    }
    return true;
  });

  async function toggleSave(u: Univ) {
    if (savedIds.has(u.id)) {
      const { error } = await supabase.from("saved_items").delete().eq("user_id", user.id).eq("item_type", "university").eq("item_id", u.id);
      if (error) return toast.error(error.message);
      const s = new Set(savedIds); s.delete(u.id); setSavedIds(s);
    } else {
      const { error } = await supabase.from("saved_items").insert({ user_id: user.id, item_type: "university", item_id: u.id });
      if (error) return toast.error(error.message);
      setSavedIds(new Set(savedIds).add(u.id));
      toast.success("Saved");
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M09</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
            <Globe className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">Global Universities</span></h1>
            <p className="text-sm text-muted-foreground">Search, filter, and save universities across the world.</p>
          </div>
        </div>

        <div className="mt-6 glass rounded-2xl p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, country or program"
              className="w-full rounded-xl border border-input bg-background/40 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
            <option value="">All countries</option>{countries.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
            <option value="">All levels</option><option>UG</option><option>Masters</option><option>PhD</option>
          </select>
          <select value={maxTuition ?? ""} onChange={(e) => setMaxTuition(e.target.value ? Number(e.target.value) : null)}
            className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm sm:col-span-2 lg:col-span-4">
            <option value="">Any tuition</option>
            <option value="5000">Under $5,000 / year</option>
            <option value="15000">Under $15,000</option>
            <option value="40000">Under $40,000</option>
          </select>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">{filtered.length} of {items.length} universities</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : filtered.map((u) => (
            <article key={u.id} className="glass rounded-2xl p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{u.name}</h3>
                  <p className="text-xs text-muted-foreground">{[u.city, u.country].filter(Boolean).join(", ")}</p>
                </div>
                {u.world_rank && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">#{u.world_rank}</span>}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{u.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(u.programs ?? []).slice(0, 4).map((p) => (
                  <span key={p} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{p}</span>
                ))}
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div><dt className="text-muted-foreground">Tuition</dt><dd>{u.tuition_usd ? `$${u.tuition_usd.toLocaleString()}` : "—"}</dd></div>
                <div><dt className="text-muted-foreground">Accept</dt><dd>{u.acceptance_rate ? `${u.acceptance_rate}%` : "—"}</dd></div>
                <div><dt className="text-muted-foreground">Lang</dt><dd>{u.language || "—"}</dd></div>
              </dl>
              <div className="mt-4 flex items-center justify-between">
                {u.website && <a href={u.website} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Visit site →</a>}
                <button onClick={() => toggleSave(u)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${savedIds.has(u.id) ? "border-primary bg-nebula text-primary-foreground" : "border-border"}`}>
                  {savedIds.has(u.id) ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
                  {savedIds.has(u.id) ? "Saved" : "Save"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
