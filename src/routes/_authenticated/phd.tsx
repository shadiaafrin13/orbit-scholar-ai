import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Award, BookOpen, Briefcase, CheckCircle2, ClipboardList, ExternalLink, FileText,
  FlaskConical, GraduationCap, Loader2, Mail, Mic, Plus, Route as RouteIcon, Search, Sparkles,
  Trash2, Users, Wand2,
} from "lucide-react";
import {
  phdAdmissionPredictor, phdCareerAdvisor, phdEmailGenerator, phdFundingMatcher, phdInterview,
  phdOpportunityMatcher, phdProposalReview, phdPublicationStrategy, phdReadiness, phdReplyAnalysis,
  phdResearchIdeas, phdSupervisorMatcher,
} from "@/lib/phd-ai.functions";

export const Route = createFileRoute("/_authenticated/phd")({
  head: () => ({
    meta: [
      { title: "PhD Admission & Research Career Hub — Atlas" },
      { name: "description", content: "Funded PhD positions, AI supervisor matching, research proposal review, fellowships, interviews, applications and academic career planning." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PhdHub,
});

const PATHWAYS = [
  { id: "direct", label: "Direct PhD", note: "Bachelor's straight to doctorate (US-style)" },
  { id: "masters_phd", label: "Master's → PhD", note: "Most common route in Europe & Asia" },
  { id: "integrated", label: "Integrated PhD", note: "MSc + PhD in one programme" },
  { id: "professional", label: "Professional Doctorate", note: "EdD, DBA, EngD — practice based" },
  { id: "industry", label: "Industry PhD", note: "Company-sponsored, applied research" },
  { id: "joint", label: "Joint PhD", note: "Two institutions, one degree" },
  { id: "cotutelle", label: "Cotutelle (Dual PhD)", note: "Dual award, split supervision" },
  { id: "online", label: "Online / Distance PhD", note: "Part-time, no visa needed" },
  { id: "funded", label: "Funded PhD", note: "Stipend + tuition + insurance" },
  { id: "self", label: "Self-Funded PhD", note: "You cover fees; more flexibility" },
  { id: "exchange", label: "Exchange Research", note: "Short research stay abroad" },
  { id: "visiting", label: "Visiting PhD", note: "6–12 months in a host lab" },
  { id: "postdoc", label: "Postdoctoral Preparation", note: "Life after the PhD starts now" },
];

const RESEARCH_PREP = [
  "Research interest development", "Research topic discovery", "Research gap detection",
  "Literature review", "Systematic review", "Research methodology", "Research proposal builder",
  "Statement of research interest", "Research timeline planner", "Experimental design",
  "Statistical planning", "Ethics guidance",
];
const FUNDING_CATEGORIES = [
  "University funding", "Government fellowships", "International fellowships", "Research grants",
  "Graduate assistantships", "Research assistantships (RA)", "Teaching assistantships (TA)",
  "Industrial funding", "NGO funding", "Foundation grants", "Travel grants", "Conference grants",
];
const DOC_KINDS = [
  "Research proposal", "Research statement", "Statement of Purpose", "Personal statement",
  "Motivation letter", "Academic CV", "Diversity statement", "Cover letter",
];
const INTERVIEW_TYPES = ["Supervisor interview", "Research presentation", "Proposal defense", "Technical questions", "Behavioral questions"];
const STATUSES = ["planning", "in progress", "submitted", "interview", "offer", "waitlist", "rejected", "enrolled"];
const PROF_STATUSES = ["identified", "emailed", "replied", "call scheduled", "positive", "no response", "declined"];
const DOC_LIST = ["Transcript", "Research proposal", "Statement of purpose", "Academic CV", "Recommendation letters", "GRE scores", "English test", "Publications list", "Financial documents", "Passport copy"];
const NETWORK = [
  { title: "Find research collaborators", note: "Match by keyword overlap on your publications and topics." },
  { title: "Find co-authors", note: "Target authors from your reading list who publish yearly." },
  { title: "Find research mentors", note: "Senior postdocs are the highest-response-rate mentors." },
  { title: "Lab communities", note: "Follow lab newsletters and group seminars before applying." },
  { title: "PhD student communities", note: "Slack/Discord groups per field, plus subreddit AMAs." },
  { title: "Research discussion forums", note: "OpenReview, ResearchGate Q&A, field mailing lists." },
  { title: "International collaborations", note: "Use exchange and cotutelle schemes to co-supervise." },
  { title: "Conference networking", note: "Email 3 authors before the conference, not after." },
];

type Tab = "pathway" | "opportunities" | "supervisors" | "research" | "funding" | "toolkit" | "interview" | "tracker" | "profile" | "network" | "career";
type App = {
  id: string; university_name: string; program: string | null; level: string | null;
  round: string | null; status: string; deadline: string | null; missing_documents: string[] | null;
  interview_date: string | null; decision: string | null; aid_status: string | null; visa_status: string | null;
};
type Prof = {
  id: string; name: string; university: string | null; department: string | null; research_area: string | null;
  email: string | null; lab: string | null; status: string; compatibility: number | null; notes: string | null;
};
type Pos = {
  id: string; title: string; university: string; country: string | null; department: string | null;
  research_group: string | null; supervisor: string | null; research_area: string | null; keywords: string[] | null;
  degree_type: string | null; funding_type: string | null; fully_funded: boolean; industry_sponsored: boolean;
  stipend_monthly: string | null; tuition_covered: boolean | null; health_insurance: boolean | null;
  research_budget: string | null; duration_years: number | null; required_gpa: number | null;
  language_requirement: string | null; research_experience: string | null; required_documents: string[] | null;
  interview_process: string | null; description: string | null; deadline: string | null; link: string | null;
};
type Pub = { id: string; title: string; venue: string | null; year: number | null; citations: number | null; type: string | null; doi: string | null };

const card = "glass rounded-2xl p-6";
const input = "w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary";
const chip = "rounded-full border border-border bg-background/40 px-3 py-1 text-xs";
const btn = "inline-flex items-center gap-2 rounded-full bg-nebula px-5 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-60";

function PhdHub() {
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState<Tab>("pathway");
  const [pathway, setPathway] = useState("");
  const [apps, setApps] = useState<App[]>([]);
  const [profs, setProfs] = useState<Prof[]>([]);
  const [positions, setPositions] = useState<Pos[]>([]);
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: prof }, { data: a }, { data: pc }, { data: p }, { data: pb }] = await Promise.all([
        supabase.from("profiles").select("phd_pathway").eq("id", user.id).maybeSingle(),
        supabase.from("applications").select("*").eq("user_id", user.id).order("deadline", { ascending: true, nullsFirst: false }),
        supabase.from("professor_contacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("phd_positions").select("*").order("deadline", { ascending: true, nullsFirst: false }).limit(300),
        supabase.from("publications").select("id,title,venue,year,citations,type,doi").eq("user_id", user.id).order("year", { ascending: false }),
      ]);
      setPathway((prof as { phd_pathway?: string } | null)?.phd_pathway ?? "");
      setApps((a as App[]) ?? []);
      setProfs((pc as Prof[]) ?? []);
      setPositions((p as Pos[]) ?? []);
      setPubs((pb as Pub[]) ?? []);
      setLoading(false);
    })();
  }, [user.id]);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "pathway", label: "Pathway", icon: RouteIcon },
    { id: "opportunities", label: "PhD explorer", icon: Search },
    { id: "supervisors", label: "Supervisors", icon: Users },
    { id: "research", label: "Research prep", icon: FlaskConical },
    { id: "funding", label: "Funding", icon: Award },
    { id: "toolkit", label: "Toolkit", icon: FileText },
    { id: "interview", label: "Interview prep", icon: Mic },
    { id: "tracker", label: "Tracker", icon: ClipboardList },
    { id: "profile", label: "Academic profile", icon: BookOpen },
    { id: "network", label: "Collaboration", icon: Users },
    { id: "career", label: "Career", icon: Briefcase },
  ];

  async function addApp(seed: { university: string; program?: string | null }) {
    const row = { user_id: user.id, university_name: seed.university, program: seed.program ?? null, level: "PhD", status: "planning" };
    const { data, error } = await supabase.from("applications").insert(row as never).select().maybeSingle();
    if (error) return toast.error(error.message);
    setApps((prev) => [...prev, data as App]);
    toast.success(`${seed.university} added to your tracker`);
  }

  async function addProf(seed: Partial<Prof>) {
    const row = {
      user_id: user.id, name: seed.name ?? "", university: seed.university ?? null,
      department: seed.department ?? null, research_area: seed.research_area ?? null,
      email: seed.email ?? null, lab: seed.lab ?? null, compatibility: seed.compatibility ?? null,
      status: "identified",
    };
    if (!row.name) return toast.error("Supervisor name is required");
    const { data, error } = await supabase.from("professor_contacts").insert(row as never).select().maybeSingle();
    if (error) return toast.error(error.message);
    setProfs((prev) => [data as Prof, ...prev]);
    toast.success(`${row.name} saved to your supervisor list`);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M09 · PhD Admission &amp; Research Career Hub</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-nebula glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">PhD Admission &amp; Research Career Hub</span></h1>
            <p className="text-sm text-muted-foreground">Pathway → positions → supervisors → proposal → funding → interviews → offers → academic career.</p>
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
            {tab === "opportunities" && <OpportunitiesTab positions={positions} onApply={addApp} onSaveProf={addProf} />}
            {tab === "supervisors" && <SupervisorsTab userId={user.id} profs={profs} setProfs={setProfs} onSaveProf={addProf} />}
            {tab === "research" && <ResearchTab />}
            {tab === "funding" && <FundingTab />}
            {tab === "toolkit" && <ToolkitTab />}
            {tab === "interview" && <InterviewTab />}
            {tab === "tracker" && <TrackerTab userId={user.id} apps={apps} setApps={setApps} profs={profs} onAdd={addApp} />}
            {tab === "profile" && <AcademicProfileTab pubs={pubs} />}
            {tab === "network" && <NetworkTab />}
            {tab === "career" && <CareerTab />}
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- Readiness ---------- */
function ReadinessBar() {
  const run = useServerFn(phdReadiness);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);

  return (
    <div className="mt-6 glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI PhD Readiness, Roadmap &amp; Weekly Plan</h2>
          <p className="text-xs text-muted-foreground">Scores academics, research, publications, proposal, supervisors, funding, documents and applications.</p>
        </div>
        <button onClick={async () => { setBusy(true); try { setRes(await run({ data: {} } as any)); } catch (e: any) { toast.error(e.message); } setBusy(false); }}
          disabled={busy} className={btn}>
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
            {(res.weekly ?? []).length > 0 && (
              <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">This week</p>
                <ul className="mt-1 list-disc pl-4 text-xs">{res.weekly.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}
            {(res.timeline ?? []).length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {res.timeline.map((t: any, i: number) => (
                  <div key={i} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
                    <p className="font-semibold">{t.month}</p>
                    <ul className="mt-1 list-disc pl-4 text-muted-foreground">{(t.actions ?? []).map((a: string, j: number) => <li key={j}>{a}</li>)}</ul>
                  </div>
                ))}
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
    const { error } = await supabase.from("profiles").update({ phd_pathway: id } as never).eq("id", userId);
    if (error) toast.error(error.message); else toast.success("Pathway saved — roadmap personalized");
  }
  const active = PATHWAYS.find((p) => p.id === pathway);
  return (
    <div className="space-y-6">
      <section className={card}>
        <h2 className="text-lg font-semibold">Choose your doctoral pathway</h2>
        <p className="text-sm text-muted-foreground">Atlas customizes requirements, funding and AI guidance around this choice.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PATHWAYS.map((p) => (
            <button key={p.id} onClick={() => pick(p.id)}
              className={`rounded-2xl border p-4 text-left transition ${pathway === p.id ? "border-primary bg-primary/5 glow" : "border-border bg-background/40 hover:border-primary/50"}`}>
              <p className="text-sm font-semibold">{p.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>
            </button>
          ))}
        </div>
        {active && <p className="mt-5 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-xs">Personalized for <b>{active.label}</b> — {active.note}.</p>}
      </section>
    </div>
  );
}

/* ---------- Opportunities ---------- */
function OpportunitiesTab({ positions, onApply, onSaveProf }: { positions: Pos[]; onApply: (s: { university: string; program?: string | null }) => void; onSaveProf: (p: Partial<Prof>) => void }) {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [funding, setFunding] = useState("");
  const [degree, setDegree] = useState("");
  const [fundedOnly, setFundedOnly] = useState(false);
  const [industry, setIndustry] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<any>(null);
  const match = useServerFn(phdOpportunityMatcher);

  const countries = useMemo(() => Array.from(new Set(positions.map((p) => p.country).filter(Boolean))).sort() as string[], [positions]);
  const fundings = useMemo(() => Array.from(new Set(positions.map((p) => p.funding_type).filter(Boolean))).sort() as string[], [positions]);
  const degrees = useMemo(() => Array.from(new Set(positions.map((p) => p.degree_type).filter(Boolean))).sort() as string[], [positions]);

  const filtered = positions.filter((p) => {
    const hay = `${p.title} ${p.university} ${p.country} ${p.department} ${p.supervisor} ${p.research_area} ${(p.keywords ?? []).join(" ")}`.toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (country && p.country !== country) return false;
    if (funding && p.funding_type !== funding) return false;
    if (degree && p.degree_type !== degree) return false;
    if (fundedOnly && !p.fully_funded) return false;
    if (industry && !p.industry_sponsored) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI PhD Opportunity Matcher</h2>
            <p className="text-xs text-muted-foreground">Ranks live positions by fit, funding and admission band.</p>
          </div>
          <div className="flex gap-2">
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Research topic (optional)"
              className="rounded-xl border border-input bg-background/40 px-3 py-2 text-xs outline-none focus:border-primary" />
            <button disabled={busy} className={btn}
              onClick={async () => { setBusy(true); try { setAi(await match({ data: { topic } } as any)); } catch (e: any) { toast.error(e.message); } setBusy(false); }}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Match me
            </button>
          </div>
        </div>
        {ai?.strategy && <p className="mt-4 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-xs">{ai.strategy}</p>}
        {(ai?.picks ?? []).length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {ai.picks.map((p: any, i: number) => (
              <div key={i} className="rounded-xl border border-border bg-background/40 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.university}</p>
                  </div>
                  <span className="rounded-full bg-nebula px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">{p.fit}%</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  <span className={chip}>{p.band}</span><span className={chip}>funding: {p.funding}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{p.reason}</p>
                <button onClick={() => onApply({ university: p.university, program: p.title })}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3 w-3" /> Add to tracker</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={card}>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search topic, supervisor, lab, keyword…" className={`${input} pl-9`} />
            </div>
          </div>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={input}>
            <option value="">All countries</option>{countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={degree} onChange={(e) => setDegree(e.target.value)} className={input}>
            <option value="">All degree types</option>{degrees.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={funding} onChange={(e) => setFunding(e.target.value)} className={input}>
            <option value="">All funding types</option>{fundings.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={fundedOnly} onChange={(e) => setFundedOnly(e.target.checked)} /> Fully funded only</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={industry} onChange={(e) => setIndustry(e.target.checked)} /> Industry sponsored</label>
          <p className="self-center text-xs text-muted-foreground">{filtered.length} positions</p>
        </div>

        <div className="mt-5 space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-background/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.university}{p.country ? ` · ${p.country}` : ""}{p.department ? ` · ${p.department}` : ""}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.fully_funded && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">Fully funded</span>}
                    {p.industry_sponsored && <span className={chip}>Industry sponsored</span>}
                    {p.degree_type && <span className={chip}>{p.degree_type}</span>}
                    {p.stipend_monthly && <span className={chip}>{p.stipend_monthly}/mo</span>}
                    {p.deadline && <span className={chip}>Deadline {p.deadline}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setOpen(open === p.id ? null : p.id)} className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/50">{open === p.id ? "Hide" : "Details"}</button>
                  <button onClick={() => onApply({ university: p.university, program: p.title })} className="rounded-full bg-nebula px-3 py-1.5 text-xs font-semibold text-primary-foreground glow">Track</button>
                </div>
              </div>
              {open === p.id && (
                <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2">
                  <div className="space-y-1.5 text-xs">
                    <p className="text-sm">{p.description}</p>
                    <p><b>Research group:</b> {p.research_group ?? "—"}</p>
                    <p><b>Supervisor:</b> {p.supervisor ?? "—"}</p>
                    <p><b>Research area:</b> {p.research_area ?? "—"}</p>
                    <p><b>Required GPA:</b> {p.required_gpa ?? "—"}</p>
                    <p><b>Language:</b> {p.language_requirement ?? "—"}</p>
                    <p><b>Research experience:</b> {p.research_experience ?? "—"}</p>
                    <p><b>Interview process:</b> {p.interview_process ?? "—"}</p>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <p><b>Funding:</b> {p.funding_type ?? "—"}</p>
                    <p><b>Monthly stipend:</b> {p.stipend_monthly ?? "—"}</p>
                    <p><b>Tuition covered:</b> {p.tuition_covered ? "Yes" : "No"}</p>
                    <p><b>Health insurance:</b> {p.health_insurance ? "Yes" : "No"}</p>
                    <p><b>Research budget:</b> {p.research_budget ?? "—"}</p>
                    <p><b>Duration:</b> {p.duration_years ? `${p.duration_years} years` : "—"}</p>
                    <p><b>Documents:</b> {(p.required_documents ?? []).join(", ") || "—"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/50"><ExternalLink className="h-3 w-3" /> Official application</a>}
                      {p.supervisor && <button onClick={() => onSaveProf({ name: p.supervisor!, university: p.university, department: p.department, research_area: p.research_area, lab: p.research_group })}
                        className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/50">Save supervisor</button>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No positions match these filters.</p>}
        </div>
      </section>
    </div>
  );
}

/* ---------- Supervisors ---------- */
function SupervisorsTab({ userId, profs, setProfs, onSaveProf }: { userId: string; profs: Prof[]; setProfs: React.Dispatch<React.SetStateAction<Prof[]>>; onSaveProf: (p: Partial<Prof>) => void }) {
  const [area, setArea] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [email, setEmail] = useState<any>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [replyRes, setReplyRes] = useState<any>(null);
  const [replyBusy, setReplyBusy] = useState(false);

  const find = useServerFn(phdSupervisorMatcher);
  const gen = useServerFn(phdEmailGenerator);
  const analyze = useServerFn(phdReplyAnalysis);

  async function update(id: string, patch: Partial<Prof>) {
    setProfs((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error } = await supabase.from("professor_contacts").update(patch as never).eq("id", id).eq("user_id", userId);
    if (error) toast.error(error.message);
  }
  async function remove(id: string) {
    setProfs((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("professor_contacts").delete().eq("id", id).eq("user_id", userId);
  }

  return (
    <div className="space-y-6">
      <section className={card}>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI Supervisor &amp; Professor Finder</h2>
        <p className="text-xs text-muted-foreground">Compatibility scoring, open-position signals and a contact strategy for each supervisor.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Research area / keywords" className={`${input} max-w-xs`} />
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country (optional)" className={`${input} max-w-[180px]`} />
          <button disabled={busy} className={btn}
            onClick={async () => { setBusy(true); try { setRes(await find({ data: { area, country } } as any)); } catch (e: any) { toast.error(e.message); } setBusy(false); }}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Find supervisors
          </button>
        </div>
        {(res?.supervisors ?? []).length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {res.supervisors.map((s: any, i: number) => (
              <div key={i} className="rounded-xl border border-border bg-background/40 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.university}{s.department ? ` · ${s.department}` : ""}</p>
                  </div>
                  <span className="rounded-full bg-nebula px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">{s.compatibility}%</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  {s.lab && <span className={chip}>{s.lab}</span>}
                  {s.hIndexEstimate ? <span className={chip}>h-index ≈ {s.hIndexEstimate}</span> : null}
                  <span className={chip}>positions: {s.openPositions}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{s.why}</p>
                {s.contactStrategy && <p className="mt-1 text-xs"><b>Strategy:</b> {s.contactStrategy}</p>}
                <button onClick={() => onSaveProf({ name: s.name, university: s.university, department: s.department, research_area: s.research_area, lab: s.lab, compatibility: s.compatibility })}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3 w-3" /> Save to my list</button>
              </div>
            ))}
          </div>
        )}
        {res?.note && <p className="mt-3 text-[11px] text-muted-foreground">{res.note}</p>}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">My supervisor pipeline ({profs.length})</h2>
        <div className="mt-4 space-y-3">
          {profs.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-background/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{p.name} {p.compatibility ? <span className="text-xs text-muted-foreground">· {p.compatibility}% fit</span> : null}</p>
                  <p className="text-xs text-muted-foreground">{[p.university, p.department, p.research_area].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={p.status} onChange={(e) => update(p.id, { status: e.target.value })} className="rounded-xl border border-input bg-background/40 px-2 py-1 text-xs">
                    {PROF_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {p.email && <a href={`mailto:${p.email}`} className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary/50"><Mail className="h-3 w-3" /></a>}
                  <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
          {profs.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No supervisors saved yet — use the AI finder or the PhD explorer.</p>}
        </div>
      </section>

      <section className={card}>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Mail className="h-4 w-4 text-accent" /> AI Email Generator</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input id="pn" placeholder="Professor name" className={input} onChange={(e) => setEmail((s: any) => ({ ...(s ?? {}), _name: e.target.value }))} />
          <input placeholder="University" className={input} onChange={(e) => setEmail((s: any) => ({ ...(s ?? {}), _uni: e.target.value }))} />
          <input placeholder="Research area" className={input} onChange={(e) => setEmail((s: any) => ({ ...(s ?? {}), _area: e.target.value }))} />
        </div>
        <button disabled={emailBusy} className={`${btn} mt-3`}
          onClick={async () => {
            setEmailBusy(true);
            try {
              const r: any = await gen({ data: { professor: email?._name ?? "", university: email?._uni ?? "", area: email?._area ?? "" } } as any);
              setEmail((s: any) => ({ ...(s ?? {}), ...r }));
            } catch (e: any) { toast.error(e.message); }
            setEmailBusy(false);
          }}>
          {emailBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Draft outreach email
        </button>
        {email?.body && (
          <div className="mt-4 rounded-xl border border-border bg-background/40 p-4 text-sm">
            <p className="font-semibold">Subject: {email.subject}</p>
            <p className="mt-2 whitespace-pre-wrap text-xs">{email.body}</p>
            {(email.tips ?? []).length > 0 && <ul className="mt-3 list-disc pl-4 text-[11px] text-muted-foreground">{email.tips.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>}
            {email.followUp && <p className="mt-2 text-[11px] text-muted-foreground"><b>Follow-up:</b> {email.followUp}</p>}
            <button onClick={() => { navigator.clipboard.writeText(`${email.subject}\n\n${email.body}`); toast.success("Copied"); }}
              className="mt-3 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/50">Copy email</button>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">AI Reply Analysis</h2>
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={5} placeholder="Paste the professor's reply…" className={`${input} mt-3`} />
        <button disabled={replyBusy} className={`${btn} mt-3`}
          onClick={async () => { setReplyBusy(true); try { setReplyRes(await analyze({ data: { reply } } as any)); } catch (e: any) { toast.error(e.message); } setReplyBusy(false); }}>
          {replyBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Analyze reply
        </button>
        {replyRes?.intent && (
          <div className="mt-4 rounded-xl border border-border bg-background/40 p-4 text-xs">
            <p><b>Sentiment:</b> {replyRes.sentiment}</p>
            <p className="mt-1">{replyRes.intent}</p>
            {(replyRes.signals ?? []).length > 0 && <ul className="mt-2 list-disc pl-4 text-muted-foreground">{replyRes.signals.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>}
            <p className="mt-2"><b>Next step:</b> {replyRes.nextStep}</p>
            {replyRes.suggestedReply && <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-background/60 p-3">{replyRes.suggestedReply}</p>}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- Research prep ---------- */
function ResearchTab() {
  const ideas = useServerFn(phdResearchIdeas);
  const review = useServerFn(phdProposalReview);
  const [field, setField] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [kind, setKind] = useState(DOC_KINDS[0]);
  const [text, setText] = useState("");
  const [rBusy, setRBusy] = useState(false);
  const [rev, setRev] = useState<any>(null);

  return (
    <div className="space-y-6">
      <section className={card}>
        <h2 className="text-lg font-semibold">Research Preparation Center</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {RESEARCH_PREP.map((r) => (
            <div key={r} className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {r}
            </div>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-accent" /> Research Topic &amp; Gap Generator</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={field} onChange={(e) => setField(e.target.value)} placeholder="Your field or interest (e.g. federated learning in healthcare)" className={`${input} max-w-md`} />
          <button disabled={busy} className={btn}
            onClick={async () => { setBusy(true); try { setRes(await ideas({ data: { field } } as any)); } catch (e: any) { toast.error(e.message); } setBusy(false); }}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Generate topics
          </button>
        </div>
        {res?.advice && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-xs">
              <span className="text-2xl font-bold text-gradient">{res.readiness ?? 0}</span>
              <span>Research readiness — {res.advice}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {(res.topics ?? []).map((t: any, i: number) => (
                <div key={i} className="rounded-xl border border-border bg-background/40 p-4 text-xs">
                  <p className="text-sm font-semibold">{t.title}</p>
                  <p className="mt-1 text-muted-foreground">{t.question}</p>
                  <p className="mt-2"><b>Novelty:</b> {t.novelty}</p>
                  <p><b>Gap:</b> {t.gap}</p>
                  <p><b>Feasibility:</b> {t.feasibility}</p>
                  {(t.methods ?? []).length > 0 && <p className="mt-1 text-muted-foreground">Methods: {t.methods.join(", ")}</p>}
                </div>
              ))}
            </div>
            {(res.gaps ?? []).length > 0 && (
              <div className="rounded-xl border border-border bg-background/40 p-4 text-xs">
                <p className="font-semibold">Open research gaps</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">{res.gaps.map((g: string, i: number) => <li key={i}>{g}</li>)}</ul>
              </div>
            )}
            {(res.literature ?? []).length > 0 && (
              <div className="rounded-xl border border-border bg-background/40 p-4 text-xs">
                <p className="font-semibold">Literature review starting points</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">{res.literature.map((g: string, i: number) => <li key={i}>{g}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><FileText className="h-4 w-4 text-accent" /> Proposal &amp; Methodology Reviewer</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${input} max-w-xs`}>
            {DOC_KINDS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button disabled={rBusy} className={btn}
            onClick={async () => { setRBusy(true); try { setRev(await review({ data: { text, kind } } as any)); } catch (e: any) { toast.error(e.message); } setRBusy(false); }}>
            {rBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Review document
          </button>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder="Paste your research proposal, research statement or SOP…" className={`${input} mt-3 font-mono text-xs`} />
        {rev?.verdict && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
              <span className="text-2xl font-bold text-gradient">{rev.score}</span><span>{rev.verdict}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(rev.rubric ?? []).map((r: any, i: number) => (
                <div key={i} className="rounded-xl border border-border bg-background/40 px-3 py-2">
                  <div className="flex justify-between"><span className="font-medium">{r.criterion}</span><span className="text-muted-foreground">{r.score}%</span></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-nebula" style={{ width: `${r.score}%` }} /></div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{r.note}</p>
                </div>
              ))}
            </div>
            {(rev.methodology ?? []).length > 0 && (
              <div className="rounded-xl border border-border bg-background/40 p-4"><p className="font-semibold">Methodology feedback</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">{rev.methodology.map((m: string, i: number) => <li key={i}>{m}</li>)}</ul></div>
            )}
            {(rev.issues ?? []).length > 0 && (
              <div className="rounded-xl border border-border bg-background/40 p-4"><p className="font-semibold">Issues to fix</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">{rev.issues.map((m: string, i: number) => <li key={i}>{m}</li>)}</ul></div>
            )}
            {rev.originalityRisk && <p className="rounded-xl border border-border bg-background/40 p-4"><b>Originality check:</b> {rev.originalityRisk}</p>}
            {rev.rewrite && <div className="rounded-xl border border-border bg-background/40 p-4"><p className="font-semibold">Improved opening</p><p className="mt-1 whitespace-pre-wrap">{rev.rewrite}</p></div>}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- Funding ---------- */
function FundingTab() {
  const run = useServerFn(phdFundingMatcher);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  return (
    <div className="space-y-6">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Award className="h-4 w-4 text-accent" /> AI Funding Matcher &amp; Success Prediction</h2>
            <p className="text-xs text-muted-foreground">Fellowships, RA/TA assistantships, grants — with success odds and a month-by-month plan.</p>
          </div>
          <button disabled={busy} className={btn}
            onClick={async () => { setBusy(true); try { setRes(await run({ data: {} } as any)); } catch (e: any) { toast.error(e.message); } setBusy(false); }}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Build funding strategy
          </button>
        </div>
        {res?.strategy && <p className="mt-4 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-xs">{res.strategy}</p>}
        {(res?.matches ?? []).length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {res.matches.map((m: any, i: number) => (
              <div key={i} className="rounded-xl border border-border bg-background/40 p-4 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{m.name}</p>
                  <span className="rounded-full bg-nebula px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">{m.matchPct}%</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={chip}>{m.category}</span>
                  <span className={chip}>success ≈ {m.successChance}%</span>
                  {m.deadline && <span className={chip}>{m.deadline}</span>}
                </div>
                <p className="mt-2 text-muted-foreground">{m.why}</p>
              </div>
            ))}
          </div>
        )}
        {(res?.assistantships ?? []).length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {res.assistantships.map((a: any, i: number) => (
              <div key={i} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
                <p className="font-semibold">{a.type} · {a.likelihood}</p><p className="text-muted-foreground">{a.how}</p>
              </div>
            ))}
          </div>
        )}
        {(res?.plan ?? []).length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {res.plan.map((p: any, i: number) => (
              <div key={i} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
                <p className="font-semibold">{p.month}</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">{(p.actions ?? []).map((a: string, j: number) => <li key={j}>{a}</li>)}</ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Funding categories</h2>
        <div className="mt-3 flex flex-wrap gap-2">{FUNDING_CATEGORIES.map((f) => <span key={f} className={chip}>{f}</span>)}</div>
        <Link to="/scholarships" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">Browse the full scholarship catalog <ExternalLink className="h-3 w-3" /></Link>
      </section>
    </div>
  );
}

/* ---------- Toolkit ---------- */
function ToolkitTab() {
  const links = [
    { to: "/sop" as const, title: "SOP, research & personal statements", note: "AI drafting, rubric scoring and revisions." },
    { to: "/cv" as const, title: "Academic & research CV builder", note: "Academic, Europass and ATS templates." },
    { to: "/recommendations" as const, title: "Recommendation letter manager", note: "Recommenders, requests, reminders and status." },
    { to: "/publications" as const, title: "Publication portfolio", note: "Papers, DOIs, venues and citation totals." },
    { to: "/research" as const, title: "Research opportunities", note: "Fellowships, internships and labs." },
    { to: "/roadmap" as const, title: "Deadline & task manager", note: "Everything you owe, by date." },
  ];
  return (
    <div className="space-y-6">
      <section className={card}>
        <h2 className="text-lg font-semibold">PhD Application Toolkit</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="rounded-2xl border border-border bg-background/40 p-4 transition hover:border-primary/50">
              <p className="text-sm font-semibold">{l.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{l.note}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className={card}>
        <h2 className="text-lg font-semibold">Documents you will need</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DOC_KINDS.concat(["Recommendation letters", "Publication list", "Academic portfolio", "Academic email templates"]).map((d) => (
            <div key={d} className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {d}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------- Interview ---------- */
function InterviewTab() {
  const run = useServerFn(phdInterview);
  const [kind, setKind] = useState(INTERVIEW_TYPES[0]);
  const [busy, setBusy] = useState(false);
  const [set, setSet] = useState<any>(null);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [evalBusy, setEvalBusy] = useState(false);
  const [ev, setEv] = useState<any>(null);

  return (
    <div className="space-y-6">
      <section className={card}>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Mic className="h-4 w-4 text-accent" /> AI Interview Coach</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${input} max-w-xs`}>
            {INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button disabled={busy} className={btn}
            onClick={async () => { setBusy(true); try { setSet(await run({ data: { kind } } as any)); } catch (e: any) { toast.error(e.message); } setBusy(false); }}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Generate mock interview
          </button>
        </div>
        {(set?.questions ?? []).length > 0 && (
          <div className="mt-4 space-y-2">
            {set.questions.map((x: any, i: number) => (
              <button key={i} onClick={() => setQ(x.q)} className="block w-full rounded-xl border border-border bg-background/40 p-3 text-left text-xs hover:border-primary/50">
                <p className="text-sm font-medium">{x.q}</p>
                <p className="mt-1 text-muted-foreground">{x.type} · {x.hint}</p>
              </button>
            ))}
            {(set.presentationTips ?? []).length > 0 && (
              <div className="rounded-xl border border-border bg-background/40 p-4 text-xs">
                <p className="font-semibold">Research presentation tips</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">{set.presentationTips.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Practice &amp; get scored</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Question you're answering" className={`${input} mt-3`} />
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={6} placeholder="Type your answer…" className={`${input} mt-3`} />
        <button disabled={evalBusy} className={`${btn} mt-3`}
          onClick={async () => { setEvalBusy(true); try { setEv(await run({ data: { kind, question: q, answer } } as any)); } catch (e: any) { toast.error(e.message); } setEvalBusy(false); }}>
          {evalBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Evaluate answer
        </button>
        {ev?.feedback && (
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex flex-wrap gap-2">
              <span className={chip}>Answer {ev.score}%</span>
              {ev.confidence != null && <span className={chip}>Confidence {ev.confidence}%</span>}
              {ev.communication != null && <span className={chip}>Communication {ev.communication}%</span>}
            </div>
            <p>{ev.feedback}</p>
            {(ev.improvements ?? []).length > 0 && <ul className="list-disc pl-4 text-muted-foreground">{ev.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>}
            {ev.modelAnswer && <div className="rounded-xl border border-border bg-background/40 p-4"><p className="font-semibold">Model answer</p><p className="mt-1">{ev.modelAnswer}</p></div>}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- Tracker ---------- */
function TrackerTab({ userId, apps, setApps, profs, onAdd }: { userId: string; apps: App[]; setApps: React.Dispatch<React.SetStateAction<App[]>>; profs: Prof[]; onAdd: (s: { university: string; program?: string | null }) => void }) {
  const [uni, setUni] = useState("");
  const [program, setProgram] = useState("");
  const predict = useServerFn(phdAdmissionPredictor);
  const [pBusy, setPBusy] = useState(false);
  const [pred, setPred] = useState<any>(null);

  async function update(id: string, patch: Partial<App>) {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    const { error } = await supabase.from("applications").update(patch as never).eq("id", id).eq("user_id", userId);
    if (error) toast.error(error.message);
  }
  async function remove(id: string) {
    setApps((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("applications").delete().eq("id", id).eq("user_id", userId);
  }
  function toggleDoc(a: App, doc: string) {
    const cur = a.missing_documents ?? [];
    update(a.id, { missing_documents: cur.includes(doc) ? cur.filter((d) => d !== doc) : [...cur, doc] });
  }

  const phdApps = apps.filter((a) => (a.level ?? "") === "PhD" || apps.length > 0);
  const counts = {
    total: phdApps.length,
    offers: phdApps.filter((a) => a.status === "offer").length,
    interviews: phdApps.filter((a) => a.status === "interview").length,
    contacted: profs.filter((p) => p.status !== "identified").length,
    replies: profs.filter((p) => ["replied", "call scheduled", "positive"].includes(p.status)).length,
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-5">
        {[
          ["Applications", counts.total], ["Interviews", counts.interviews], ["Offers", counts.offers],
          ["Supervisors contacted", counts.contacted], ["Positive replies", counts.replies],
        ].map(([label, v]) => (
          <div key={label as string} className="glass rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-gradient">{v as number}</p>
            <p className="text-[11px] text-muted-foreground">{label as string}</p>
          </div>
        ))}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Add an application</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={uni} onChange={(e) => setUni(e.target.value)} placeholder="University" className={`${input} max-w-xs`} />
          <input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="Programme / position" className={`${input} max-w-xs`} />
          <button onClick={() => { if (!uni.trim()) return toast.error("University required"); onAdd({ university: uni, program }); setUni(""); setProgram(""); }} className={btn}>
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </section>

      <section className={card}>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI Admission Probability Predictor</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={uni} onChange={(e) => setUni(e.target.value)} placeholder="Target university" className={`${input} max-w-xs`} />
          <input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="Programme (optional)" className={`${input} max-w-xs`} />
          <button disabled={pBusy} className={btn}
            onClick={async () => { setPBusy(true); try { setPred(await predict({ data: { university: uni, program } } as any)); } catch (e: any) { toast.error(e.message); } setPBusy(false); }}>
            {pBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Predict
          </button>
        </div>
        {pred?.summary && (
          <div className="mt-4 grid gap-3 text-xs md:grid-cols-[140px_1fr]">
            <div className="rounded-2xl border border-border bg-background/40 p-4 text-center">
              <p className="text-3xl font-bold text-gradient">{pred.chance}%</p>
              <p className="text-[11px] text-muted-foreground">{pred.band} · funding {pred.fundingChance}%</p>
            </div>
            <div>
              <p>{pred.summary}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {[["Strengths", pred.strengths], ["Gaps", pred.gaps], ["Actions", pred.actions]].map(([t, list]: any) => (
                  (list ?? []).length > 0 && (
                    <div key={t} className="rounded-xl border border-border bg-background/40 px-3 py-2">
                      <p className="font-semibold">{t}</p>
                      <ul className="mt-1 list-disc pl-4 text-muted-foreground">{list.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Applications ({phdApps.length})</h2>
        <div className="mt-4 space-y-3">
          {phdApps.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-background/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{a.university_name}</p>
                  <p className="text-xs text-muted-foreground">{a.program ?? "—"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={a.status} onChange={(e) => update(a.id, { status: e.target.value })} className="rounded-xl border border-input bg-background/40 px-2 py-1 text-xs">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input type="date" value={a.deadline ?? ""} onChange={(e) => update(a.id, { deadline: e.target.value || null })} className="rounded-xl border border-input bg-background/40 px-2 py-1 text-xs" />
                  <input type="date" value={a.interview_date ?? ""} onChange={(e) => update(a.id, { interview_date: e.target.value || null })} className="rounded-xl border border-input bg-background/40 px-2 py-1 text-xs" />
                  <input value={a.visa_status ?? ""} onChange={(e) => update(a.id, { visa_status: e.target.value || null })} placeholder="Visa status" className="w-28 rounded-xl border border-input bg-background/40 px-2 py-1 text-xs" />
                  <input value={a.aid_status ?? ""} onChange={(e) => update(a.id, { aid_status: e.target.value || null })} placeholder="Funding" className="w-28 rounded-xl border border-input bg-background/40 px-2 py-1 text-xs" />
                  <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {DOC_LIST.map((d) => {
                  const missing = (a.missing_documents ?? []).includes(d);
                  return (
                    <button key={d} onClick={() => toggleDoc(a, d)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${missing ? "border-destructive/60 text-destructive" : "border-border text-muted-foreground"}`}>
                      {missing ? "missing: " : "✓ "}{d}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {phdApps.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No applications yet — add one from the PhD explorer.</p>}
        </div>
      </section>
    </div>
  );
}

/* ---------- Academic profile ---------- */
function AcademicProfileTab({ pubs }: { pubs: Pub[] }) {
  const run = useServerFn(phdPublicationStrategy);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const citations = pubs.reduce((s, p) => s + (p.citations ?? 0), 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        {[["Publications", pubs.length], ["Total citations", citations], ["Journals & venues", new Set(pubs.map((p) => p.venue).filter(Boolean)).size]].map(([l, v]) => (
          <div key={l as string} className="glass rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-gradient">{v as number}</p><p className="text-[11px] text-muted-foreground">{l as string}</p>
          </div>
        ))}
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><BookOpen className="h-4 w-4 text-accent" /> AI Publication Strategy &amp; Portfolio Analyzer</h2>
            <p className="text-xs text-muted-foreground">Target venues, paper pipeline, collaborations and academic visibility.</p>
          </div>
          <button disabled={busy} className={btn}
            onClick={async () => { setBusy(true); try { setRes(await run({ data: {} } as any)); } catch (e: any) { toast.error(e.message); } setBusy(false); }}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Analyze portfolio
          </button>
        </div>
        {res?.summary && (
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
              <span className="text-2xl font-bold text-gradient">{res.portfolioScore}</span><span>{res.summary}</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {(res.venues ?? []).map((v: any, i: number) => (
                <div key={i} className="rounded-xl border border-border bg-background/40 px-3 py-2">
                  <p className="font-semibold">{v.name} <span className="text-muted-foreground">· {v.tier}</span></p>
                  <p className="text-muted-foreground">{v.why}</p><p className="text-muted-foreground">{v.timing}</p>
                </div>
              ))}
            </div>
            {[["Paper pipeline", res.pipeline], ["Academic visibility", res.visibility]].map(([t, list]: any) => (
              (list ?? []).length > 0 && (
                <div key={t} className="rounded-xl border border-border bg-background/40 p-4">
                  <p className="font-semibold">{t}</p>
                  <ul className="mt-1 list-disc pl-4 text-muted-foreground">{list.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              )
            ))}
            {(res.collaborations ?? []).length > 0 && (
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <p className="font-semibold">Collaboration recommendations</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">{res.collaborations.map((c: any, i: number) => <li key={i}>{c.type}: {c.suggestion}</li>)}</ul>
              </div>
            )}
          </div>
        )}
        <Link to="/publications" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">Manage publications, DOIs and citations <ExternalLink className="h-3 w-3" /></Link>
      </section>
    </div>
  );
}

/* ---------- Network ---------- */
function NetworkTab() {
  return (
    <section className={card}>
      <h2 className="text-lg font-semibold">Collaboration &amp; Academic Networking</h2>
      <p className="text-xs text-muted-foreground">Where to find people, and what actually gets replies.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {NETWORK.map((n) => (
          <div key={n.title} className="rounded-2xl border border-border bg-background/40 p-4">
            <p className="text-sm font-semibold">{n.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{n.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Career ---------- */
function CareerTab() {
  const run = useServerFn(phdCareerAdvisor);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Briefcase className="h-4 w-4 text-accent" /> AI Academic Career Advisor &amp; Forecast</h2>
          <p className="text-xs text-muted-foreground">Postdocs, faculty, research scientist, industry and government research paths.</p>
        </div>
        <button disabled={busy} className={btn}
          onClick={async () => { setBusy(true); try { setRes(await run({ data: {} } as any)); } catch (e: any) { toast.error(e.message); } setBusy(false); }}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Forecast my career
        </button>
      </div>
      {res?.forecast && (
        <div className="mt-4 space-y-3 text-xs">
          <p className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">{res.forecast}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {(res.paths ?? []).map((p: any, i: number) => (
              <div key={i} className="rounded-xl border border-border bg-background/40 px-3 py-2">
                <div className="flex justify-between"><span className="font-semibold">{p.path}</span><span className="text-muted-foreground">{p.fit}%</span></div>
                <p className="text-muted-foreground">{p.why}</p>
                {(p.prepare ?? []).length > 0 && <ul className="mt-1 list-disc pl-4 text-muted-foreground">{p.prepare.map((s: string, j: number) => <li key={j}>{s}</li>)}</ul>}
              </div>
            ))}
          </div>
          {[["Grant writing", res.grantWriting], ["Research leadership", res.leadership], ["Academic branding", res.branding]].map(([t, list]: any) => (
            (list ?? []).length > 0 && (
              <div key={t} className="rounded-xl border border-border bg-background/40 p-4">
                <p className="font-semibold">{t}</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">{list.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
              </div>
            )
          ))}
        </div>
      )}
    </section>
  );
}
