import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Sparkles, Trash2, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/eca")({
  head: () => ({ meta: [{ title: "ECA Hub — Atlas" }, { name: "robots", content: "noindex" }] }),
  component: EcaPage,
});

type Act = {
  id: string; title: string; category: string | null; role: string | null; organization: string | null;
  start_date: string | null; end_date: string | null; hours_per_week: number | null; impact: string | null; evidence_url: string | null;
};

const CATEGORIES = ["Olympiad", "MUN", "Hackathon", "Sports", "Volunteering", "Leadership", "Arts", "Research", "Other"];

function EcaPage() {
  const { user } = Route.useRouteContext();
  const [items, setItems] = useState<Act[]>([]);
  const [form, setForm] = useState({ title: "", category: "Leadership", role: "", organization: "", start_date: "", end_date: "", hours_per_week: "", impact: "", evidence_url: "" });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("activities").select("*").eq("user_id", user.id).order("start_date", { ascending: false, nullsFirst: false });
      setItems((data as Act[]) ?? []);
    })();
  }, [user.id]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const { data, error } = await supabase.from("activities").insert({
      user_id: user.id, title: form.title, category: form.category, role: form.role || null, organization: form.organization || null,
      start_date: form.start_date || null, end_date: form.end_date || null,
      hours_per_week: form.hours_per_week ? Number(form.hours_per_week) : null,
      impact: form.impact || null, evidence_url: form.evidence_url || null,
    }).select().single();
    if (error) return toast.error(error.message);
    setItems([data as Act, ...items]);
    setForm({ title: "", category: "Leadership", role: "", organization: "", start_date: "", end_date: "", hours_per_week: "", impact: "", evidence_url: "" });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems(items.filter((i) => i.id !== id));
  }

  // Simple impact score: breadth (categories) × depth (hours) × evidence
  const impactScore = (() => {
    if (items.length === 0) return 0;
    const cats = new Set(items.map((i) => i.category)).size;
    const hours = items.reduce((s, i) => s + (i.hours_per_week ?? 0), 0);
    const evidence = items.filter((i) => i.evidence_url).length;
    return Math.min(100, cats * 10 + hours * 2 + evidence * 5 + items.length * 3);
  })();

  const byCat = CATEGORIES.map((c) => ({ c, n: items.filter((i) => i.category === c).length })).filter((x) => x.n > 0);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M16</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
            <Trophy className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">ECA Hub</span></h1>
            <p className="text-sm text-muted-foreground">Olympiads, MUN, hackathons, volunteering — quantified for applications.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="glass rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Activities</p>
            <p className="mt-2 text-2xl font-semibold">{items.length}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Categories covered</p>
            <p className="mt-2 text-2xl font-semibold">{new Set(items.map((i) => i.category)).size}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><Sparkles className="h-3 w-3" /> Impact score</p>
            <p className="mt-2 text-2xl font-semibold">{impactScore}<span className="text-sm text-muted-foreground">/100</span></p>
          </div>
        </div>

        {byCat.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {byCat.map((x) => <span key={x.c} className="rounded-full border border-border px-3 py-1 text-xs">{x.c} · {x.n}</span>)}
          </div>
        )}

        <form onSubmit={add} className="mt-6 glass rounded-2xl p-5 grid gap-3 sm:grid-cols-2">
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Activity title" className="sm:col-span-2 rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Role" className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="Organization" className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <input type="number" value={form.hours_per_week} onChange={(e) => setForm({ ...form, hours_per_week: e.target.value })} placeholder="Hours / week" className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <textarea value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })} placeholder="Impact (numbers, awards, outcomes)" rows={2} className="sm:col-span-2 rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <input value={form.evidence_url} onChange={(e) => setForm({ ...form, evidence_url: e.target.value })} placeholder="Evidence URL (certificate, article)" className="sm:col-span-2 rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <button className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-nebula py-2.5 text-sm font-semibold text-primary-foreground glow">
            <Plus className="h-4 w-4" /> Add activity
          </button>
        </form>

        <ul className="mt-6 space-y-3">
          {items.map((a) => (
            <li key={a.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{a.title}</h3>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{a.category}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{[a.role, a.organization].filter(Boolean).join(" · ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.start_date ? new Date(a.start_date).toLocaleDateString() : ""} – {a.end_date ? new Date(a.end_date).toLocaleDateString() : "present"}
                    {a.hours_per_week ? ` · ${a.hours_per_week} hrs/wk` : ""}
                  </p>
                  {a.impact && <p className="mt-2 text-sm">{a.impact}</p>}
                  {a.evidence_url && <a href={a.evidence_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary hover:underline">Evidence →</a>}
                </div>
                <button onClick={() => remove(a.id)} className="rounded-full border border-border p-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-muted-foreground">No activities yet — start with your strongest one.</li>}
        </ul>
      </main>
    </div>
  );
}
