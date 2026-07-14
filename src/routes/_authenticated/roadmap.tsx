import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, Map, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({ meta: [{ title: "Academic Roadmap — Atlas" }, { name: "robots", content: "noindex" }] }),
  component: RoadmapPage,
});

type Task = {
  id: string;
  title: string;
  category: string | null;
  due_date: string | null;
  priority: string;
  notes: string | null;
  completed: boolean;
};

const CATEGORIES = ["Application", "Test prep", "Scholarship", "Research", "Documents", "Outreach", "Other"];

function RoadmapPage() {
  const { user } = Route.useRouteContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "done">("open");
  const [draft, setDraft] = useState({ title: "", category: "Application", due_date: "", priority: "normal", notes: "" });

  useEffect(() => { load(); }, [user.id]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("tasks").select("*").eq("user_id", user.id)
      .order("completed", { ascending: true }).order("due_date", { ascending: true, nullsFirst: false });
    if (error) toast.error(error.message);
    setTasks((data as Task[]) ?? []);
    setLoading(false);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id, title: draft.title.trim(), category: draft.category,
      due_date: draft.due_date || null, priority: draft.priority, notes: draft.notes || null,
    });
    if (error) return toast.error(error.message);
    setDraft({ title: "", category: draft.category, due_date: "", priority: "normal", notes: "" });
    load();
  }
  async function toggle(t: Task) {
    const { error } = await supabase.from("tasks").update({ completed: !t.completed }).eq("id", t.id);
    if (error) return toast.error(error.message);
    setTasks((x) => x.map((tt) => (tt.id === t.id ? { ...tt, completed: !tt.completed } : tt)));
  }
  async function remove(id: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTasks((x) => x.filter((t) => t.id !== id));
  }

  async function seedStarter() {
    const seeds = [
      { title: "Finalize target country list", category: "Application", priority: "high" },
      { title: "Register for IELTS / TOEFL", category: "Test prep", priority: "high" },
      { title: "Draft Statement of Purpose v1", category: "Documents", priority: "normal" },
      { title: "Shortlist 3 scholarships", category: "Scholarship", priority: "normal" },
      { title: "Email 2 professors of interest", category: "Outreach", priority: "normal" },
    ].map((x) => ({ ...x, user_id: user.id }));
    const { error } = await supabase.from("tasks").insert(seeds);
    if (error) return toast.error(error.message);
    toast.success("Starter tasks added");
    load();
  }

  const visible = tasks.filter((t) => filter === "all" ? true : filter === "done" ? t.completed : !t.completed);
  const done = tasks.filter((t) => t.completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M05</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
            <Map className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">Academic Roadmap</span></h1>
            <p className="text-sm text-muted-foreground">Every deadline. Every task. One plan.</p>
          </div>
        </div>

        <div className="mt-6 glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">{done}/{tasks.length} · {pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-nebula transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <form onSubmit={add} className="mt-6 glass rounded-2xl p-5 space-y-3">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="New task — e.g. Finalize SOP for MIT" required
            className="w-full rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input type="date" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
              className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
            <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
              className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
              <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
            </select>
          </div>
          <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-sm font-semibold text-primary-foreground glow">
            <Plus className="h-4 w-4" /> Add task
          </button>
        </form>

        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-2">
            {(["open", "done", "all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full border px-3 py-1 text-xs capitalize ${filter === f ? "border-primary bg-nebula text-primary-foreground" : "border-border glass"}`}>
                {f}
              </button>
            ))}
          </div>
          {tasks.length === 0 && !loading && (
            <button onClick={seedStarter} className="text-xs text-primary hover:underline">Add starter tasks</button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> :
            visible.length === 0 ? <p className="text-sm text-muted-foreground">Nothing here yet.</p> :
            visible.map((t) => (
              <div key={t.id} className="glass rounded-xl p-4 flex items-start gap-3">
                <button onClick={() => toggle(t)}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${t.completed ? "border-primary bg-nebula" : "border-border"}`}>
                  {t.completed && <Check className="h-3 w-3 text-primary-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {t.category && <span>{t.category}</span>}
                    {t.due_date && <span>· Due {new Date(t.due_date).toLocaleDateString()}</span>}
                    {t.priority === "high" && <span className="text-primary">· High priority</span>}
                  </div>
                </div>
                <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
        </div>
      </main>
    </div>
  );
}
