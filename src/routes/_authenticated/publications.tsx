import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, BookMarked, Plus, Trash2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/publications")({
  head: () => ({ meta: [{ title: "Publication Hub — Atlas" }, { name: "robots", content: "noindex" }] }),
  component: PubsPage,
});

type Pub = {
  id: string; title: string; venue: string | null; year: number | null;
  doi: string | null; link: string | null; type: string | null; coauthors: string | null; citations: number | null;
};

function PubsPage() {
  const { user } = Route.useRouteContext();
  const [items, setItems] = useState<Pub[]>([]);
  const [form, setForm] = useState({ title: "", venue: "", year: "", doi: "", link: "", type: "Journal", coauthors: "" });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("publications").select("*").eq("user_id", user.id).order("year", { ascending: false });
      setItems((data as Pub[]) ?? []);
    })();
  }, [user.id]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const { data, error } = await supabase.from("publications").insert({
      user_id: user.id, title: form.title, venue: form.venue || null,
      year: form.year ? Number(form.year) : null, doi: form.doi || null, link: form.link || null,
      type: form.type, coauthors: form.coauthors || null,
    }).select().single();
    if (error) return toast.error(error.message);
    setItems([data as Pub, ...items]);
    setForm({ title: "", venue: "", year: "", doi: "", link: "", type: "Journal", coauthors: "" });
    toast.success("Publication added");
  }

  async function remove(id: string) {
    const { error } = await supabase.from("publications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems(items.filter((i) => i.id !== id));
  }

  const totalCitations = items.reduce((s, p) => s + (p.citations ?? 0), 0);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M12</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
            <BookMarked className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">Publication Hub</span></h1>
            <p className="text-sm text-muted-foreground">Track papers, preprints, book chapters, and conference talks.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Publications" value={String(items.length)} />
          <Stat label="Citations" value={String(totalCitations)} />
          <Stat label="Latest year" value={items[0]?.year ? String(items[0].year) : "—"} />
        </div>

        <form onSubmit={add} className="mt-8 glass rounded-2xl p-6 grid gap-3 sm:grid-cols-2">
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Paper title" className="sm:col-span-2 rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Venue / journal" className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="Year" type="number" className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <input value={form.doi} onChange={(e) => setForm({ ...form, doi: e.target.value })} placeholder="DOI (10.xxxx/...)" className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="Link" className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
            <option>Journal</option><option>Conference</option><option>Preprint</option><option>Book Chapter</option><option>Thesis</option>
          </select>
          <input value={form.coauthors} onChange={(e) => setForm({ ...form, coauthors: e.target.value })} placeholder="Co-authors (comma-separated)" className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <button className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-nebula py-2.5 text-sm font-semibold text-primary-foreground glow">
            <Plus className="h-4 w-4" /> Add publication
          </button>
        </form>

        <ul className="mt-6 space-y-3">
          {items.map((p) => (
            <li key={p.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium">{p.title}</h3>
                  <p className="text-xs text-muted-foreground">{[p.venue, p.year, p.type].filter(Boolean).join(" · ")}</p>
                  {p.coauthors && <p className="mt-1 text-xs text-muted-foreground">With: {p.coauthors}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    {p.doi && <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">DOI: {p.doi}</a>}
                    {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Link <ExternalLink className="h-3 w-3" /></a>}
                  </div>
                </div>
                <button onClick={() => remove(p.id)} className="rounded-full border border-border p-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-muted-foreground">No publications yet — add your first above.</li>}
        </ul>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
