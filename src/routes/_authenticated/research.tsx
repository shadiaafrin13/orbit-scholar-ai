import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, FlaskConical, Loader2, Search, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/research")({
  head: () => ({ meta: [{ title: "Research & Innovation — Atlas" }, { name: "robots", content: "noindex" }] }),
  component: ResearchPage,
});

type Row = {
  id: string; title: string; host: string | null; country: string | null; type: string | null;
  field: string | null; deadline: string | null; stipend: string | null; link: string | null; description: string | null;
};

function ResearchPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("research_opportunities").select("*").order("deadline", { ascending: true, nullsFirst: false });
      setItems((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const types = useMemo(() => Array.from(new Set(items.map((i) => i.type).filter(Boolean) as string[])).sort(), [items]);
  const filtered = items.filter((x) => {
    if (type && x.type !== type) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!x.title.toLowerCase().includes(s) && !(x.host ?? "").toLowerCase().includes(s) && !(x.field ?? "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M11</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
            <FlaskConical className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">Research & Innovation</span></h1>
            <p className="text-sm text-muted-foreground">Fellowships, summer research, PhD programs, and grants worldwide.</p>
          </div>
        </div>

        <div className="mt-6 glass rounded-2xl p-4 grid gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, host, or field"
              className="w-full rounded-xl border border-input bg-background/40 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
            <option value="">All types</option>{types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">{filtered.length} of {items.length} opportunities</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : filtered.map((x) => (
            <article key={x.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{x.title}</h3>
                  <p className="text-xs text-muted-foreground">{[x.host, x.country].filter(Boolean).join(" · ")}</p>
                </div>
                {x.type && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{x.type}</span>}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{x.description}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div><dt className="text-muted-foreground">Field</dt><dd>{x.field || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Stipend</dt><dd>{x.stipend || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Deadline</dt><dd>{x.deadline ? new Date(x.deadline).toLocaleDateString() : "Rolling"}</dd></div>
              </dl>
              {x.link && (
                <a href={x.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Official page <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
