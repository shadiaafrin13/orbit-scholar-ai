import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Award, BookOpen, CalendarClock, CheckCircle2, ClipboardList, FileText, FlaskConical,
  Gauge, Layers, ListChecks, Loader2, Mail, Mic, Plus, Route as RouteIcon, Scale, Search, Sparkles,
  Trash2, Users, Wand2,
} from "lucide-react";
import {
  mastersAdmissionPredictor, mastersDecisionAdvisor, mastersDocReview, mastersFitAnalyzer,
  mastersFundingOptimizer, mastersInterview, mastersProfessorAI, mastersProgramMatcher,
  mastersQualityCheck, mastersReadiness, mastersRequirements, mastersRoadmap,
  mastersSpecializationMatcher,
} from "@/lib/masters-ai.functions";
import { AIResult } from "@/components/ai-result";

export const Route = createFileRoute("/_authenticated/masters")({
  head: () => ({
    meta: [
      { title: "Master's Admission Hub — Atlas" },
      { name: "description", content: "Program explorer, funding, SOP and CV review, professor outreach, interviews and application tracking for Master's admission." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MastersHub,
});

const PATHWAYS = [
  { id: "bachelors", label: "Bachelor's → Master's", note: "Standard graduate entry" },
  { id: "integrated", label: "Integrated Master's", note: "Continuous 4–5 year track" },
  { id: "coursework", label: "Coursework Master's", note: "Taught, exam & project based" },
  { id: "research", label: "Research Master's", note: "Thesis + supervisor match matters most" },
  { id: "professional", label: "Professional Master's", note: "Industry-facing, practice oriented" },
  { id: "mba", label: "MBA", note: "GMAT/GRE + work experience" },
  { id: "executive", label: "Executive Master's", note: "5+ years of leadership experience" },
  { id: "online", label: "Online Master's", note: "Flexible, lower cost, no visa" },
  { id: "dual", label: "Dual Degree Master's", note: "Two institutions, two credentials" },
];

const REQUIREMENTS = [
  "Minimum GPA", "Required degree", "Prerequisite courses", "GRE / GMAT", "English requirement",
  "Work experience", "Portfolio", "Interview", "Required documents",
];
const RESEARCH_PREP = [
  "Research experience builder", "Final-year project showcase", "Publication portfolio",
  "Research interest development", "Professor identification", "Academic skill assessment",
];
const FUNDING_TYPES = [
  "University scholarships", "Government scholarships", "Fellowships", "Graduate assistantships",
  "Research assistantships", "Teaching assistantships", "External funding",
];
const TOOLKIT = [
  "SOP builder", "Personal statement", "Motivation letter", "Academic CV",
  "Resume", "Recommendation manager", "Email builder", "Portfolio builder",
];
const DOC_KINDS = ["Statement of Purpose", "Personal statement", "Motivation letter", "Academic CV", "Resume"];
const INTERVIEW_TYPES = ["Academic interview", "Scholarship interview", "Faculty interview", "Research discussion"];
const STATUSES = ["planning", "in progress", "submitted", "interview", "offer", "waitlist", "rejected", "enrolled"];
const PROF_STATUSES = ["identified", "emailed", "replied", "call scheduled", "positive", "no response", "declined"];
const DOC_LIST = ["Transcript", "Statement of purpose", "Academic CV", "Recommendation letters", "GRE/GMAT scores", "English test", "Portfolio", "Research proposal", "Financial documents", "Passport copy"];
const INTAKES = ["Fall", "Spring", "Summer", "Winter"];

type Tab =
  | "pathway" | "explorer" | "requirements" | "fit" | "specializations" | "research" | "funding"
  | "toolkit" | "professors" | "interview" | "tracker" | "quality" | "decision" | "roadmap";
type App = {
  id: string; university_name: string; program: string | null; level: string | null; platform: string | null;
  round: string | null; status: string; deadline: string | null; missing_documents: string[] | null;
  interview_date: string | null; decision: string | null; aid_status: string | null; visa_status: string | null;
};
type Prof = {
  id: string; name: string; university: string | null; department: string | null; research_area: string | null;
  email: string | null; lab: string | null; status: string; compatibility: number | null; notes: string | null;
};
type Uni = {
  id: string; name: string; country: string | null; city: string | null; world_rank: number | null;
  employability_rank: number | null; acceptance_rate: number | null; tuition_usd: number | null;
  living_cost_usd: number | null; avg_gpa: number | null; ielts_min: number | null; toefl_min: number | null;
  gre_required: boolean | null; gmat_required: boolean | null; programs: string[] | null;
  research_areas: string[] | null; application_deadline: string | null; required_documents: string[] | null;
  scholarships_info: string | null; website: string | null;
};

function MastersHub() {
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState<Tab>("pathway");
  const [pathway, setPathway] = useState("");
  const [apps, setApps] = useState<App[]>([]);
  const [profs, setProfs] = useState<Prof[]>([]);
  const [unis, setUnis] = useState<Uni[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: prof }, { data: a }, { data: pc }, { data: u }] = await Promise.all([
        supabase.from("profiles").select("masters_pathway").eq("id", user.id).maybeSingle(),
        supabase.from("applications").select("*").eq("user_id", user.id).order("deadline", { ascending: true, nullsFirst: false }),
        supabase.from("professor_contacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("universities")
          .select("id,name,country,city,world_rank,employability_rank,acceptance_rate,tuition_usd,living_cost_usd,avg_gpa,ielts_min,toefl_min,gre_required,gmat_required,programs,research_areas,application_deadline,required_documents,scholarships_info,website")
          .contains("levels", ["PG"]).order("world_rank", { nullsFirst: false }).limit(300),
      ]);
      setPathway((prof as { masters_pathway?: string } | null)?.masters_pathway ?? "");
      setApps((a as App[]) ?? []);
      setProfs((pc as Prof[]) ?? []);
      setUnis((u as Uni[]) ?? []);
      setLoading(false);
    })();
  }, [user.id]);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "pathway", label: "Pathway", icon: RouteIcon },
    { id: "explorer", label: "Program explorer", icon: Search },
    { id: "research", label: "Research prep", icon: FlaskConical },
    { id: "funding", label: "Funding", icon: Award },
    { id: "toolkit", label: "Documents", icon: FileText },
    { id: "professors", label: "Professors", icon: Users },
    { id: "interview", label: "Interview prep", icon: Mic },
    { id: "tracker", label: "Tracker", icon: ClipboardList },
    { id: "requirements", label: "Requirements & prerequisites", icon: ListChecks },
    { id: "fit", label: "Fit analyzer", icon: Gauge },
    { id: "specializations", label: "Specializations", icon: Layers },
    { id: "quality", label: "Quality check", icon: CheckCircle2 },
    { id: "decision", label: "Decision center", icon: Scale },
    { id: "roadmap", label: "AI roadmap", icon: CalendarClock },
  ];

  async function addApp(u: Uni, program?: string) {
    const row = {
      user_id: user.id, university_id: u.id, university_name: u.name,
      program: program ?? (u.programs?.[0] ?? null), level: "PG", status: "planning",
    };
    const { data, error } = await supabase.from("applications").insert(row).select().maybeSingle();
    if (error) return toast.error(error.message);
    setApps((prev) => [...prev, data as App]);
    toast.success(`${u.name} added to your tracker`);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M08 · Master's Admission Hub</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-nebula glow">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">Master's Admission Hub</span></h1>
            <p className="text-sm text-muted-foreground">Pathway → programs → funding → documents → professors → interviews → offers.</p>
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
            {tab === "explorer" && <ExplorerTab unis={unis} onAdd={addApp} />}
            {tab === "research" && <ResearchTab />}
            {tab === "funding" && <FundingTab />}
            {tab === "toolkit" && <ToolkitTab />}
            {tab === "professors" && <ProfessorsTab userId={user.id} profs={profs} setProfs={setProfs} />}
            {tab === "interview" && <InterviewTab />}
            {tab === "tracker" && <TrackerTab userId={user.id} apps={apps} setApps={setApps} profs={profs} />}
            {tab === "requirements" && <RequirementsTab unis={unis} apps={apps} />}
            {tab === "fit" && <FitTab unis={unis} apps={apps} />}
            {tab === "specializations" && <SpecializationTab />}
            {tab === "quality" && <QualityTab apps={apps} />}
            {tab === "decision" && <DecisionTab apps={apps} />}
            {tab === "roadmap" && <RoadmapTab />}
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- Readiness ---------- */
function ReadinessBar() {
  const run = useServerFn(mastersReadiness);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);

  return (
    <div className="mt-6 glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI Application Readiness &amp; Timeline</h2>
          <p className="text-xs text-muted-foreground">Scores academics, tests, research, documents, recommenders, funding and applications — plus career paths.</p>
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
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI timeline manager</p>
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
            {(res.careers ?? []).length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI career path advisor</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {res.careers.map((c: any, i: number) => (
                    <div key={i} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
                      <p className="font-semibold">{c.path}</p><p className="text-muted-foreground">{c.why}</p>
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
    const { error } = await supabase.from("profiles").update({ masters_pathway: id } as never).eq("id", userId);
    if (error) toast.error(error.message); else toast.success("Pathway saved — guidance personalized");
  }
  const active = PATHWAYS.find((p) => p.id === pathway);
  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Choose your Master's pathway</h2>
        <p className="text-sm text-muted-foreground">Atlas personalizes requirements, funding and AI advice around this.</p>
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
        <h2 className="text-lg font-semibold">Admission requirements checklist</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {REQUIREMENTS.map((r) => (
            <div key={r} className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {r}
            </div>
          ))}
        </div>
        <h2 className="mt-6 text-lg font-semibold">Intakes</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTAKES.map((i) => <span key={i} className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs">{i} intake</span>)}
        </div>
        {active && <p className="mt-5 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-xs">Personalized for <b>{active.label}</b> — {active.note}.</p>}
      </section>
    </div>
  );
}

/* ---------- Explorer ---------- */
function ExplorerTab({ unis, onAdd }: { unis: Uni[]; onAdd: (u: Uni, program?: string) => void }) {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [maxTuition, setMaxTuition] = useState("");
  const [testFree, setTestFree] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [spec, setSpec] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [ai, setAi] = useState<any>(null);
  const runMatch = useServerFn(mastersProgramMatcher);

  const countries = useMemo(() => Array.from(new Set(unis.map((u) => u.country).filter(Boolean))).sort() as string[], [unis]);
  const filtered = unis.filter((u) => {
    const hay = `${u.name} ${u.country} ${u.city} ${(u.programs ?? []).join(" ")} ${(u.research_areas ?? []).join(" ")}`.toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (country && u.country !== country) return false;
    if (maxTuition && (u.tuition_usd ?? 0) > Number(maxTuition)) return false;
    if (testFree && (u.gre_required || u.gmat_required)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI Master's Program Matcher</h2>
            <p className="text-xs text-muted-foreground">Reach / target / safety programs with fit, funding likelihood and intake.</p>
          </div>
          <div className="flex gap-2">
            <input value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="Specialization (optional)"
              className="rounded-xl border border-input bg-background/40 px-3 py-2 text-xs outline-none focus:border-primary" />
            <button onClick={async () => { setAiBusy(true); try { setAi(await runMatch({ data: { limit: 10, specialization: spec } })); } catch (e: any) { toast.error(e.message); } setAiBusy(false); }}
              disabled={aiBusy}
              className="inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
              {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Match programs
            </button>
          </div>
        </div>
        {ai?.strategy && <p className="mt-4 rounded-xl border border-border bg-background/40 px-4 py-3 text-sm">{ai.strategy}</p>}
        {ai?.note && <p className="mt-4 text-sm text-muted-foreground">{ai.note}</p>}
        {(ai?.picks ?? []).length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ai.picks.map((p: any, i: number) => (
              <div key={i} className="rounded-xl border border-border bg-background/40 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.program}</p>
                  </div>
                  <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[11px] capitalize">{p.band} · {p.fit}%</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{p.reason}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">Funding likelihood: <b className="capitalize">{p.funding}</b>{p.intake ? ` · ${p.intake}` : ""}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <Predictor unis={unis} />

      <section className="glass rounded-2xl p-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search university, department, research area…"
            className="sm:col-span-2 rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary">
            <option value="">All countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={maxTuition} onChange={(e) => setMaxTuition(e.target.value)} type="number" placeholder="Max tuition USD"
            className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={testFree} onChange={(e) => setTestFree(e.target.checked)} /> No GRE / GMAT required
        </label>
        <p className="mt-3 text-xs text-muted-foreground">{filtered.length} programs match</p>

        <ul className="mt-4 space-y-2">
          {filtered.slice(0, 80).map((u) => (
            <li key={u.id} className="rounded-xl border border-border bg-background/40">
              <button onClick={() => setOpen(open === u.id ? null : u.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <div>
                  <p className="text-sm font-semibold">{u.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[u.city, u.country].filter(Boolean).join(", ")}
                    {u.world_rank ? ` · #${u.world_rank}` : ""}
                    {u.tuition_usd ? ` · $${u.tuition_usd.toLocaleString()}/yr` : ""}
                  </p>
                </div>
                <span className="text-xs text-primary">{open === u.id ? "Hide" : "Details"}</span>
              </button>
              {open === u.id && (
                <div className="border-t border-border px-4 py-4 text-xs">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Info label="Tuition" value={u.tuition_usd ? `$${u.tuition_usd.toLocaleString()}/yr` : "—"} />
                    <Info label="Living cost" value={u.living_cost_usd ? `$${u.living_cost_usd.toLocaleString()}/yr` : "—"} />
                    <Info label="Employability rank" value={u.employability_rank ? `#${u.employability_rank}` : "—"} />
                    <Info label="Min GPA" value={u.avg_gpa ? String(u.avg_gpa) : "—"} />
                    <Info label="IELTS / TOEFL" value={`${u.ielts_min ?? "—"} / ${u.toefl_min ?? "—"}`} />
                    <Info label="GRE / GMAT" value={`${u.gre_required ? "GRE required" : "GRE optional"} · ${u.gmat_required ? "GMAT required" : "GMAT optional"}`} />
                    <Info label="Deadline" value={u.application_deadline ?? "—"} />
                    <Info label="Acceptance rate" value={u.acceptance_rate ? `${u.acceptance_rate}%` : "—"} />
                  </div>
                  {(u.programs ?? []).length > 0 && <p className="mt-3"><b>Departments / programs:</b> {(u.programs ?? []).join(", ")}</p>}
                  {(u.research_areas ?? []).length > 0 && <p className="mt-1"><b>Research areas:</b> {(u.research_areas ?? []).join(", ")}</p>}
                  {(u.required_documents ?? []).length > 0 && <p className="mt-1"><b>Documents:</b> {(u.required_documents ?? []).join(", ")}</p>}
                  {u.scholarships_info && <p className="mt-1"><b>Scholarships:</b> {u.scholarships_info}</p>}
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button onClick={() => onAdd(u)} className="inline-flex items-center gap-1.5 rounded-full bg-nebula px-4 py-1.5 text-xs font-semibold text-primary-foreground glow">
                      <Plus className="h-3.5 w-3.5" /> Add to tracker
                    </button>
                    <Link to="/universities/$id" params={{ id: u.id }} className="text-primary hover:underline">Full profile →</Link>
                    {u.website && <a href={u.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">Official website →</a>}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function Predictor({ unis }: { unis: Uni[] }) {
  const run = useServerFn(mastersAdmissionPredictor);
  const [uni, setUni] = useState("");
  const [program, setProgram] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI Admission Predictor</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <select value={uni} onChange={(e) => setUni(e.target.value)} className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary">
          <option value="">Select university</option>
          {unis.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
        </select>
        <input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="Program (e.g. MSc Data Science)"
          className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
        <button onClick={async () => { setBusy(true); try { setRes(await run({ data: { university: uni, program } })); } catch (e: any) { toast.error(e.message); } setBusy(false); }}
          disabled={busy || !uni} className="inline-flex items-center justify-center gap-2 rounded-xl bg-nebula px-4 py-2.5 text-sm font-semibold text-primary-foreground glow disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Predict
        </button>
      </div>
      {res && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[160px_1fr]">
          <div className="rounded-2xl border border-border bg-background/40 p-4 text-center">
            <p className="text-4xl font-bold text-gradient">{res.chance}%</p>
            <p className="text-xs capitalize text-muted-foreground">{res.band} chance</p>
            <p className="mt-2 text-[11px] text-muted-foreground">Funding: {res.fundingChance}%</p>
          </div>
          <div className="text-sm">
            <p>{res.summary}</p>
            {(res.strengths ?? []).length > 0 && <><p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Strengths</p><ul className="list-disc pl-5">{res.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></>}
            {(res.gaps ?? []).length > 0 && <><p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Gaps</p><ul className="list-disc pl-5">{res.gaps.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></>}
            {(res.actions ?? []).length > 0 && <><p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Actions</p><ul className="list-disc pl-5">{res.actions.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></>}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Research prep ---------- */
function ResearchTab() {
  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Research &amp; academic preparation</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {RESEARCH_PREP.map((x) => (
            <div key={x} className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {x}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <Link to="/publications" className="text-primary hover:underline">Publication portfolio (M12) →</Link>
          <Link to="/research" className="text-primary hover:underline">Research opportunities (M11) →</Link>
          <Link to="/eca" className="text-primary hover:underline">Activity &amp; project showcase (M16) →</Link>
        </div>
      </section>
      <section className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Academic skill assessment</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            "Literature review & citation management",
            "Research methods & study design",
            "Statistics / data analysis",
            "Programming or lab techniques",
            "Academic writing & publishing",
            "Presenting at seminars & conferences",
          ].map((s) => <div key={s} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">{s}</div>)}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Use the readiness analyzer above to score these against your target programs.</p>
      </section>
    </div>
  );
}

/* ---------- Funding ---------- */
function FundingTab() {
  const run = useServerFn(mastersFundingOptimizer);
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<any>(null);
  const [tuition, setTuition] = useState("35000");
  const [living, setLiving] = useState("16000");
  const [aid, setAid] = useState("12000");
  const [years, setYears] = useState("2");
  const net = Math.max(Number(tuition || 0) + Number(living || 0) - Number(aid || 0), 0);

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Funding sources</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {FUNDING_TYPES.map((x) => <div key={x} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">{x}</div>)}
        </div>
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Cost &amp; funding gap calculator</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="text-xs text-muted-foreground">Tuition / yr (USD)
            <input value={tuition} onChange={(e) => setTuition(e.target.value)} type="number" className="mt-1 w-full rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary" /></label>
          <label className="text-xs text-muted-foreground">Living / yr (USD)
            <input value={living} onChange={(e) => setLiving(e.target.value)} type="number" className="mt-1 w-full rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary" /></label>
          <label className="text-xs text-muted-foreground">Funding / yr (USD)
            <input value={aid} onChange={(e) => setAid(e.target.value)} type="number" className="mt-1 w-full rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary" /></label>
          <label className="text-xs text-muted-foreground">Duration (years)
            <input value={years} onChange={(e) => setYears(e.target.value)} type="number" className="mt-1 w-full rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary" /></label>
        </div>
        <p className="mt-4 text-sm">Funding gap: <b className="text-gradient text-xl">${net.toLocaleString()}</b> per year · <b>${(net * Number(years || 1)).toLocaleString()}</b> total.</p>
      </section>

      <section className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI Funding Optimizer</h2>
            <p className="text-xs text-muted-foreground">Scholarship matching, eligibility check, assistantship odds and a funding plan.</p>
          </div>
          <button onClick={async () => { setBusy(true); try { setAi(await run({ data: {} } as any)); } catch (e: any) { toast.error(e.message); } setBusy(false); }}
            disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Optimize funding
          </button>
        </div>
        {ai?.strategy && <p className="mt-4 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm">{ai.strategy}</p>}
        {(ai?.scholarships ?? []).length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {ai.scholarships.map((s: any, i: number) => (
              <div key={i} className="rounded-xl border border-border bg-background/40 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{s.name}</p>
                  <span className="text-xs text-muted-foreground">{s.matchPct}%</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Eligible: <b className="capitalize">{s.eligible}</b> — {s.why}</p>
              </div>
            ))}
          </div>
        )}
        {(ai?.assistantships ?? []).length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {ai.assistantships.map((a: any, i: number) => (
              <div key={i} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
                <p className="font-semibold">{a.type} · <span className="capitalize">{a.likelihood}</span></p>
                <p className="text-muted-foreground">{a.how}</p>
              </div>
            ))}
          </div>
        )}
        {(ai?.fellowships ?? []).length > 0 && (
          <div className="mt-4"><p className="text-xs font-semibold uppercase text-muted-foreground">Fellowships to target</p>
            <ul className="mt-1 list-disc pl-5 text-sm">{ai.fellowships.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul></div>
        )}
        {(ai?.plan ?? []).length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {ai.plan.map((p: any, i: number) => (
              <div key={i} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
                <p className="font-semibold">{p.month}</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">{(p.actions ?? []).map((a: string, j: number) => <li key={j}>{a}</li>)}</ul>
              </div>
            ))}
          </div>
        )}
        <Link to="/scholarships" className="mt-4 inline-block text-xs text-primary hover:underline">Browse the full scholarship database →</Link>
      </section>
    </div>
  );
}

/* ---------- Toolkit ---------- */
function ToolkitTab() {
  const review = useServerFn(mastersDocReview);
  const [kind, setKind] = useState(DOC_KINDS[0]);
  const [program, setProgram] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Master's application toolkit</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {TOOLKIT.map((x) => <div key={x} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">{x}</div>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <Link to="/sop" className="text-primary hover:underline">SOP builder (M13) →</Link>
          <Link to="/cv" className="text-primary hover:underline">Academic CV / resume (M14) →</Link>
          <Link to="/recommendations" className="text-primary hover:underline">Recommendation manager (M15) →</Link>
        </div>
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI Writing Assistant &amp; Document Scoring</h2>
        <p className="text-xs text-muted-foreground">SOP review, CV review, grammar check and rubric scoring.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary">
            {DOC_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="Target program (optional)"
            className="sm:col-span-2 rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder="Paste your document here…"
          className="mt-3 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary" />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{words} words</span>
          <button onClick={async () => { setBusy(true); try { setRes(await review({ data: { text, kind, program } })); } catch (e: any) { toast.error(e.message); } setBusy(false); }}
            disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Review document
          </button>
        </div>
        {res && (
          <div className="mt-5 space-y-3 text-sm">
            <p className="text-2xl font-bold text-gradient">{res.score}/100</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(res.rubric ?? []).map((r: any, i: number) => (
                <div key={i} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
                  <div className="flex justify-between"><span className="font-medium">{r.name}</span><span>{r.score}%</span></div>
                  <p className="text-muted-foreground">{r.note}</p>
                </div>
              ))}
            </div>
            {(res.strengths ?? []).length > 0 && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Strengths</p><ul className="list-disc pl-5">{res.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>}
            {(res.fixes ?? []).length > 0 && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Fixes</p><ul className="list-disc pl-5">{res.fixes.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>}
            {(res.grammar ?? []).length > 0 && (
              <div><p className="text-xs font-semibold uppercase text-muted-foreground">Grammar</p>
                <ul className="mt-1 space-y-1 text-xs">{res.grammar.map((g: any, i: number) => <li key={i} className="rounded-lg border border-border bg-background/40 px-3 py-2"><b>{g.issue}</b> → {g.suggestion}</li>)}</ul></div>
            )}
            {res.rewrittenOpening && <p className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3"><b>Stronger opening:</b> {res.rewrittenOpening}</p>}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- Professors ---------- */
function ProfessorsTab({ userId, profs, setProfs }: { userId: string; profs: Prof[]; setProfs: React.Dispatch<React.SetStateAction<Prof[]>> }) {
  const match = useServerFn(mastersProfessorAI);
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [email, setEmail] = useState<any>(null);
  const [emailBusy, setEmailBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", university: "", department: "", research_area: "", email: "", lab: "" });

  async function add(seed?: Partial<Prof>) {
    const row = {
      user_id: userId,
      name: seed?.name ?? form.name,
      university: seed?.university ?? (form.university || null),
      department: seed?.department ?? (form.department || null),
      research_area: seed?.research_area ?? (form.research_area || null),
      email: seed?.email ?? (form.email || null),
      lab: seed?.lab ?? (form.lab || null),
      compatibility: seed?.compatibility ?? null,
      status: "identified",
    };
    if (!row.name) return toast.error("Professor name is required");
    const { data, error } = await supabase.from("professor_contacts").insert(row as never).select().maybeSingle();
    if (error) return toast.error(error.message);
    setProfs((p) => [data as Prof, ...p]);
    if (!seed) setForm({ name: "", university: "", department: "", research_area: "", email: "", lab: "" });
    toast.success("Professor saved");
  }
  async function update(id: string, patch: Partial<Prof>) {
    setProfs((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("professor_contacts").update(patch as never).eq("id", id);
    if (error) toast.error(error.message);
  }
  async function remove(id: string) {
    setProfs((p) => p.filter((x) => x.id !== id));
    await supabase.from("professor_contacts").delete().eq("id", id);
  }

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI Professor Matcher</h2>
            <p className="text-xs text-muted-foreground">Faculty, research groups and labs aligned with your interests, with a compatibility score.</p>
          </div>
          <div className="flex gap-2">
            <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Research area"
              className="rounded-xl border border-input bg-background/40 px-3 py-2 text-xs outline-none focus:border-primary" />
            <button onClick={async () => { setBusy(true); try { const r: any = await match({ data: { mode: "match", area } }); setMatches(r.matches ?? []); } catch (e: any) { toast.error(e.message); } setBusy(false); }}
              disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Find professors
            </button>
          </div>
        </div>
        {matches.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {matches.map((m, i) => (
              <div key={i} className="rounded-xl border border-border bg-background/40 p-4 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{m.name}</p>
                    <p className="text-muted-foreground">{[m.department, m.university].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className="rounded-full border border-primary/40 px-2 py-0.5">{m.compatibility}%</span>
                </div>
                <p className="mt-2">{m.researchArea}{m.lab ? ` · ${m.lab}` : ""}</p>
                <p className="mt-1 text-muted-foreground">{m.why}</p>
                {m.openingLine && <p className="mt-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">{m.openingLine}</p>}
                <button onClick={() => add({ name: m.name, university: m.university, department: m.department, research_area: m.researchArea, lab: m.lab, compatibility: m.compatibility })}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 hover:border-primary">
                  <Plus className="h-3 w-3" /> Save to list
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Professor &amp; department explorer</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Professor name *" className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} placeholder="University" className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Department" className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={form.research_area} onChange={(e) => setForm({ ...form, research_area: e.target.value })} placeholder="Research area / current project" className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={form.lab} onChange={(e) => setForm({ ...form, lab: e.target.value })} placeholder="Lab / research group" className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
        </div>
        <button onClick={() => add()} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-nebula px-4 py-2.5 text-sm font-semibold text-primary-foreground glow">
          <Plus className="h-4 w-4" /> Add professor
        </button>

        <ul className="mt-5 space-y-2">
          {profs.length === 0 && <li className="text-sm text-muted-foreground">No professors tracked yet.</li>}
          {profs.map((p) => (
            <li key={p.id} className="rounded-xl border border-border bg-background/40 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{p.name}{p.compatibility ? <span className="ml-2 text-xs text-muted-foreground">{p.compatibility}% fit</span> : null}</p>
                  <p className="text-xs text-muted-foreground">{[p.department, p.university, p.research_area, p.lab].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={p.status} onChange={(e) => update(p.id, { status: e.target.value })} className="rounded-lg border border-input bg-background/40 px-2 py-1 text-xs outline-none focus:border-primary">
                    {PROF_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={async () => {
                    setEmailBusy(p.id);
                    try {
                      const r = await match({ data: { mode: "email", professor: p.name, university: p.university ?? "", department: p.department ?? "" } });
                      setEmail({ ...r, to: p.email });
                    } catch (e: any) { toast.error(e.message); }
                    setEmailBusy(null);
                  }} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs hover:border-primary">
                    {emailBusy === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />} AI email
                  </button>
                  <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {email && (
        <section className="glass rounded-2xl p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Mail className="h-4 w-4 text-accent" /> AI Email Generator</h2>
          <p className="mt-2 text-sm"><b>Subject:</b> {email.subject}</p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-background/40 px-4 py-3 text-sm">{email.body}</pre>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <button onClick={() => { navigator.clipboard.writeText(`${email.subject}\n\n${email.body}`); toast.success("Copied"); }}
              className="rounded-full border border-border px-3 py-1 hover:border-primary">Copy</button>
            {email.to && <a className="text-primary hover:underline" href={`mailto:${email.to}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`}>Open in mail app →</a>}
          </div>
          {(email.tips ?? []).length > 0 && <ul className="mt-3 list-disc pl-5 text-xs text-muted-foreground">{email.tips.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>}
        </section>
      )}
    </div>
  );
}

/* ---------- Interview ---------- */
function InterviewTab() {
  const run = useServerFn(mastersInterview);
  const [type, setType] = useState(INTERVIEW_TYPES[0]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [evalBusy, setEvalBusy] = useState(false);
  const [res, setRes] = useState<any>(null);

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Mic className="h-4 w-4 text-accent" /> AI Mock Interview</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary">
            {INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={async () => { setBusy(true); try { const r: any = await run({ data: { mode: "questions", interviewType: type } }); setQuestions(r.questions ?? []); setCurrent(r.questions?.[0] ?? ""); } catch (e: any) { toast.error(e.message); } setBusy(false); }}
            disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-sm font-semibold text-primary-foreground glow disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Generate questions
          </button>
        </div>
        {questions.length > 0 && (
          <ul className="mt-4 space-y-2">
            {questions.map((q, i) => (
              <li key={i}>
                <button onClick={() => { setCurrent(q); setRes(null); setAnswer(""); }}
                  className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition ${current === q ? "border-primary bg-primary/5" : "border-border bg-background/40 hover:border-primary/50"}`}>
                  {q}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {current && (
        <section className="glass rounded-2xl p-6">
          <p className="text-sm font-semibold">{current}</p>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={8} placeholder="Type (or dictate) your answer…"
            className="mt-3 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary" />
          <button onClick={async () => { setEvalBusy(true); try { setRes(await run({ data: { mode: "evaluate", interviewType: type, question: current, answer } })); } catch (e: any) { toast.error(e.message); } setEvalBusy(false); }}
            disabled={evalBusy || answer.trim().length < 10}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
            {evalBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Evaluate answer
          </button>
          {res && (
            <div className="mt-4 space-y-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-4">
                {[["Overall", res.score], ["Confidence", res.confidence], ["Communication", res.communication], ["Depth", res.depth]].map(([l, v]) => (
                  <div key={l as string} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-center">
                    <p className="text-xl font-bold text-gradient">{v as number}</p>
                    <p className="text-[11px] text-muted-foreground">{l as string}</p>
                  </div>
                ))}
              </div>
              <p>{res.feedback}</p>
              {(res.improve ?? []).length > 0 && <ul className="list-disc pl-5">{res.improve.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>}
              {res.modelAnswer && <p className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3"><b>Model answer:</b> {res.modelAnswer}</p>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ---------- Tracker ---------- */
function TrackerTab({ userId, apps, setApps, profs }: { userId: string; apps: App[]; setApps: React.Dispatch<React.SetStateAction<App[]>>; profs: Prof[] }) {
  const [form, setForm] = useState({ university_name: "", program: "", deadline: "" });

  async function add() {
    if (!form.university_name.trim()) return toast.error("University name is required");
    const row = { user_id: userId, university_name: form.university_name, program: form.program || null, level: "PG", status: "planning", deadline: form.deadline || null };
    const { data, error } = await supabase.from("applications").insert(row).select().maybeSingle();
    if (error) return toast.error(error.message);
    setApps((p) => [...p, data as App]);
    setForm({ university_name: "", program: "", deadline: "" });
  }
  async function update(id: string, patch: Partial<App>) {
    setApps((p) => p.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    const { error } = await supabase.from("applications").update(patch as never).eq("id", id);
    if (error) toast.error(error.message);
  }
  async function remove(id: string) {
    setApps((p) => p.filter((a) => a.id !== id));
    await supabase.from("applications").delete().eq("id", id);
  }

  const pg = apps.filter((a) => (a.level ?? "PG") !== "UG");
  const counts = {
    offers: pg.filter((a) => a.status === "offer").length,
    waitlist: pg.filter((a) => a.status === "waitlist").length,
    rejected: pg.filter((a) => a.status === "rejected").length,
    contacted: profs.filter((p) => p.status !== "identified").length,
  };

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <Info label="Applications" value={String(pg.length)} />
          <Info label="Offers" value={String(counts.offers)} />
          <Info label="Waitlists / rejections" value={`${counts.waitlist} / ${counts.rejected}`} />
          <Info label="Professors contacted" value={String(counts.contacted)} />
        </div>
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Add an application</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <input value={form.university_name} onChange={(e) => setForm({ ...form, university_name: e.target.value })} placeholder="University *" className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} placeholder="Program" className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} type="date" className="rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <button onClick={add} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-nebula px-4 py-2.5 text-sm font-semibold text-primary-foreground glow"><Plus className="h-4 w-4" /> Add</button>
        </div>
      </section>

      <section className="space-y-3">
        {pg.length === 0 && <p className="text-sm text-muted-foreground">No Master's applications tracked yet.</p>}
        {pg.map((a) => (
          <div key={a.id} className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{a.university_name}</p>
                <p className="text-xs text-muted-foreground">{a.program ?? "Program TBD"}</p>
              </div>
              <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <label className="text-xs text-muted-foreground">Status
                <select value={a.status} onChange={(e) => update(a.id, { status: e.target.value })} className="mt-1 w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select></label>
              <label className="text-xs text-muted-foreground">Deadline
                <input type="date" value={a.deadline ?? ""} onChange={(e) => update(a.id, { deadline: e.target.value || null })} className="mt-1 w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary" /></label>
              <label className="text-xs text-muted-foreground">Interview date
                <input type="date" value={a.interview_date ?? ""} onChange={(e) => update(a.id, { interview_date: e.target.value || null })} className="mt-1 w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary" /></label>
              <label className="text-xs text-muted-foreground">Decision
                <input value={a.decision ?? ""} onChange={(e) => update(a.id, { decision: e.target.value || null })} placeholder="Offer / waitlist / reject" className="mt-1 w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary" /></label>
              <label className="text-xs text-muted-foreground">Funding status
                <input value={a.aid_status ?? ""} onChange={(e) => update(a.id, { aid_status: e.target.value || null })} placeholder="Scholarship / RA / TA" className="mt-1 w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary" /></label>
              <label className="text-xs text-muted-foreground">Visa progress
                <input value={a.visa_status ?? ""} onChange={(e) => update(a.id, { visa_status: e.target.value || null })} placeholder="Not started / applied / granted" className="mt-1 w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary" /></label>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documents submitted</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DOC_LIST.map((d) => {
                  const missing = (a.missing_documents ?? []).includes(d);
                  return (
                    <button key={d} onClick={() => {
                      const next = missing ? (a.missing_documents ?? []).filter((x) => x !== d) : [...(a.missing_documents ?? []), d];
                      update(a.id, { missing_documents: next });
                    }} className={`rounded-full border px-3 py-1 text-xs transition ${missing ? "border-destructive/60 text-destructive" : "border-border text-muted-foreground hover:border-primary"}`}>
                      {missing ? "Missing: " : "✓ "}{d}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/* ---------- Shared shell for the new AI tabs ---------- */
function AIPanel({
  title, note, icon: Icon, children, onRun, canRun = true, res, runLabel = "Run analysis",
}: {
  title: string; note: string; icon: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode; onRun: () => Promise<unknown>; canRun?: boolean; res: unknown; runLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Icon className="h-4 w-4 text-primary" /> {title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      {children && <div className="mt-4 grid gap-3 sm:grid-cols-3">{children}</div>}
      <button
        onClick={async () => { setBusy(true); try { await onRun(); } catch (e: any) { toast.error(e.message); } setBusy(false); }}
        disabled={busy || !canRun}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} {runLabel}
      </button>
      {res ? <div className="mt-5 rounded-2xl border border-border bg-background/40 p-5"><AIResult data={res} /></div> : null}
    </section>
  );
}

const fieldCls = "rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary";

function UniSelect({ unis, apps, value, onChange }: { unis: Uni[]; apps: App[]; value: string; onChange: (v: string) => void }) {
  const names = useMemo(() => {
    const set = new Set<string>([...apps.map((a) => a.university_name), ...unis.map((u) => u.name)]);
    return [...set];
  }, [unis, apps]);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls}>
      <option value="">Select university</option>
      {names.map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  );
}

/* ---------- 04 + 05 + 13 — Requirements, prerequisites, package ---------- */
function RequirementsTab({ unis, apps }: { unis: Uni[]; apps: App[] }) {
  const run = useServerFn(mastersRequirements);
  const [uni, setUni] = useState("");
  const [program, setProgram] = useState("");
  const [coursework, setCoursework] = useState("");
  const [res, setRes] = useState<unknown>(null);
  return (
    <div className="grid gap-6">
      <AIPanel
        title="Admission requirements & prerequisite analyzer"
        note="Every requirement is classified REQUIRED / RECOMMENDED / OPTIONAL / NOT REQUIRED, then your coursework is compared against it. Always confirm against the official program page."
        icon={ListChecks}
        canRun={!!uni}
        res={res}
        runLabel="Analyze requirements"
        onRun={async () => setRes(await run({ data: { university: uni, program, coursework } }))}
      >
        <UniSelect unis={unis} apps={apps} value={uni} onChange={setUni} />
        <input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="Program (e.g. MSc Artificial Intelligence)" className={fieldCls} />
        <input value={coursework} onChange={(e) => setCoursework(e.target.value)} placeholder="Your bachelor's courses, comma separated" className={fieldCls} />
      </AIPanel>
      <section className="glass rounded-2xl p-6">
        <h3 className="text-sm font-semibold">Standard application package</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Application form", ...DOC_LIST, "Degree certificate"].map((d) => (
            <span key={d} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{d}</span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Store and track these in the <Link to="/documents" className="text-primary hover:underline">Document Center</Link>.
        </p>
      </section>
    </div>
  );
}

/* ---------- 06 — Fit analyzer ---------- */
function FitTab({ unis, apps }: { unis: Uni[]; apps: App[] }) {
  const run = useServerFn(mastersFitAnalyzer);
  const [uni, setUni] = useState("");
  const [program, setProgram] = useState("");
  const [spec, setSpec] = useState("");
  const [res, setRes] = useState<unknown>(null);
  return (
    <AIPanel
      title="Master's fit analyzer"
      note="Academic, program, research, career and financial fit. Fit is an estimate — it is not an admission probability or guarantee."
      icon={Gauge}
      canRun={!!uni}
      res={res}
      runLabel="Analyze fit"
      onRun={async () => setRes(await run({ data: { university: uni, program, specialization: spec } }))}
    >
      <UniSelect unis={unis} apps={apps} value={uni} onChange={setUni} />
      <input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="Program" className={fieldCls} />
      <input value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="Specialization (optional)" className={fieldCls} />
    </AIPanel>
  );
}

/* ---------- 07 — Specialization matcher ---------- */
function SpecializationTab() {
  const run = useServerFn(mastersSpecializationMatcher);
  const [res, setRes] = useState<unknown>(null);
  return (
    <AIPanel
      title="Specialization matcher"
      note="Suggests specializations from your background, skills, research interests, projects, work experience and career goals."
      icon={Layers}
      res={res}
      runLabel="Suggest specializations"
      onRun={async () => setRes(await run({ data: {} } as any))}
    />
  );
}

/* ---------- 15 — Quality check ---------- */
function QualityTab({ apps }: { apps: App[] }) {
  const run = useServerFn(mastersQualityCheck);
  const [id, setId] = useState("");
  const [res, setRes] = useState<unknown>(null);
  const app = apps.find((a) => a.id === id);
  return (
    <AIPanel
      title="Pre-submission quality check"
      note="Returns READY, NEEDS ATTENTION or HIGH RISK across requirements, tests, documents, funding and deadlines."
      icon={CheckCircle2}
      canRun={!!app}
      res={res}
      runLabel="Run quality check"
      onRun={async () => setRes(await run({ data: { applicationId: app!.id, university: app!.university_name, program: app!.program ?? "" } }))}
    >
      <select value={id} onChange={(e) => setId(e.target.value)} className={`${fieldCls} sm:col-span-3`}>
        <option value="">Select an application from your tracker</option>
        {apps.map((a) => <option key={a.id} value={a.id}>{a.university_name}{a.program ? ` — ${a.program}` : ""}</option>)}
      </select>
    </AIPanel>
  );
}

/* ---------- 17 — Decision center ---------- */
function DecisionTab({ apps }: { apps: App[] }) {
  const run = useServerFn(mastersDecisionAdvisor);
  const [offers, setOffers] = useState("");
  const [res, setRes] = useState<unknown>(null);
  useEffect(() => {
    const withOffer = apps.filter((a) => a.decision || a.status === "offer");
    if (withOffer.length && !offers) {
      setOffers(withOffer.map((a) => `${a.university_name} — ${a.program ?? "program"} | decision: ${a.decision ?? "offer"} | funding: ${a.aid_status ?? "unknown"} | tuition: ? | deposit: ? | response deadline: ?`).join("\n"));
    }
  }, [apps]);
  return (
    <AIPanel
      title="Decision center"
      note="Compare offers on tuition, funding, conditions, deposit and response deadline. The final decision is always yours."
      icon={Scale}
      canRun={!!offers.trim()}
      res={res}
      runLabel="Compare offers"
      onRun={async () => setRes(await run({ data: { offers } }))}
    >
      <textarea value={offers} onChange={(e) => setOffers(e.target.value)} rows={6}
        placeholder="One offer per line: university — program | tuition | funding | scholarship | conditions | deposit | response deadline"
        className={`${fieldCls} sm:col-span-3`} />
    </AIPanel>
  );
}

/* ---------- 18 — AI roadmap ---------- */
function RoadmapTab() {
  const run = useServerFn(mastersRoadmap);
  const [intake, setIntake] = useState("");
  const [res, setRes] = useState<unknown>(null);
  return (
    <AIPanel
      title="Master's AI roadmap"
      note="12-month, 6-month, 90-day and 30-day plans plus weekly tasks and daily priorities. Re-run it whenever your profile, tests, documents or deadlines change."
      icon={CalendarClock}
      res={res}
      runLabel="Build roadmap"
      onRun={async () => setRes(await run({ data: { intake } }))}
    >
      <input value={intake} onChange={(e) => setIntake(e.target.value)} placeholder="Target intake (e.g. Fall 2027)" className={fieldCls} />
    </AIPanel>
  );
}
