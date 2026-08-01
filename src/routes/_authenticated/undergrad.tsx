import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Award, CalendarClock, CheckCircle2, ClipboardList, FileText, GraduationCap,
  Loader2, Mic, Plus, Route as RouteIcon, Search, Sparkles, Target, Trash2, Wand2,
} from "lucide-react";
import { ugCollegeList, ugEssayReview, ugInterview, ugProfileAnalyzer, ugReadiness } from "@/lib/ug-ai.functions";

export const Route = createFileRoute("/_authenticated/undergrad")({
  head: () => ({
    meta: [
      { title: "Undergraduate Admission Hub — Atlas" },
      { name: "description", content: "Pathways, college list, essays, interviews and application tracking for undergraduate admission worldwide." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UndergradHub,
});

const PATHWAYS = [
  { id: "hs", label: "High School → Bachelor's", note: "Standard freshman entry" },
  { id: "alevel", label: "A-Level → Bachelor's", note: "UCAS predicted grades matter most" },
  { id: "ib", label: "IB Diploma → Bachelor's", note: "Predicted 7-point scores + HL subjects" },
  { id: "diploma", label: "Diploma → Bachelor's", note: "Credit mapping & advanced standing" },
  { id: "transfer", label: "Transfer Admission", note: "College transcripts + credit transfer" },
  { id: "foundation", label: "Foundation Program", note: "Pathway year before year 1" },
  { id: "intl", label: "International Freshman", note: "English proof + credential evaluation" },
];

const PLATFORMS = ["Common App", "UC Application", "Coalition App", "UCAS", "OUAC", "University Direct"];
const ROUNDS = ["Early Decision", "Early Action", "Regular Decision", "Rolling"];
const STATUSES = ["planning", "in progress", "submitted", "interview", "decision", "enrolled"];
const DOC_LIST = ["Transcript", "Personal statement", "Supplemental essays", "Recommendation letters", "Test scores", "Financial documents", "Portfolio", "Passport copy"];
const ACTIVITY_CATS = ["Academic award", "Olympiad", "Research", "Leadership", "Community service", "Volunteering", "Competition", "Sport", "Arts", "Entrepreneurship", "Certification"];
const REQUIREMENTS = [
  "GPA requirement", "Subject prerequisites", "SAT/ACT policy", "English requirement",
  "Portfolio", "Interview", "Essays", "Recommendation letters", "Required documents", "Deadlines",
];

type Tab = "pathway" | "explorer" | "profile" | "funding" | "toolkit" | "interview" | "tracker";
type App = {
  id: string; university_name: string; program: string | null; platform: string | null; round: string | null;
  status: string; deadline: string | null; missing_documents: string[] | null; interview_date: string | null;
  decision: string | null; aid_status: string | null; visa_status: string | null;
};
type Activity = { id: string; title: string; category: string | null; role: string | null; organization: string | null; hours_per_week: number | null; impact: string | null };
type Uni = {
  id: string; name: string; country: string | null; city: string | null; world_rank: number | null;
  acceptance_rate: number | null; tuition_usd: number | null; avg_gpa: number | null; ielts_min: number | null;
  toefl_min: number | null; programs: string[] | null; application_deadline: string | null;
  required_documents: string[] | null; gre_required: boolean | null;
};

function UndergradHub() {
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState<Tab>("pathway");
  const [pathway, setPathway] = useState<string>("");
  const [apps, setApps] = useState<App[]>([]);
  const [acts, setActs] = useState<Activity[]>([]);
  const [unis, setUnis] = useState<Uni[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: prof }, { data: a }, { data: ac }, { data: u }] = await Promise.all([
        supabase.from("profiles").select("ug_pathway").eq("id", user.id).maybeSingle(),
        supabase.from("applications").select("*").eq("user_id", user.id).order("deadline", { ascending: true, nullsFirst: false }),
        supabase.from("activities").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("universities").select("id,name,country,city,world_rank,acceptance_rate,tuition_usd,avg_gpa,ielts_min,toefl_min,programs,application_deadline,required_documents,gre_required").contains("levels", ["UG"]).order("world_rank", { nullsFirst: false }).limit(300),
      ]);
      setPathway(prof?.ug_pathway ?? "");
      setApps((a as App[]) ?? []);
      setActs((ac as Activity[]) ?? []);
      setUnis((u as Uni[]) ?? []);
      setLoading(false);
    })();
  }, [user.id]);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "pathway", label: "Pathway", icon: RouteIcon },
    { id: "explorer", label: "Explorer", icon: Search },
    { id: "profile", label: "Profile builder", icon: Target },
    { id: "funding", label: "Aid & scholarships", icon: Award },
    { id: "toolkit", label: "Essays & toolkit", icon: FileText },
    { id: "interview", label: "Interview prep", icon: Mic },
    { id: "tracker", label: "Tracker", icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M07 · Undergraduate Admission Hub</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-nebula glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">Undergraduate Admission Hub</span></h1>
            <p className="text-sm text-muted-foreground">Pathway → college list → essays → interviews → decisions, guided end to end.</p>
          </div>
        </div>

        <ReadinessBar />

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition ${
                tab === t.id ? "border-primary bg-nebula text-primary-foreground glow" : "border-border glass hover:border-primary/50"
              }`}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="mt-6">
            {tab === "pathway" && <PathwayTab userId={user.id} pathway={pathway} setPathway={setPathway} />}
            {tab === "explorer" && <ExplorerTab unis={unis} onAdd={(u) => addApp(u)} />}
            {tab === "profile" && <ProfileTab userId={user.id} acts={acts} setActs={setActs} />}
            {tab === "funding" && <FundingTab />}
            {tab === "toolkit" && <ToolkitTab />}
            {tab === "interview" && <InterviewTab />}
            {tab === "tracker" && <TrackerTab userId={user.id} apps={apps} setApps={setApps} />}
          </div>
        )}
      </main>
    </div>
  );

  async function addApp(u: Uni) {
    const row = { user_id: user.id, university_id: u.id, university_name: u.name, level: "UG", status: "planning", deadline: null as string | null };
    const { data, error } = await supabase.from("applications").insert(row).select().maybeSingle();
    if (error) return toast.error(error.message);
    setApps((prev) => [...prev, data as App]);
    toast.success(`${u.name} added to your tracker`);
  }
}

/* ---------- Readiness ---------- */
function ReadinessBar() {
  const run = useServerFn(ugReadiness);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);

  return (
    <div className="mt-6 glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI Application Readiness Score</h2>
          <p className="text-xs text-muted-foreground">Scores academics, testing, activities, essays, recommenders, finances and applications.</p>
        </div>
        <button onClick={async () => { setBusy(true); try { setRes(await run({ data: {} } as any)); } catch (e: any) { toast.error(e.message); } setBusy(false); }}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Analyze readiness
        </button>
      </div>
      {res && (
        <div className="mt-5 grid gap-4 lg:grid-cols-[160px_1fr]">
          <div className="rounded-2xl border border-border bg-background/40 p-4 text-center">
            <p className="text-4xl font-bold text-gradient">{res.score ?? 0}</p>
            <p className="text-xs text-muted-foreground">/ 100 ready</p>
          </div>
          <div>
            <p className="text-sm">{res.summary}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(res.pillars ?? []).map((p: any) => (
                <div key={p.name} className="rounded-xl border border-border bg-background/40 px-3 py-2">
                  <div className="flex items-center justify-between text-xs"><span className="font-medium">{p.name}</span><span className="text-muted-foreground">{p.score}%</span></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-nebula" style={{ width: `${p.score}%` }} /></div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{p.note}</p>
                </div>
              ))}
            </div>
            {(res.nextSteps ?? []).length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {res.nextSteps.map((s: string, i: number) => (
                  <li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{s}</li>
                ))}
              </ul>
            )}
            {(res.timeline ?? []).length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI timeline planner</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {res.timeline.map((t: any, i: number) => (
                    <div key={i} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
                      <p className="font-semibold">{t.month}</p>
                      <ul className="mt-1 list-disc pl-4 text-muted-foreground">{(t.actions ?? []).map((a: string, j: number) => <li key={j}>{a}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Pathway ---------- */
function PathwayTab({ userId, pathway, setPathway }: { userId: string; pathway: string; setPathway: (v: string) => void }) {
  async function pick(id: string) {
    setPathway(id);
    const { error } = await supabase.from("profiles").update({ ug_pathway: id }).eq("id", userId);
    if (error) toast.error(error.message); else toast.success("Pathway saved — guidance personalized");
  }
  const active = PATHWAYS.find((p) => p.id === pathway);
  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Choose your undergraduate pathway</h2>
        <p className="text-sm text-muted-foreground">Atlas personalizes requirements, deadlines and AI advice around this.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PATHWAYS.map((p) => (
            <button key={p.id} onClick={() => pick(p.id)}
              className={`rounded-2xl border p-4 text-left transition ${pathway === p.id ? "border-primary bg-primary/5 glow" : "border-border bg-background/40 hover:border-primary/50"}`}>
              <p className="text-sm font-semibold">{p.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Application platforms</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLATFORMS.map((p) => <span key={p} className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs">{p}</span>)}
        </div>
        <h2 className="mt-6 text-lg font-semibold">Rounds &amp; deadlines</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {ROUNDS.map((r) => <div key={r} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">{r}</div>)}
        </div>
        <h2 className="mt-6 text-lg font-semibold">Requirements checklist</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {REQUIREMENTS.map((r) => (
            <div key={r} className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {r}
            </div>
          ))}
        </div>
        {active && <p className="mt-5 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-xs">Personalized for <b>{active.label}</b> — {active.note}.</p>}
      </section>
    </div>
  );
}

/* ---------- Explorer ---------- */
function ExplorerTab({ unis, onAdd }: { unis: Uni[]; onAdd: (u: Uni) => void }) {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [maxTuition, setMaxTuition] = useState("");
  const [minAcceptance, setMinAcceptance] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [ai, setAi] = useState<any>(null);
  const runList = useServerFn(ugCollegeList);

  const countries = useMemo(() => Array.from(new Set(unis.map((u) => u.country).filter(Boolean))).sort() as string[], [unis]);
  const filtered = unis.filter((u) => {
    const hay = `${u.name} ${u.country} ${u.city} ${(u.programs ?? []).join(" ")}`.toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (country && u.country !== country) return false;
    if (maxTuition && (u.tuition_usd ?? 0) > Number(maxTuition)) return false;
    if (minAcceptance && (u.acceptance_rate ?? 0) < Number(minAcceptance)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI College List Optimizer</h2>
            <p className="text-xs text-muted-foreground">Balanced reach / target / safety list with a suggested application round.</p>
          </div>
          <button onClick={async () => { setAiBusy(true); try { setAi(await runList({ data: { limit: 10 } })); } catch (e: any) { toast.error(e.message); } setAiBusy(false); }}
            disabled={aiBusy}
            className="inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
            {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Build my list
          </button>
        </div>
        {ai?.strategy && <p className="mt-4 rounded-xl border border-border bg-background/40 px-4 py-3 text-sm">{ai.strategy}</p>}
        {ai?.note && <p className="mt-4 text-sm text-muted-foreground">{ai.note}</p>}
        {(ai?.picks ?? []).length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ai.picks.map((p: any) => (
              <div key={p.id ?? p.name} className="rounded-xl border border-border bg-background/40 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[10px] uppercase">{p.band}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.reason}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Fit {p.fit}%</span><span>Suggested: {p.suggestedRound}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass rounded-2xl p-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search university, city or major…"
            className="sm:col-span-2 rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary">
            <option value="">All countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={maxTuition} onChange={(e) => setMaxTuition(e.target.value)} type="number" placeholder="Max tuition USD"
            className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={minAcceptance} onChange={(e) => setMinAcceptance(e.target.value)} type="number" placeholder="Min acceptance rate %"
            className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{filtered.length} undergraduate universities</p>

        <div className="mt-4 space-y-2">
          {filtered.slice(0, 60).map((u) => (
            <div key={u.id} className="rounded-xl border border-border bg-background/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{u.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[u.city, u.country].filter(Boolean).join(", ")}
                    {u.world_rank ? ` · #${u.world_rank}` : ""}
                    {u.tuition_usd ? ` · $${u.tuition_usd.toLocaleString()}/yr` : ""}
                    {u.acceptance_rate ? ` · ${u.acceptance_rate}% acceptance` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setOpen(open === u.id ? null : u.id)} className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary/50">Requirements</button>
                  <Link to="/universities/$id" params={{ id: u.id }} className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary/50">Details</Link>
                  <button onClick={() => onAdd(u)} className="inline-flex items-center gap-1 rounded-full bg-nebula px-3 py-1 text-xs font-semibold text-primary-foreground glow">
                    <Plus className="h-3 w-3" /> Track
                  </button>
                </div>
              </div>
              {open === u.id && (
                <div className="mt-3 grid gap-2 border-t border-border pt-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                  <Req label="GPA requirement" value={u.avg_gpa ? `~${u.avg_gpa} average` : "Not published"} />
                  <Req label="English requirement" value={[u.ielts_min ? `IELTS ${u.ielts_min}` : null, u.toefl_min ? `TOEFL ${u.toefl_min}` : null].filter(Boolean).join(" / ") || "Check university"} />
                  <Req label="SAT/ACT policy" value={u.country === "USA" ? "Test-optional or required — verify per program" : "Usually not required"} />
                  <Req label="Subject prerequisites" value={(u.programs ?? []).slice(0, 3).join(", ") || "Program dependent"} />
                  <Req label="Deadlines" value={u.application_deadline ?? "Rolling / see university"} />
                  <Req label="Required documents" value={(u.required_documents ?? []).join(", ") || DOC_LIST.slice(0, 5).join(", ")} />
                  <Req label="Essays" value="Personal statement + supplements" />
                  <Req label="Recommendations" value="1–3 letters" />
                  <Req label="Interview / portfolio" value="Required for selective & arts programs" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
function Req({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border/60 px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-0.5">{value}</p></div>;
}

/* ---------- Profile builder ---------- */
function ProfileTab({ userId, acts, setActs }: { userId: string; acts: Activity[]; setActs: (a: Activity[]) => void }) {
  const [form, setForm] = useState({ title: "", category: ACTIVITY_CATS[0], role: "", organization: "", hours_per_week: "", impact: "" });
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<any>(null);
  const analyze = useServerFn(ugProfileAnalyzer);

  async function add() {
    if (!form.title.trim()) return toast.error("Add a title");
    const { data, error } = await supabase.from("activities").insert({
      user_id: userId, title: form.title, category: form.category, role: form.role || null,
      organization: form.organization || null, hours_per_week: form.hours_per_week ? Number(form.hours_per_week) : null,
      impact: form.impact || null,
    }).select().maybeSingle();
    if (error) return toast.error(error.message);
    setActs([data as Activity, ...acts]);
    setForm({ title: "", category: ACTIVITY_CATS[0], role: "", organization: "", hours_per_week: "", impact: "" });
  }
  async function remove(id: string) {
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setActs(acts.filter((a) => a.id !== id));
  }

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Undergraduate profile builder</h2>
        <p className="text-sm text-muted-foreground">Awards, olympiads, research, leadership, service, sports, arts, entrepreneurship and certifications.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Activity / award title"
            className="sm:col-span-2 rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary">
            {ACTIVITY_CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Role (e.g. President)"
            className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="Organization"
            className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={form.hours_per_week} onChange={(e) => setForm({ ...form, hours_per_week: e.target.value })} type="number" placeholder="Hours / week"
            className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })} placeholder="Impact (numbers help)"
            className="sm:col-span-2 rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <button onClick={add} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-nebula px-4 py-2.5 text-sm font-semibold text-primary-foreground glow">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        <ul className="mt-5 space-y-2">
          {acts.length === 0 && <li className="text-sm text-muted-foreground">No activities yet — add your strongest 5–10.</li>}
          {acts.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-4 py-2.5 text-sm">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{[a.category, a.role, a.organization, a.hours_per_week ? `${a.hours_per_week} h/wk` : null].filter(Boolean).join(" · ")}</p>
              </div>
              <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI Activity Profile Analyzer</h2>
          <button onClick={async () => { setBusy(true); try { setAi(await analyze({ data: {} } as any)); } catch (e: any) { toast.error(e.message); } setBusy(false); }}
            disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Analyze profile
          </button>
        </div>
        {ai && (
          <div className="mt-4 space-y-3 text-sm">
            {ai.spike && <p className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3"><b>Spike:</b> {ai.spike}</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              {(ai.tiers ?? []).map((t: any, i: number) => (
                <div key={i} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
                  <p className="font-medium">Tier {t.tier} · {t.activity}</p>
                  <p className="text-muted-foreground">{t.note}</p>
                </div>
              ))}
            </div>
            {(ai.gaps ?? []).length > 0 && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Gaps</p><ul className="mt-1 list-disc pl-5 text-sm">{ai.gaps.map((g: string, i: number) => <li key={i}>{g}</li>)}</ul></div>}
            {(ai.boosters ?? []).length > 0 && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Boosters</p><ul className="mt-1 list-disc pl-5 text-sm">{ai.boosters.map((g: string, i: number) => <li key={i}>{g}</li>)}</ul></div>}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- Funding ---------- */
function FundingTab() {
  const analyze = useServerFn(ugProfileAnalyzer);
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<any>(null);
  const [tuition, setTuition] = useState("40000");
  const [living, setLiving] = useState("15000");
  const [aid, setAid] = useState("10000");
  const total = Math.max(Number(tuition || 0) + Number(living || 0) - Number(aid || 0), 0);

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Aid types</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {["Need-based aid", "Merit scholarships", "Athletic scholarships", "Talent scholarships", "Government scholarships", "University scholarships"].map((x) => (
            <div key={x} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">{x}</div>
          ))}
        </div>
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Cost calculator</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted-foreground">Tuition / yr (USD)
            <input value={tuition} onChange={(e) => setTuition(e.target.value)} type="number" className="mt-1 w-full rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary" /></label>
          <label className="text-xs text-muted-foreground">Living / yr (USD)
            <input value={living} onChange={(e) => setLiving(e.target.value)} type="number" className="mt-1 w-full rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary" /></label>
          <label className="text-xs text-muted-foreground">Expected aid / yr (USD)
            <input value={aid} onChange={(e) => setAid(e.target.value)} type="number" className="mt-1 w-full rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary" /></label>
        </div>
        <p className="mt-4 text-sm">Net cost: <b className="text-gradient text-xl">${total.toLocaleString()}</b> per year · <b>${(total * 4).toLocaleString()}</b> for a 4-year degree.</p>
      </section>

      <section className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI Scholarship Matcher &amp; Aid Estimator</h2>
          <button onClick={async () => { setBusy(true); try { setAi(await analyze({ data: {} } as any)); } catch (e: any) { toast.error(e.message); } setBusy(false); }}
            disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Match funding
          </button>
        </div>
        {ai?.aidEstimate && (
          <p className="mt-4 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
            Need-based likelihood: <b>{ai.aidEstimate.needBasedLikelihood}</b> · Merit likelihood: <b>{ai.aidEstimate.meritLikelihood}</b> — {ai.aidEstimate.note}
          </p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(ai?.scholarships ?? []).map((s: any, i: number) => (
            <div key={i} className="rounded-xl border border-border bg-background/40 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{s.name}</p>
                <span className="text-xs text-muted-foreground">{s.matchPct}%</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.why}</p>
            </div>
          ))}
        </div>
        <Link to="/scholarships" className="mt-4 inline-block text-xs text-primary hover:underline">Browse the full scholarship database →</Link>
      </section>
    </div>
  );
}

/* ---------- Toolkit ---------- */
function ToolkitTab() {
  const review = useServerFn(ugEssayReview);
  const [kind, setKind] = useState("Personal statement");
  const [university, setUniversity] = useState("");
  const [prompt, setPrompt] = useState("");
  const [essay, setEssay] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const words = essay.trim() ? essay.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Application toolkit</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {["Personal statement", "College essay", "Supplemental essays", "Activities list", "Resume", "Recommendation manager", "Portfolio builder"].map((x) => (
            <div key={x} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">{x}</div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <Link to="/cv" className="text-primary hover:underline">Build your resume in M14 →</Link>
          <Link to="/recommendations" className="text-primary hover:underline">Manage recommenders in M15 →</Link>
          <Link to="/sop" className="text-primary hover:underline">Long-form essays in M13 →</Link>
        </div>
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI Essay Reviewer</h2>
        <p className="text-xs text-muted-foreground">Scoring, rubric feedback, grammar check and originality risk.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary">
            {["Personal statement", "College essay", "Supplemental essay", "UCAS personal statement", "Activities list description"].map((k) => <option key={k}>{k}</option>)}
          </select>
          <input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="University (optional)"
            className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Essay prompt (optional)"
            className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
        </div>
        <textarea value={essay} onChange={(e) => setEssay(e.target.value)} rows={12} placeholder="Paste your draft here…"
          className="mt-3 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary" />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{words} words</span>
          <button onClick={async () => { setBusy(true); try { setRes(await review({ data: { essay, kind, university, prompt } })); } catch (e: any) { toast.error(e.message); } setBusy(false); }}
            disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Review essay
          </button>
        </div>

        {res && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-2xl border border-border bg-background/40 px-6 py-3 text-center">
                <p className="text-3xl font-bold text-gradient">{res.score}</p><p className="text-[11px] text-muted-foreground">essay score</p>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs">Originality risk: {res.originalityRisk} — {res.originalityNote}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {(res.rubric ?? []).map((r: any, i: number) => (
                <div key={i} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
                  <div className="flex justify-between"><span className="font-medium">{r.name}</span><span>{r.score}</span></div>
                  <p className="text-muted-foreground">{r.note}</p>
                </div>
              ))}
            </div>
            {(res.strengths ?? []).length > 0 && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Strengths</p><ul className="mt-1 list-disc pl-5 text-sm">{res.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>}
            {(res.fixes ?? []).length > 0 && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Fixes</p><ul className="mt-1 list-disc pl-5 text-sm">{res.fixes.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>}
            {(res.grammar ?? []).length > 0 && (
              <div><p className="text-xs font-semibold uppercase text-muted-foreground">Grammar</p>
                <ul className="mt-1 space-y-1 text-sm">{res.grammar.map((g: any, i: number) => <li key={i}><span className="text-muted-foreground line-through">{g.issue}</span> → {g.suggestion}</li>)}</ul>
              </div>
            )}
            {res.rewrittenOpening && <p className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm"><b>Stronger opening:</b> {res.rewrittenOpening}</p>}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- Interview ---------- */
function InterviewTab() {
  const run = useServerFn(ugInterview);
  const [type, setType] = useState("Admission interview");
  const [questions, setQuestions] = useState<string[]>([]);
  const [active, setActive] = useState<string>("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Mic className="h-4 w-4 text-primary" /> AI Mock Interview</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary">
            {["Admission interview", "Scholarship interview", "Virtual interview", "Alumni interview"].map((t) => <option key={t}>{t}</option>)}
          </select>
          <button onClick={async () => { setBusy(true); try { const r = await run({ data: { mode: "questions", interviewType: type } }); setQuestions((r as any).questions ?? []); setRes(null); } catch (e: any) { toast.error(e.message); } setBusy(false); }}
            disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Generate questions
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {questions.map((q, i) => (
            <li key={i}>
              <button onClick={() => { setActive(q); setAnswer(""); setRes(null); }}
                className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition ${active === q ? "border-primary bg-primary/5" : "border-border bg-background/40 hover:border-primary/50"}`}>
                {q}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {active && (
        <section className="glass rounded-2xl p-6">
          <p className="text-sm font-semibold">{active}</p>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={7} placeholder="Type your answer as you would say it…"
            className="mt-3 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary" />
          <button onClick={async () => { setBusy(true); try { setRes(await run({ data: { mode: "evaluate", interviewType: type, question: active, answer } })); } catch (e: any) { toast.error(e.message); } setBusy(false); }}
            disabled={busy || answer.trim().length < 10}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Score my answer
          </button>
          {res && (
            <div className="mt-5 space-y-3">
              <div className="grid gap-2 sm:grid-cols-4">
                {[["Overall", res.score], ["Confidence", res.confidence], ["Communication", res.communication], ["Structure", res.structure]].map(([k, v]: any) => (
                  <div key={k} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-center">
                    <p className="text-xl font-bold text-gradient">{v}</p><p className="text-[11px] text-muted-foreground">{k}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm">{res.feedback}</p>
              {(res.improve ?? []).length > 0 && <ul className="list-disc pl-5 text-sm">{res.improve.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>}
              {res.modelAnswer && <p className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm"><b>Model answer:</b> {res.modelAnswer}</p>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ---------- Tracker ---------- */
function TrackerTab({ userId, apps, setApps }: { userId: string; apps: App[]; setApps: (a: App[]) => void }) {
  const [name, setName] = useState("");

  async function add() {
    if (!name.trim()) return toast.error("Enter a university name");
    const { data, error } = await supabase.from("applications")
      .insert({ user_id: userId, university_name: name, level: "UG", status: "planning" }).select().maybeSingle();
    if (error) return toast.error(error.message);
    setApps([...apps, data as App]);
    setName("");
  }
  async function patch(id: string, fields: Partial<App>) {
    const { error } = await supabase.from("applications").update(fields).eq("id", id);
    if (error) return toast.error(error.message);
    setApps(apps.map((a) => (a.id === id ? { ...a, ...fields } : a)));
  }
  async function remove(id: string) {
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setApps(apps.filter((a) => a.id !== id));
  }
  function toggleDoc(a: App, doc: string) {
    const cur = a.missing_documents ?? [];
    patch(a.id, { missing_documents: cur.includes(doc) ? cur.filter((d) => d !== doc) : [...cur, doc] });
  }

  const upcoming = apps.filter((a) => a.deadline).sort((x, y) => (x.deadline! < y.deadline! ? -1 : 1)).slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Application tracker</h2>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add university…"
              className="rounded-xl border border-input bg-background/40 px-4 py-2 text-sm outline-none focus:border-primary" />
            <button onClick={add} className="inline-flex items-center gap-1 rounded-full bg-nebula px-4 py-2 text-xs font-semibold text-primary-foreground glow"><Plus className="h-3.5 w-3.5" /> Add</button>
          </div>
        </div>
        {upcoming.length > 0 && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-xs">
            <CalendarClock className="h-3.5 w-3.5 text-primary" /> Next: {upcoming.map((u) => `${u.university_name} (${new Date(u.deadline!).toLocaleDateString()})`).join(" · ")}
          </p>
        )}
      </section>

      <div className="space-y-3">
        {apps.length === 0 && <p className="text-sm text-muted-foreground">No applications tracked yet — add one above or from the Explorer tab.</p>}
        {apps.map((a) => (
          <section key={a.id} className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">{a.university_name}</p>
              <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Cell label="Program"><input defaultValue={a.program ?? ""} onBlur={(e) => patch(a.id, { program: e.target.value })} className="w-full rounded-lg border border-input bg-background/40 px-3 py-1.5 text-xs outline-none focus:border-primary" /></Cell>
              <Cell label="Platform">
                <select value={a.platform ?? ""} onChange={(e) => patch(a.id, { platform: e.target.value })} className="w-full rounded-lg border border-input bg-background/40 px-3 py-1.5 text-xs outline-none focus:border-primary">
                  <option value="">—</option>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Cell>
              <Cell label="Round">
                <select value={a.round ?? ""} onChange={(e) => patch(a.id, { round: e.target.value })} className="w-full rounded-lg border border-input bg-background/40 px-3 py-1.5 text-xs outline-none focus:border-primary">
                  <option value="">—</option>{ROUNDS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Cell>
              <Cell label="Status">
                <select value={a.status} onChange={(e) => patch(a.id, { status: e.target.value })} className="w-full rounded-lg border border-input bg-background/40 px-3 py-1.5 text-xs outline-none focus:border-primary">
                  {STATUSES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Cell>
              <Cell label="Deadline"><input type="date" value={a.deadline ?? ""} onChange={(e) => patch(a.id, { deadline: e.target.value || null })} className="w-full rounded-lg border border-input bg-background/40 px-3 py-1.5 text-xs outline-none focus:border-primary" /></Cell>
              <Cell label="Interview"><input type="date" value={a.interview_date ?? ""} onChange={(e) => patch(a.id, { interview_date: e.target.value || null })} className="w-full rounded-lg border border-input bg-background/40 px-3 py-1.5 text-xs outline-none focus:border-primary" /></Cell>
              <Cell label="Decision">
                <select value={a.decision ?? ""} onChange={(e) => patch(a.id, { decision: e.target.value })} className="w-full rounded-lg border border-input bg-background/40 px-3 py-1.5 text-xs outline-none focus:border-primary">
                  <option value="">Pending</option>{["Accepted", "Waitlisted", "Deferred", "Rejected"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </Cell>
              <Cell label="Financial aid">
                <select value={a.aid_status ?? ""} onChange={(e) => patch(a.id, { aid_status: e.target.value })} className="w-full rounded-lg border border-input bg-background/40 px-3 py-1.5 text-xs outline-none focus:border-primary">
                  <option value="">—</option>{["Not applied", "Applied", "Awarded", "Denied"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </Cell>
              <Cell label="Visa progress">
                <select value={a.visa_status ?? ""} onChange={(e) => patch(a.id, { visa_status: e.target.value })} className="w-full rounded-lg border border-input bg-background/40 px-3 py-1.5 text-xs outline-none focus:border-primary">
                  <option value="">—</option>{["Not started", "Documents ready", "Interview booked", "Approved", "Denied"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </Cell>
            </div>
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Missing documents</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {DOC_LIST.map((d) => {
                  const missing = (a.missing_documents ?? []).includes(d);
                  return (
                    <button key={d} onClick={() => toggleDoc(a, d)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition ${missing ? "border-destructive/60 text-destructive" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                      {missing ? "Missing: " : ""}{d}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>{children}</div>;
}
