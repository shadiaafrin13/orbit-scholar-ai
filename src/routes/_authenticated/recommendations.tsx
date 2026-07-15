import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mail, Plus, Trash2, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/recommendations")({
  head: () => ({ meta: [{ title: "Recommendation Letters — Atlas" }, { name: "robots", content: "noindex" }] }),
  component: RecPage,
});

type Rec = { id: string; name: string; email: string | null; affiliation: string | null; relationship: string | null; status: string | null; requested_at: string | null; submitted_at: string | null; notes: string | null };

const STATUSES = ["planned", "requested", "in_progress", "submitted"] as const;

function RecPage() {
  const { user } = Route.useRouteContext();
  const [items, setItems] = useState<Rec[]>([]);
  const [form, setForm] = useState({ name: "", email: "", affiliation: "", relationship: "" });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("recommenders").select("*").eq("user_id", user.id).order("created_at");
      setItems((data as Rec[]) ?? []);
    })();
  }, [user.id]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const { data, error } = await supabase.from("recommenders").insert({ user_id: user.id, ...form, status: "planned" }).select().single();
    if (error) return toast.error(error.message);
    setItems([...items, data as Rec]);
    setForm({ name: "", email: "", affiliation: "", relationship: "" });
  }

  async function update(id: string, patch: Partial<Rec>) {
    const { error } = await supabase.from("recommenders").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setItems(items.map((i) => i.id === id ? { ...i, ...patch } : i));
  }

  async function remove(id: string) {
    const { error } = await supabase.from("recommenders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems(items.filter((i) => i.id !== id));
  }

  function draftEmail(r: Rec) {
    const subject = encodeURIComponent(`Letter of recommendation request`);
    const body = encodeURIComponent(
`Dear ${r.name},

I hope this email finds you well. I am applying to graduate programs this cycle and would be honored if you could write a letter of recommendation supporting my application.

Given our work together (${r.relationship || "our academic relationship"}), I believe you can speak meaningfully to my research potential, work ethic, and readiness for graduate study.

I have attached my CV, statement of purpose draft, and a list of programs with deadlines. If you are able to help, I can also send a short bullet list of talking points.

Thank you very much for considering this request.

Best regards,`);
    window.open(`mailto:${r.email || ""}?subject=${subject}&body=${body}`);
  }

  const done = items.filter((i) => i.status === "submitted").length;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M15</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
            <Users className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">Recommendation Letters</span></h1>
            <p className="text-sm text-muted-foreground">{done}/{items.length} letters submitted · request, remind, and draft.</p>
          </div>
        </div>

        <form onSubmit={add} className="mt-6 glass rounded-2xl p-5 grid gap-3 sm:grid-cols-2">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Recommender name" className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <input value={form.affiliation} onChange={(e) => setForm({ ...form, affiliation: e.target.value })} placeholder="Affiliation" className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="Relationship (e.g. Thesis advisor)" className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
          <button className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-nebula py-2.5 text-sm font-semibold text-primary-foreground glow">
            <Plus className="h-4 w-4" /> Add recommender
          </button>
        </form>

        <ul className="mt-6 space-y-3">
          {items.map((r) => (
            <li key={r.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{r.name}</h3>
                  <p className="text-xs text-muted-foreground">{[r.affiliation, r.relationship].filter(Boolean).join(" · ")}</p>
                  {r.email && <p className="mt-1 text-xs text-primary">{r.email}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <select value={r.status ?? "planned"} onChange={(e) => update(r.id, { status: e.target.value })}
                    className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs">
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                  <button onClick={() => draftEmail(r)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary">
                    <Mail className="h-3 w-3" /> Draft
                  </button>
                  <button onClick={() => remove(r.id)} className="rounded-full border border-border p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-muted-foreground">Add your first recommender above. 3 letters is the norm.</li>}
        </ul>
      </main>
    </div>
  );
}
