import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowLeft, CalendarDays, Check, Gauge, Loader2, Map as MapIcon, Plus, Rocket, Sparkles, Trash2, Wand2,
} from "lucide-react";
import {
  commitRoadmapTasks, generateRoadmap, nextBestAction, planCalendar, prioritizeTasks, readinessReport, scenarioSimulate,
} from "@/lib/planner-ai.functions";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({
    meta: [
      { title: "AI Roadmap & Success Planner — Atlas" },
      { name: "description", content: "Readiness report, AI roadmap, priority engine, unified deadline calendar and scenario simulator." },
      { name: "robots", content: "noindex" },
    ],
  }),
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
const TABS = ["Readiness", "Next action", "Roadmap", "Tasks", "Calendar", "Scenarios"] as const;
type Tab = (typeof TABS)[number];

const PRIO_STYLE: Record<string, string> = {
  critical: "text-destructive",
  high: "text-primary",
  normal: "text-muted-foreground",
  low: "text-muted-foreground",
};

function daysTo(d: string) {
  return Math.round((new Date(d).getTime() - Date.now()) / 86400000);
}

function RoadmapPage() {
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState<Tab>("Readiness");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "done">("open");
  const [draft, setDraft] = useState({ title: "", category: "Application", due_date: "", priority: "normal", notes: "" });

  const runReadiness = useServerFn(readinessReport);
  const runNext = useServerFn(nextBestAction);
  const runRoadmap = useServerFn(generateRoadmap);
  const runCommit = useServerFn(commitRoadmapTasks);
  const runPrioritize = useServerFn(prioritizeTasks);
  const runScenario = useServerFn(scenarioSimulate);
  const runCalendar = useServerFn(planCalendar);

  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<Awaited<ReturnType<typeof readinessReport>> | null>(null);
  const [nba, setNba] = useState<Awaited<ReturnType<typeof nextBestAction>> | null>(null);
  const [plan, setPlan] = useState<Awaited<ReturnType<typeof generateRoadmap>> | null>(null);
  const [horizon, setHorizon] = useState("12 months");
  const [ranked, setRanked] = useState<Array<{ title: string; tier: string; reason: string }>>([]);
  const [events, setEvents] = useState<Awaited<ReturnType<typeof planCalendar>>>([]);
  const [question, setQuestion] = useState("");
  const [scenario, setScenario] = useState<Awaited<ReturnType<typeof scenarioSimulate>> | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks").select("*").eq("user_id", user.id)
      .order("completed", { ascending: true }).order("due_date", { ascending: true, nullsFirst: false });
    if (error) toast.error(error.message);
    setTasks((data as Task[]) ?? []);
    setLoading(false);
  }

  async function guard(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
    setBusy(null);
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

  const visible = tasks.filter((t) => (filter === "all" ? true : filter === "done" ? t.completed : !t.completed));
  const done = tasks.filter((t) => t.completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const tierOf = useMemo(() => {
    const m = new Map<string, { tier: string; reason: string }>();
    ranked.forEach((r) => m.set(r.title.toLowerCase(), { tier: r.tier, reason: r.reason }));
    return m;
  }, [ranked]);

  const upcoming = events.filter((e) => daysTo(e.date) >= -1).slice(0, 60);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M04</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
            <MapIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">AI Roadmap & Success Planner</span></h1>
            <p className="text-sm text-muted-foreground">Where to apply, what to improve, and what to do next — recalculated as your profile changes.</p>
          </div>
        </div>

        <div className="mt-6 glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Plan progress</span>
            <span className="text-muted-foreground">{done}/{tasks.length} · {pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-nebula transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium ${tab === t ? "border-primary bg-nebula text-primary-foreground" : "border-border glass"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* READINESS */}
        {tab === "Readiness" && (
          <section className="mt-6 space-y-4">
            <div className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium"><Gauge className="h-4 w-4 text-primary" /> AI Student Readiness Report</div>
                <button onClick={() => guard("rep", async () => setReport(await runReadiness()))}
                  className="inline-flex items-center gap-2 rounded-full bg-nebula px-4 py-2 text-xs font-semibold text-primary-foreground glow">
                  {busy === "rep" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Analyze my profile
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Scores are estimates from the data in your Atlas profile — not admissions decisions.</p>
            </div>

            {report && (
              <>
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-end gap-4">
                    <p className="text-5xl font-bold text-gradient">{report.overall}</p>
                    <div className="pb-1">
                      <p className="text-sm font-semibold">{report.verdict}</p>
                      <p className="text-xs text-muted-foreground">Overall readiness</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{report.summary}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.areas.map((a) => (
                    <div key={a.area} className="glass rounded-2xl p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">{a.area}</h3>
                        <span className="text-xs text-muted-foreground">{a.priority}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full bg-nebula" style={{ width: `${a.score}%` }} />
                        </div>
                        <span className="text-sm font-semibold">{a.score}</span>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">{a.explanation}</p>
                      {!!a.strengths?.length && <p className="mt-2 text-xs"><span className="font-medium">Strengths:</span> {a.strengths.join(", ")}</p>}
                      {!!a.weaknesses?.length && <p className="mt-1 text-xs"><span className="font-medium">Gaps:</span> {a.weaknesses.join(", ")}</p>}
                      <p className="mt-2 text-xs text-primary">→ {a.action}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* NEXT ACTION */}
        {tab === "Next action" && (
          <section className="mt-6 space-y-4">
            <button onClick={() => guard("nba", async () => setNba(await runNext()))}
              className="inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-sm font-semibold text-primary-foreground glow">
              {busy === "nba" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} What should I do now?
            </button>
            {nba && (
              <>
                <div className="glass rounded-2xl p-6">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Your next best action</p>
                  <h2 className="mt-2 text-xl font-semibold">{nba.headline}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{nba.why}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {nba.effort && <span className="rounded-full border border-border px-3 py-1">Effort · {nba.effort}</span>}
                    <span className="rounded-full border border-border px-3 py-1">Deadline pressure · {nba.deadlinePressure}</span>
                  </div>
                </div>
                {!!nba.risks?.length && (
                  <div className="glass rounded-2xl p-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-destructive" /> Risk alerts</h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      {nba.risks.map((r, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-xs uppercase text-muted-foreground">{r.severity}</span>
                          <span>{r.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!!nba.weekly?.length && (
                  <div className="glass rounded-2xl p-5">
                    <h3 className="text-sm font-semibold">Personalized weekly strategy</h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {nba.weekly.map((w, i) => (
                        <div key={i} className="rounded-xl border border-border p-3 text-sm">
                          <p className="text-xs font-semibold text-primary">{w.day}</p>
                          <p className="text-muted-foreground">{w.focus}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {nba.forecast && <p className="text-sm text-muted-foreground">Forecast — {nba.forecast}</p>}
              </>
            )}
          </section>
        )}

        {/* ROADMAP */}
        {tab === "Roadmap" && (
          <section className="mt-6 space-y-4">
            <div className="glass rounded-2xl p-5 flex flex-wrap items-center gap-3">
              <select value={horizon} onChange={(e) => setHorizon(e.target.value)}
                className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
                {["30 days", "3 months", "6 months", "12 months", "2 years"].map((h) => <option key={h}>{h}</option>)}
              </select>
              <button onClick={() => guard("plan", async () => setPlan(await runRoadmap({ data: { horizon } })))}
                className="inline-flex items-center gap-2 rounded-full bg-nebula px-4 py-2 text-xs font-semibold text-primary-foreground glow">
                {busy === "plan" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Generate roadmap
              </button>
              {plan && !!plan.tasks.length && (
                <button
                  onClick={() => guard("commit", async () => {
                    const r = await runCommit({ data: { tasks: plan.tasks } });
                    toast.success(`${r.inserted} tasks added to your plan`);
                    load(); setTab("Tasks");
                  })}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium">
                  {busy === "commit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add {plan.tasks.length} tasks
                </button>
              )}
            </div>

            {plan?.phases.map((p) => (
              <div key={p.label} className="glass rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{p.label}</h3>
                  <span className="text-xs text-muted-foreground">{p.window}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.goal}</p>
                <ul className="mt-3 space-y-1 text-sm">
                  {p.milestones?.map((m, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{m}</li>)}
                </ul>
              </div>
            ))}

            {plan && !!plan.tasks.length && (
              <div className="glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold">Proposed tasks</h3>
                <div className="mt-3 space-y-2">
                  {plan.tasks.map((t, i) => (
                    <div key={i} className="rounded-xl border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{t.title}</p>
                        <span className={`text-xs capitalize ${PRIO_STYLE[t.priority] ?? ""}`}>{t.priority}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[t.category, t.due_date && `Due ${t.due_date}`, t.estimate, t.difficulty, t.depends_on && `after: ${t.depends_on}`].filter(Boolean).join(" · ")}
                      </p>
                      {t.why && <p className="mt-1 text-xs text-muted-foreground">{t.why}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* TASKS */}
        {tab === "Tasks" && (
          <section className="mt-6">
            <form onSubmit={add} className="glass rounded-2xl p-5 space-y-3">
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="New task — e.g. Finalize SOP for TU Delft" required
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
                  <option value="low">Low</option><option value="normal">Normal</option>
                  <option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
              <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-sm font-semibold text-primary-foreground glow">
                <Plus className="h-4 w-4" /> Add task
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {(["open", "done", "all"] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`rounded-full border px-3 py-1 text-xs capitalize ${filter === f ? "border-primary bg-nebula text-primary-foreground" : "border-border glass"}`}>
                    {f}
                  </button>
                ))}
              </div>
              <button onClick={() => guard("rank", async () => { const r = await runPrioritize(); setRanked(r.ranked); toast.success("Priority engine updated"); })}
                className="inline-flex items-center gap-2 text-xs text-primary hover:underline">
                {busy === "rank" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} AI priority engine
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> :
                visible.length === 0 ? <p className="text-sm text-muted-foreground">Nothing here yet — generate a roadmap to fill your plan.</p> :
                visible.map((t) => {
                  const r = tierOf.get(t.title.toLowerCase());
                  return (
                    <div key={t.id} className="glass rounded-xl p-4 flex items-start gap-3">
                      <button onClick={() => toggle(t)}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${t.completed ? "border-primary bg-nebula" : "border-border"}`}>
                        {t.completed && <Check className="h-3 w-3 text-primary-foreground" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-sm font-medium ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                          {r && <span className="rounded-full border border-primary/50 px-2 py-0.5 text-[10px] text-primary">{r.tier}</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {t.category && <span>{t.category}</span>}
                          {t.due_date && <span>· Due {new Date(t.due_date).toLocaleDateString()} ({daysTo(t.due_date)}d)</span>}
                          {(t.priority === "high" || t.priority === "critical") && <span className={PRIO_STYLE[t.priority]}>· {t.priority}</span>}
                        </div>
                        {t.notes && <p className="mt-1 text-xs text-muted-foreground">{t.notes}</p>}
                        {r && <p className="mt-1 text-xs text-primary">{r.reason}</p>}
                      </div>
                      <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* CALENDAR */}
        {tab === "Calendar" && (
          <section className="mt-6 space-y-4">
            <button onClick={() => guard("cal", async () => { setEvents(await runCalendar({})); })}
              className="inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-sm font-semibold text-primary-foreground glow">
              {busy === "cal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />} Load unified calendar
            </button>
            <p className="text-xs text-muted-foreground">University deadlines, interviews, test dates, exam-provider events, recommendation letters and task due dates in one timeline. Always verify critical dates with the official source.</p>
            <div className="space-y-2">
              {upcoming.map((e) => {
                const d = daysTo(e.date);
                return (
                  <div key={e.id} className="glass rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{e.kind}{e.meta ? ` · ${e.meta}` : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm">{new Date(e.date).toLocaleDateString()}</p>
                      <p className={`text-xs ${d <= 14 ? "text-destructive" : "text-muted-foreground"}`}>{d < 0 ? "past" : `in ${d} days`}</p>
                    </div>
                  </div>
                );
              })}
              {!upcoming.length && <p className="text-sm text-muted-foreground">No dated items yet.</p>}
            </div>
          </section>
        )}

        {/* SCENARIOS */}
        {tab === "Scenarios" && (
          <section className="mt-6 space-y-4">
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold">Scenario simulator</h3>
              <p className="mt-1 text-xs text-muted-foreground">Ask a "what if" and Atlas recalculates your options. Results are estimates.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["What if my GPA increases from 3.2 to 3.5?", "What if I score 7.5 IELTS?", "What if I don't get a scholarship?", "What if I take the GRE?", "Master's now vs work first?"].map((q) => (
                  <button key={q} onClick={() => setQuestion(q)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary">{q}</button>
                ))}
              </div>
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3}
                placeholder="What if I cannot afford this university?"
                className="mt-3 w-full rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
              <button disabled={!question.trim()}
                onClick={() => guard("sc", async () => setScenario(await runScenario({ data: { question } })))}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-sm font-semibold text-primary-foreground glow disabled:opacity-50">
                {busy === "sc" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Simulate
              </button>
            </div>

            {scenario && (
              <div className="glass rounded-2xl p-5 space-y-3 text-sm">
                <p className="font-semibold">{scenario.scenario}</p>
                <Row label="University options" value={scenario.universityOptions} />
                <Row label="Scholarship outlook" value={scenario.scholarshipOutlook} />
                <Row label="Admission probability" value={scenario.admissionProbability} />
                <Row label="Financial feasibility" value={scenario.financialFeasibility} />
                {!!scenario.tradeoffs?.length && (
                  <div><p className="text-xs font-medium">Trade-offs</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">{scenario.tradeoffs.map((t, i) => <li key={i}>• {t}</li>)}</ul></div>
                )}
                {!!scenario.nextSteps?.length && (
                  <div><p className="text-xs font-medium">Recommended next steps</p>
                    <ul className="mt-1 space-y-1 text-primary">{scenario.nextSteps.map((t, i) => <li key={i}>→ {t}</li>)}</ul></div>
                )}
                {scenario.verdict && <p className="text-muted-foreground">{scenario.verdict}</p>}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-muted-foreground">{value}</p>
    </div>
  );
}
