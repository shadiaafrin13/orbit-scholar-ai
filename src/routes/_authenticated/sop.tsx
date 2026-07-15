import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, FileText, Plus, Sparkles, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sop")({
  head: () => ({ meta: [{ title: "SOP & Essay AI — Atlas" }, { name: "robots", content: "noindex" }] }),
  component: SopPage,
});

type Sop = { id: string; program: string | null; prompt: string | null; content: string | null; version: number | null; ai_score: number | null; ai_feedback: string | null; updated_at: string };

function SopPage() {
  const { user } = Route.useRouteContext();
  const [items, setItems] = useState<Sop[]>([]);
  const [active, setActive] = useState<Sop | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sops").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      const rows = (data as Sop[]) ?? [];
      setItems(rows);
      setActive(rows[0] ?? null);
    })();
  }, [user.id]);

  async function create() {
    const { data, error } = await supabase.from("sops").insert({ user_id: user.id, program: "New SOP", content: "" }).select().single();
    if (error) return toast.error(error.message);
    const row = data as Sop;
    setItems([row, ...items]);
    setActive(row);
  }

  async function save() {
    if (!active) return;
    const { error } = await supabase.from("sops").update({
      program: active.program, prompt: active.prompt, content: active.content, version: (active.version ?? 1),
    }).eq("id", active.id);
    if (error) return toast.error(error.message);
    setItems(items.map((i) => i.id === active.id ? active : i));
    toast.success("Saved");
  }

  function analyze() {
    if (!active?.content) return;
    const text = active.content.trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0).length;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 5).length;
    const avgLen = sentences ? words / sentences : 0;
    let score = 50;
    if (words >= 700 && words <= 1200) score += 20; else if (words >= 500) score += 10;
    if (paragraphs >= 4 && paragraphs <= 7) score += 15;
    if (avgLen >= 14 && avgLen <= 22) score += 15;
    const notes: string[] = [];
    if (words < 500) notes.push(`Too short (${words} words) — most SOPs target 800–1000.`);
    if (words > 1300) notes.push(`Too long (${words} words) — trim to 1000–1200.`);
    if (paragraphs < 4) notes.push("Break into ~5 paragraphs: hook, background, research fit, why-program, career vision.");
    if (avgLen > 25) notes.push("Some sentences are long — aim for 15–22 words on average.");
    if (!/because|which is why|led me to/i.test(text)) notes.push("Add explicit causal links between experiences and choices.");
    if (!/professor|advisor|lab|research group/i.test(text)) notes.push("Name specific professors or labs at the target program.");
    const feedback = notes.length ? notes.join("\n") : "Strong structure. Tighten transitions and end with a concrete future goal.";
    const updated = { ...active, ai_score: Math.min(100, score), ai_feedback: feedback };
    setActive(updated);
    supabase.from("sops").update({ ai_score: updated.ai_score, ai_feedback: feedback }).eq("id", active.id).then(({ error }) => {
      if (error) toast.error(error.message); else toast.success(`Scored ${updated.ai_score}/100`);
    });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("sops").delete().eq("id", id);
    if (error) return toast.error(error.message);
    const rest = items.filter((i) => i.id !== id);
    setItems(rest); setActive(rest[0] ?? null);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M13</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">SOP & Essay AI</span></h1>
            <p className="text-sm text-muted-foreground">Draft, save, and score every statement of purpose.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="glass rounded-2xl p-4">
            <button onClick={create} className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-nebula py-2 text-sm font-semibold text-primary-foreground glow">
              <Plus className="h-4 w-4" /> New SOP
            </button>
            <ul className="mt-4 space-y-1.5">
              {items.map((s) => (
                <li key={s.id}>
                  <button onClick={() => setActive(s)} className={`w-full rounded-xl border px-3 py-2 text-left text-xs ${active?.id === s.id ? "border-primary bg-secondary" : "border-border"}`}>
                    <p className="font-medium truncate">{s.program || "Untitled"}</p>
                    <p className="text-muted-foreground">{s.ai_score ? `Score ${s.ai_score}` : "Not scored"}</p>
                  </button>
                </li>
              ))}
              {items.length === 0 && <li className="text-xs text-muted-foreground">No SOPs yet.</li>}
            </ul>
          </aside>

          {active ? (
            <section className="glass rounded-2xl p-6 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <input value={active.program ?? ""} onChange={(e) => setActive({ ...active, program: e.target.value })}
                  className="flex-1 rounded-xl border border-input bg-background/40 px-3 py-2 text-sm font-semibold" placeholder="Program (e.g. MIT MS in EECS)" />
                <button onClick={save} className="rounded-xl border border-border px-4 py-2 text-xs hover:bg-secondary">Save</button>
                <button onClick={analyze} className="inline-flex items-center gap-1 rounded-xl bg-nebula px-4 py-2 text-xs font-semibold text-primary-foreground glow">
                  <Sparkles className="h-3 w-3" /> Score
                </button>
                <button onClick={() => remove(active.id)} className="rounded-xl border border-border p-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <input value={active.prompt ?? ""} onChange={(e) => setActive({ ...active, prompt: e.target.value })}
                placeholder="Essay prompt / word limit" className="w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-xs" />
              <textarea value={active.content ?? ""} onChange={(e) => setActive({ ...active, content: e.target.value })}
                rows={16} placeholder="Write your SOP here..."
                className="w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary" />
              <p className="text-xs text-muted-foreground">{(active.content ?? "").split(/\s+/).filter(Boolean).length} words</p>
              {active.ai_feedback && (
                <div className="rounded-xl border border-primary/40 bg-nebula/10 p-4">
                  <p className="text-xs font-semibold">AI feedback · Score {active.ai_score}/100</p>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{active.ai_feedback}</pre>
                </div>
              )}
            </section>
          ) : (
            <section className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
              Create your first SOP to get started.
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
