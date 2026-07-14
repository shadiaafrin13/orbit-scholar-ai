import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Award, Bookmark, BookmarkCheck, Loader2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/scholarships")({
  head: () => ({ meta: [{ title: "Scholarship Hub — Atlas" }, { name: "robots", content: "noindex" }] }),
  component: SchPage,
});

type Sch = {
  id: string; name: string; provider: string | null; country: string | null; level: string | null;
  amount: string | null; deadline: string | null; eligibility: string | null;
  fields: string[] | null; link: string | null; fully_funded: boolean; description: string | null;
};

function SchPage() {
  const { user } = Route.useRouteContext();
  const [items, setItems] = useState<Sch[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [level, setLevel] = useState("");
  const [onlyFunded, setOnlyFunded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: s }] = await Promise.all([
        supabase.from("scholarships").select("*").order("deadline", { ascending: true, nullsFirst: false }),
        supabase.from("saved_items").select("item_id").eq("user_id", user.id).eq("item_type", "scholarship"),
      ]);
      setItems((data as Sch[]) ?? []);
      setSaved(new Set((s ?? []).map((r: { item_id: string }) => r.item_id)));
      setLoading(false);
    })();
  }, [user.id]);

  const countries = useMemo(() => Array.from(new Set(items.map((i) => i.country).filter(Boolean) as string[])).sort(), [items]);
  const filtered = items.filter((x) => {
    if (country && x.country !== country) return false;
    if (level && !(x.level ?? "").includes(level)) return false;
    if (onlyFunded && !x.fully_funded) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!x.name.toLowerCase().includes(s) && !(x.provider ?? "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  async function toggleSave(x: Sch) {
    if (saved.has(x.id)) {
      const { error } = await supabase.from("saved_items").delete().eq("user_id", user.id).eq("item_type", "scholarship").eq("item_id", x.id);
      if (error) return toast.error(error.message);
      const s = new Set(saved); s.delete(x.id); setSaved(s);
    } else {
      const { error } = await supabase.from("saved_items").insert({ user_id: user.id, item_type: "scholarship", item_id: x.id });
      if (error) return toast.error(error.message);
      setSaved(new Set(saved).add(x.id)); toast.success("Saved");
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M10</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
            <Award className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">Scholarship Hub</span></h1>
            <p className="text-sm text-muted-foreground">Major global scholarships, ranked by deadline.</p>
          </div>
        </div>

        <div className="mt-6 glass rounded-2xl p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or provider"
              className="w-full rounded-xl border border-input bg-background/40 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
            <option value="">All countries</option>{countries.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
            <option value="">All levels</option><option>UG</option><option>Masters</option><option>PhD</option>
          </select>
          <label className="flex items-center gap-2 text-xs sm:col-span-2 lg:col-span-4">
            <input type="checkbox" checked={onlyFunded} onChange={(e) => setOnlyFunded(e.target.checked)} />
            Fully funded only
          </label>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">{filtered.length} of {items.length} scholarships</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : filtered.map((x) => (
            <article key={x.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{x.name}</h3>
                  <p className="text-xs text-muted-foreground">{[x.provider, x.country].filter(Boolean).join(" · ")}</p>
                </div>
                {x.fully_funded && <span className="rounded-full bg-nebula px-2 py-0.5 text-[10px] font-medium text-primary-foreground">Fully funded</span>}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{x.description}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div><dt className="text-muted-foreground">Level</dt><dd>{x.level || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Amount</dt><dd>{x.amount || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Deadline</dt><dd>{x.deadline ? new Date(x.deadline).toLocaleDateString() : "—"}</dd></div>
              </dl>
              {x.eligibility && <p className="mt-3 text-xs text-muted-foreground"><span className="font-medium text-foreground">Eligibility:</span> {x.eligibility}</p>}
              <div className="mt-4 flex items-center justify-between">
                {x.link && <a href={x.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Official page →</a>}
                <button onClick={() => toggleSave(x)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${saved.has(x.id) ? "border-primary bg-nebula text-primary-foreground" : "border-border"}`}>
                  {saved.has(x.id) ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
                  {saved.has(x.id) ? "Saved" : "Save"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
