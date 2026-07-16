import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { recommendUniversities } from "@/lib/university-ai.functions";
import {
  ArrowLeft, Bookmark, BookmarkCheck, Globe, Loader2, Search, Sparkles, Scale, X, MapPin,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/universities")({
  head: () => ({ meta: [{ title: "Global Universities — Atlas" }, { name: "robots", content: "noindex" }] }),
  component: UnivPage,
});

type Univ = {
  id: string; name: string; country: string; city: string | null; continent: string | null;
  world_rank: number | null; qs_rank: number | null; the_rank: number | null; arwu_rank: number | null;
  tuition_usd: number | null; tuition_min_usd: number | null; tuition_max_usd: number | null;
  living_cost_usd: number | null; acceptance_rate: number | null; avg_gpa: number | null;
  ielts_min: number | null; toefl_min: number | null;
  programs: string[] | null; levels: string[] | null; faculties: string[] | null;
  language: string | null; website: string | null; description: string | null;
  image_url: string | null; scholarships_info: string | null;
};

type Tab = "browse" | "recommend" | "compare";

function UnivPage() {
  const { user } = Route.useRouteContext();
  const [items, setItems] = useState<Univ[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("browse");

  // filters
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [continent, setContinent] = useState("");
  const [level, setLevel] = useState("");
  const [maxTuition, setMaxTuition] = useState<number | null>(null);
  const [maxIelts, setMaxIelts] = useState<number | null>(null);
  const [maxGpa, setMaxGpa] = useState<number | null>(null);
  const [onlySaved, setOnlySaved] = useState(false);
  const [sort, setSort] = useState<"rank" | "tuition_asc" | "tuition_desc" | "name">("rank");

  // compare
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // AI
  const recFn = useServerFn(recommendUniversities);
  const [recLoading, setRecLoading] = useState(false);
  const [picks, setPicks] = useState<Array<{ id: string; name: string; reason: string; fit: number }>>([]);
  const [recNote, setRecNote] = useState<string | null>(null);

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
  const continents = useMemo(() => Array.from(new Set(items.map((i) => i.continent).filter(Boolean))) as string[], [items]);
  const countryCounts = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((u) => m.set(u.country, (m.get(u.country) ?? 0) + 1));
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    const f = items.filter((u) => {
      if (country && u.country !== country) return false;
      if (continent && u.continent !== continent) return false;
      if (level && !(u.levels ?? []).includes(level)) return false;
      if (maxTuition != null && (u.tuition_usd ?? u.tuition_min_usd ?? 0) > maxTuition) return false;
      if (maxIelts != null && (u.ielts_min ?? 0) > maxIelts) return false;
      if (maxGpa != null && (u.avg_gpa ?? 0) > maxGpa) return false;
      if (onlySaved && !savedIds.has(u.id)) return false;
      if (q) {
        const s = q.toLowerCase();
        const inProgs = (u.programs ?? []).some((p) => p.toLowerCase().includes(s));
        const inFac = (u.faculties ?? []).some((p) => p.toLowerCase().includes(s));
        if (!u.name.toLowerCase().includes(s) && !u.country.toLowerCase().includes(s) && !inProgs && !inFac) return false;
      }
      return true;
    });
    const s = [...f];
    if (sort === "rank") s.sort((a, b) => (a.world_rank ?? 9999) - (b.world_rank ?? 9999));
    if (sort === "name") s.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "tuition_asc") s.sort((a, b) => (a.tuition_usd ?? 0) - (b.tuition_usd ?? 0));
    if (sort === "tuition_desc") s.sort((a, b) => (b.tuition_usd ?? 0) - (a.tuition_usd ?? 0));
    return s;
  }, [items, country, continent, level, maxTuition, maxIelts, maxGpa, onlySaved, q, sort, savedIds]);

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

  function toggleCompare(id: string) {
    setCompareIds((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 4) { toast.error("Compare up to 4 at a time"); return cur; }
      return [...cur, id];
    });
  }

  async function runRecommend() {
    setRecLoading(true); setPicks([]); setRecNote(null);
    try {
      const res = await recFn({ data: { limit: 8 } });
      setPicks(res.picks); setRecNote(res.note);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally { setRecLoading(false); }
  }

  const compareItems = compareIds.map((id) => items.find((u) => u.id === id)).filter(Boolean) as Univ[];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M04 · M09</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
            <Globe className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">Global University Explorer</span></h1>
            <p className="text-sm text-muted-foreground">{items.length} universities · {countries.length} countries · AI-powered recommendations.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 inline-flex rounded-full border border-border p-1 glass text-sm">
          {(["browse", "recommend", "compare"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 capitalize ${tab === t ? "bg-nebula text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "compare" ? `Compare (${compareIds.length})` : t}
            </button>
          ))}
        </div>

        {tab === "browse" && (
          <>
            {/* Country chips */}
            <div className="mt-6 flex flex-wrap gap-2">
              <button onClick={() => setCountry("")}
                className={`rounded-full border px-3 py-1 text-xs ${!country ? "bg-nebula text-primary-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground"}`}>
                All countries
              </button>
              {countries.map((c) => (
                <button key={c} onClick={() => setCountry(c === country ? "" : c)}
                  className={`rounded-full border px-3 py-1 text-xs ${country === c ? "bg-nebula text-primary-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  {c} <span className="opacity-60">· {countryCounts.get(c)}</span>
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="mt-4 glass rounded-2xl p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2 lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Smart search: name, program, faculty, country"
                  className="w-full rounded-xl border border-input bg-background/40 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
              <select value={continent} onChange={(e) => setContinent(e.target.value)} className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
                <option value="">All regions</option>{continents.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
                <option value="">All levels</option><option>UG</option><option>Masters</option><option>PhD</option>
              </select>
              <select value={maxTuition ?? ""} onChange={(e) => setMaxTuition(e.target.value ? Number(e.target.value) : null)}
                className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
                <option value="">Any tuition</option>
                <option value="1000">Free / under $1,000</option>
                <option value="5000">Under $5,000</option>
                <option value="15000">Under $15,000</option>
                <option value="30000">Under $30,000</option>
                <option value="50000">Under $50,000</option>
              </select>
              <select value={maxIelts ?? ""} onChange={(e) => setMaxIelts(e.target.value ? Number(e.target.value) : null)}
                className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
                <option value="">Any IELTS</option>
                <option value="6.0">IELTS ≤ 6.0</option><option value="6.5">IELTS ≤ 6.5</option><option value="7.0">IELTS ≤ 7.0</option>
              </select>
              <select value={maxGpa ?? ""} onChange={(e) => setMaxGpa(e.target.value ? Number(e.target.value) : null)}
                className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
                <option value="">Any avg GPA</option>
                <option value="3.0">Avg GPA ≤ 3.0</option><option value="3.5">Avg GPA ≤ 3.5</option><option value="3.8">Avg GPA ≤ 3.8</option>
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
                <option value="rank">Sort: World rank</option>
                <option value="tuition_asc">Sort: Tuition (low→high)</option>
                <option value="tuition_desc">Sort: Tuition (high→low)</option>
                <option value="name">Sort: Name (A–Z)</option>
              </select>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={onlySaved} onChange={(e) => setOnlySaved(e.target.checked)} /> Only saved
              </label>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">{filtered.length} of {items.length} universities</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : filtered.map((u) => (
                <UniCard key={u.id} u={u}
                  saved={savedIds.has(u.id)} onSave={() => toggleSave(u)}
                  compared={compareIds.includes(u.id)} onCompare={() => toggleCompare(u.id)} />
              ))}
            </div>
          </>
        )}

        {tab === "recommend" && (
          <div className="mt-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold">AI University Recommendation</h2>
                  <p className="text-sm text-muted-foreground">We match universities to your profile — level, tests, budget, and interests.</p>
                </div>
              </div>
              <button onClick={runRecommend} disabled={recLoading}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-sm font-medium text-primary-foreground glow disabled:opacity-60">
                {recLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {recLoading ? "Analyzing…" : "Recommend best-fit universities"}
              </button>
              {recNote && <p className="mt-3 text-xs text-amber-500">{recNote}</p>}
            </div>

            {picks.length > 0 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {picks.map((p) => {
                  const u = items.find((x) => x.id === p.id);
                  return (
                    <div key={p.id} className="glass rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{u?.name ?? p.name}</h3>
                          {u && <p className="text-xs text-muted-foreground">{[u.city, u.country].filter(Boolean).join(", ")}</p>}
                        </div>
                        <span className="rounded-full bg-nebula px-2.5 py-1 text-xs font-semibold text-primary-foreground">{p.fit}% fit</span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{p.reason}</p>
                      {u && (
                        <Link to="/universities/$id" params={{ id: u.id }}
                          className="mt-3 inline-block text-xs text-primary hover:underline">View details →</Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "compare" && (
          <div className="mt-6">
            {compareItems.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center">
                <Scale className="mx-auto h-8 w-8 text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">Add up to 4 universities from Browse to compare side-by-side.</p>
              </div>
            ) : (
              <div className="overflow-x-auto glass rounded-2xl p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2">Attribute</th>
                      {compareItems.map((u) => (
                        <th key={u.id} className="px-3 py-2 min-w-[200px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground">{u.name}</span>
                            <button onClick={() => toggleCompare(u.id)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                          </div>
                          <div className="text-[10px] font-normal text-muted-foreground">{[u.city, u.country].filter(Boolean).join(", ")}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="[&_td]:border-t [&_td]:border-border/50 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top">
                    <Row label="World rank" render={(u) => u.world_rank ?? "—"} items={compareItems} />
                    <Row label="Tuition (USD/yr)" render={(u) => u.tuition_usd ? `$${u.tuition_usd.toLocaleString()}` : "—"} items={compareItems} />
                    <Row label="Living cost" render={(u) => u.living_cost_usd ? `$${u.living_cost_usd.toLocaleString()}` : "—"} items={compareItems} />
                    <Row label="Acceptance" render={(u) => u.acceptance_rate ? `${u.acceptance_rate}%` : "—"} items={compareItems} />
                    <Row label="Avg GPA" render={(u) => u.avg_gpa ?? "—"} items={compareItems} />
                    <Row label="IELTS" render={(u) => u.ielts_min ?? "—"} items={compareItems} />
                    <Row label="TOEFL" render={(u) => u.toefl_min ?? "—"} items={compareItems} />
                    <Row label="Language" render={(u) => u.language ?? "—"} items={compareItems} />
                    <Row label="Faculties" render={(u) => (u.faculties ?? []).slice(0, 4).join(", ") || "—"} items={compareItems} />
                    <Row label="Programs" render={(u) => (u.programs ?? []).slice(0, 4).join(", ") || "—"} items={compareItems} />
                    <Row label="Details" render={(u) => (
                      <Link to="/universities/$id" params={{ id: u.id }} className="text-primary hover:underline">Open →</Link>
                    )} items={compareItems} />
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, items, render }: { label: string; items: Univ[]; render: (u: Univ) => React.ReactNode }) {
  return (
    <tr>
      <td className="text-xs font-medium text-muted-foreground">{label}</td>
      {items.map((u) => <td key={u.id}>{render(u)}</td>)}
    </tr>
  );
}

function UniCard({ u, saved, onSave, compared, onCompare }: {
  u: Univ; saved: boolean; onSave: () => void; compared: boolean; onCompare: () => void;
}) {
  return (
    <article className="glass rounded-2xl p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link to="/universities/$id" params={{ id: u.id }} className="font-semibold hover:text-primary">{u.name}</Link>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />{[u.city, u.country].filter(Boolean).join(", ")}
          </p>
        </div>
        {u.world_rank && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">#{u.world_rank}</span>}
      </div>
      {u.description && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{u.description}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(u.faculties ?? u.programs ?? []).slice(0, 4).map((p) => (
          <span key={p} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{p}</span>
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div><dt className="text-muted-foreground">Tuition</dt><dd>{u.tuition_usd ? `$${(u.tuition_usd / 1000).toFixed(0)}k` : "—"}</dd></div>
        <div><dt className="text-muted-foreground">Accept</dt><dd>{u.acceptance_rate ? `${u.acceptance_rate}%` : "—"}</dd></div>
        <div><dt className="text-muted-foreground">IELTS</dt><dd>{u.ielts_min ?? "—"}</dd></div>
      </dl>
      <div className="mt-4 flex items-center justify-between gap-2">
        <Link to="/universities/$id" params={{ id: u.id }} className="text-xs text-primary hover:underline">Details →</Link>
        <div className="flex items-center gap-2">
          <button onClick={onCompare} title="Add to compare"
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${compared ? "border-primary bg-nebula text-primary-foreground" : "border-border"}`}>
            <Scale className="h-3 w-3" />{compared ? "Added" : "Compare"}
          </button>
          <button onClick={onSave}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${saved ? "border-primary bg-nebula text-primary-foreground" : "border-border"}`}>
            {saved ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </article>
  );
}
