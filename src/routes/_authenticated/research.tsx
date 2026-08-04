import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, FlaskConical, Loader2, Search, ExternalLink, Users, BookOpen, CalendarDays,
  Banknote, Sparkles, FileCheck2, Library, Network, Lightbulb, Mail, Trash2, Plus,
} from "lucide-react";
import {
  researchOpportunityMatcher, researchProfessorMatcher, researchJournalRecommender,
  researchConferenceRecommender, researchGrantMatcher, researchAssistant, researchReviewer,
  researchWriter, researchPortfolioAnalyzer, researchCollaborationFinder,
} from "@/lib/research-ai.functions";

export const Route = createFileRoute("/_authenticated/research")({
  head: () => ({
    meta: [
      { title: "Global Research, Innovation & Publication Hub — Atlas" },
      { name: "description", content: "Research opportunities, professors, journals, conferences, funding, publications and AI research tools in one hub." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResearchPage,
});

type Opp = {
  id: string; title: string; host: string | null; country: string | null; type: string | null;
  category: string | null; level: string | null; mode: string | null; duration: string | null;
  eligibility: string | null; funded: boolean | null; field: string | null; deadline: string | null;
  stipend: string | null; link: string | null; description: string | null;
};
type Prof = {
  id: string; name: string; university: string | null; department: string | null; country: string | null;
  title: string | null; research_areas: string[] | null; keywords: string[] | null; bio: string | null;
  citations: number | null; h_index: number | null; orcid: string | null; scholar_url: string | null;
  website: string | null; lab_name: string | null; current_projects: string | null; grants: string | null;
  open_positions: boolean | null; accepting_students: boolean | null; collaboration_open: boolean | null; email: string | null;
};
type Journal = {
  id: string; name: string; publisher: string | null; scope: string | null; field: string | null;
  impact_factor: number | null; citescore: number | null; quartile: string | null; indexing: string[] | null;
  apc_usd: number | null; acceptance_rate: number | null; review_weeks: number | null;
  publication_weeks: number | null; open_access: string | null; link: string | null;
};
type Conf = {
  id: string; name: string; organizer: string | null; field: string | null; topics: string[] | null;
  location: string | null; country: string | null; format: string | null; start_date: string | null;
  paper_deadline: string | null; registration_fee: string | null; acceptance_rate: number | null;
  proceedings: string | null; awards: string | null; travel_grants: boolean | null;
  student_discount: boolean | null; link: string | null;
};
type Grant = {
  id: string; name: string; funder: string | null; type: string | null; country: string | null;
  amount: string | null; duration: string | null; eligibility: string | null; fields: string[] | null;
  deadline: string | null; link: string | null; description: string | null;
};
type Manuscript = {
  id: string; title: string; target_venue: string | null; venue_type: string | null; stage: string;
  submitted_at: string | null; decision_at: string | null; revision_round: number | null;
  doi: string | null; reviewer_notes: string | null;
};

const TABS = [
  { id: "opportunities", label: "Opportunities", icon: FlaskConical },
  { id: "professors", label: "Professors & Labs", icon: Users },
  { id: "journals", label: "Journal Hub", icon: BookOpen },
  { id: "conferences", label: "Conference Hub", icon: CalendarDays },
  { id: "funding", label: "Funding", icon: Banknote },
  { id: "assistant", label: "AI Assistant", icon: Sparkles },
  { id: "review", label: "Review & Writing", icon: FileCheck2 },
  { id: "publications", label: "Publication Tracker", icon: Library },
  { id: "collaboration", label: "Collaboration", icon: Network },
  { id: "innovation", label: "Innovation", icon: Lightbulb },
] as const;
type TabId = (typeof TABS)[number]["id"];

const STAGES = ["drafting", "internal review", "submitted", "under review", "revision requested", "accepted", "published", "rejected"];

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Rolling";
}

function ResearchPage() {
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState<TabId>("opportunities");
  const [opps, setOpps] = useState<Opp[]>([]);
  const [profs, setProfs] = useState<Prof[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [confs, setConfs] = useState<Conf[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [o, p, j, c, g, m] = await Promise.all([
        supabase.from("research_opportunities").select("*").order("deadline", { ascending: true, nullsFirst: false }),
        supabase.from("professors").select("*").order("h_index", { ascending: false, nullsFirst: false }),
        supabase.from("journals").select("*").order("impact_factor", { ascending: false, nullsFirst: false }),
        supabase.from("conferences").select("*").order("paper_deadline", { ascending: true, nullsFirst: false }),
        supabase.from("research_grants").select("*").order("deadline", { ascending: true, nullsFirst: false }),
        supabase.from("manuscripts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setOpps((o.data as Opp[]) ?? []);
      setProfs((p.data as Prof[]) ?? []);
      setJournals((j.data as Journal[]) ?? []);
      setConfs((c.data as Conf[]) ?? []);
      setGrants((g.data as Grant[]) ?? []);
      setManuscripts((m.data as Manuscript[]) ?? []);
      setLoading(false);
    })();
  }, [user.id]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M11</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-nebula glow">
            <FlaskConical className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">Global Research & Innovation Hub</span></h1>
            <p className="text-sm text-muted-foreground">
              Opportunities, professors, journals, conferences, funding, publications and AI research tools.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Opportunities" value={String(opps.length)} />
          <Stat label="Professors" value={String(profs.length)} />
          <Stat label="Journals" value={String(journals.length)} />
          <Stat label="Conferences" value={String(confs.length)} />
          <Stat label="Grants" value={String(grants.length)} />
          <Stat label="Manuscripts" value={String(manuscripts.length)} />
        </div>

        <PortfolioBar />

        <nav className="mt-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition ${
                tab === t.id ? "bg-nebula text-primary-foreground glow" : "glass text-muted-foreground hover:text-foreground"
              }`}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading research data…</div>
        ) : (
          <div className="mt-6">
            {tab === "opportunities" && <Opportunities items={opps} />}
            {tab === "professors" && <Professors items={profs} />}
            {tab === "journals" && <Journals items={journals} />}
            {tab === "conferences" && <Conferences items={confs} />}
            {tab === "funding" && <Funding items={grants} />}
            {tab === "assistant" && <Assistant />}
            {tab === "review" && <ReviewWriting />}
            {tab === "publications" && <Tracker items={manuscripts} setItems={setManuscripts} userId={user.id} />}
            {tab === "collaboration" && <Collaboration />}
            {tab === "innovation" && <Innovation />}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt><dd className="mt-0.5">{value ?? "—"}</dd></div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{children}</span>;
}

const inputCls = "rounded-xl border border-input bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary";
const btnCls = "inline-flex items-center justify-center gap-1.5 rounded-xl bg-nebula px-4 py-2.5 text-sm font-semibold text-primary-foreground glow disabled:opacity-60";

/* ---------------- Portfolio readiness bar ---------------- */
function PortfolioBar() {
  const run = useServerFn(researchPortfolioAnalyzer);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);

  async function go() {
    setBusy(true);
    try { setRes(await run({})); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="mt-4 glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">AI Research Portfolio & Impact Analyzer</p>
          <p className="text-xs text-muted-foreground">Scores your publications, manuscripts and activities, then plans the next 90 days.</p>
        </div>
        <button onClick={go} disabled={busy} className={btnCls}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Analyze portfolio
        </button>
      </div>
      {res && (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-nebula" style={{ width: `${Math.min(100, res.score ?? 0)}%` }} />
            </div>
            <span className="text-xs font-semibold">{res.score ?? 0}/100 · {res.stage}</span>
          </div>
          <p className="text-muted-foreground">{res.summary}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <List title="Strengths" items={res.strengths} />
            <List title="Gaps" items={res.gaps} />
            <List title="Citation optimizer" items={res.citation_optimizer} />
            <List title="Visibility actions" items={res.impact?.visibility_actions} />
          </div>
          {Array.isArray(res.next_90_days) && res.next_90_days.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {res.next_90_days.map((s: any, i: number) => (
                <li key={i} className="rounded-xl border border-border/60 p-3 text-xs">
                  <span className="font-semibold">{s.week}</span> — {s.action}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="mt-1.5 space-y-1 text-xs">{items.map((s, i) => <li key={i}>• {s}</li>)}</ul>
    </div>
  );
}

function AiPicks({ picks, keyName = "name" }: { picks: any[]; keyName?: string }) {
  if (!picks?.length) return null;
  return (
    <ul className="mt-4 space-y-2">
      {picks.map((p, i) => (
        <li key={i} className="glass rounded-2xl p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{p[keyName] ?? p.title ?? p.name}</p>
            <span className="shrink-0 rounded-full bg-nebula px-2 py-0.5 text-[10px] text-primary-foreground">
              {p.fit ?? p.score ?? p.odds ?? 0}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{p.university ?? p.host ?? p.eligibility ?? p.tier ?? p.band ?? ""}</p>
          <p className="mt-1.5 text-xs">{p.reason ?? p.why ?? p.lab_fit ?? ""}</p>
          {(p.action ?? p.prep ?? p.approach ?? p.timeline) && (
            <p className="mt-1 text-xs text-primary">Next: {p.action ?? p.prep ?? p.approach ?? p.timeline}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Opportunities ---------------- */
function Opportunities({ items }: { items: Opp[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [level, setLevel] = useState("");
  const [mode, setMode] = useState("");
  const [fundedOnly, setFundedOnly] = useState(false);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<{ picks: any[]; strategy?: string } | null>(null);
  const match = useServerFn(researchOpportunityMatcher);

  const cats = useMemo(() => Array.from(new Set(items.map((i) => i.category ?? i.type).filter(Boolean) as string[])).sort(), [items]);
  const levels = useMemo(() => Array.from(new Set(items.map((i) => i.level).filter(Boolean) as string[])).sort(), [items]);
  const modes = useMemo(() => Array.from(new Set(items.map((i) => i.mode).filter(Boolean) as string[])).sort(), [items]);

  const filtered = items.filter((x) => {
    if (cat && (x.category ?? x.type) !== cat) return false;
    if (level && x.level !== level) return false;
    if (mode && x.mode !== mode) return false;
    if (fundedOnly && !x.funded) return false;
    if (q) {
      const s = q.toLowerCase();
      const hay = [x.title, x.host, x.field, x.country, x.category].join(" ").toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });

  async function runAi() {
    setBusy(true);
    try { setAi(await match({ data: { topic } })); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4 grid gap-3 md:grid-cols-5">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, host, field, country"
            className={`w-full pl-10 ${inputCls}`} />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls}>
          <option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>
          <option value="">All levels</option>{levels.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputCls}>
          <option value="">All modes</option>{modes.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground md:col-span-5">
          <input type="checkbox" checked={fundedOnly} onChange={(e) => setFundedOnly(e.target.checked)} /> Funded / paid only
        </label>
      </div>

      <div className="glass rounded-2xl p-4">
        <p className="text-sm font-semibold">AI Research Opportunity Matcher</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Your research interest (e.g. computational neuroscience)"
            className={`flex-1 min-w-[220px] ${inputCls}`} />
          <button onClick={runAi} disabled={busy} className={btnCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Match me
          </button>
        </div>
        {ai?.strategy && <p className="mt-3 text-xs text-muted-foreground">{ai.strategy}</p>}
        <AiPicks picks={ai?.picks ?? []} keyName="title" />
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} of {items.length} opportunities</p>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((x) => (
          <article key={x.id} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{x.title}</h3>
                <p className="text-xs text-muted-foreground">{[x.host, x.country].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                {x.category && <Chip>{x.category}</Chip>}
                {x.funded && <Chip>Funded</Chip>}
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{x.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <Field label="Level" value={x.level ?? "—"} />
              <Field label="Mode" value={x.mode ?? "—"} />
              <Field label="Duration" value={x.duration ?? "—"} />
              <Field label="Stipend" value={x.stipend ?? "—"} />
              <Field label="Field" value={x.field ?? "—"} />
              <Field label="Deadline" value={fmt(x.deadline)} />
              <div className="col-span-2 sm:col-span-2"><Field label="Eligibility" value={x.eligibility ?? "—"} /></div>
            </dl>
            {x.link && (
              <a href={x.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Official page <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Professors ---------------- */
function Professors({ items }: { items: Prof[] }) {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [collabOnly, setCollabOnly] = useState(false);
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("PhD supervision");
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<{ picks: any[]; summary?: string } | null>(null);
  const [emailFor, setEmailFor] = useState<Prof | null>(null);
  const match = useServerFn(researchProfessorMatcher);

  const countries = useMemo(() => Array.from(new Set(items.map((i) => i.country).filter(Boolean) as string[])).sort(), [items]);
  const filtered = items.filter((p) => {
    if (country && p.country !== country) return false;
    if (openOnly && !p.open_positions) return false;
    if (collabOnly && !p.collaboration_open) return false;
    if (q) {
      const s = q.toLowerCase();
      const hay = [p.name, p.university, p.department, (p.research_areas ?? []).join(" "), (p.keywords ?? []).join(" ")].join(" ").toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });

  async function runAi() {
    setBusy(true);
    try { setAi(await match({ data: { topic, goal } })); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4 grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, university, department, research keywords" className={`w-full pl-10 ${inputCls}`} />
        </div>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
          <option value="">All countries</option>{countries.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} /> Open positions</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={collabOnly} onChange={(e) => setCollabOnly(e.target.checked)} /> Collaboration</label>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <p className="text-sm font-semibold">AI Professor / Lab / Supervisor Matcher</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Research topic" className={`flex-1 min-w-[200px] ${inputCls}`} />
          <select value={goal} onChange={(e) => setGoal(e.target.value)} className={inputCls}>
            <option>PhD supervision</option><option>Master's thesis host</option><option>Research internship</option><option>Collaboration</option><option>Postdoc</option>
          </select>
          <button onClick={runAi} disabled={busy} className={btnCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Find matches
          </button>
        </div>
        {ai?.summary && <p className="mt-3 text-xs text-muted-foreground">{ai.summary}</p>}
        <AiPicks picks={ai?.picks ?? []} />
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} of {items.length} professors</p>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((p) => (
          <article key={p.id} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{[p.title, p.department, p.university, p.country].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                {p.open_positions && <Chip>Open positions</Chip>}
                {p.accepting_students && <Chip>Taking students</Chip>}
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{p.bio}</p>
            <div className="mt-2 flex flex-wrap gap-1">{(p.research_areas ?? []).map((a) => <Chip key={a}>{a}</Chip>)}</div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <Field label="Citations" value={p.citations?.toLocaleString() ?? "—"} />
              <Field label="h-index" value={p.h_index ?? "—"} />
              <Field label="Lab" value={p.lab_name ?? "—"} />
              <Field label="Grants" value={p.grants ?? "—"} />
              <div className="col-span-2 sm:col-span-4"><Field label="Current projects" value={p.current_projects ?? "—"} /></div>
            </dl>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              {p.scholar_url && <a href={p.scholar_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Google Scholar</a>}
              {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">Website</a>}
              {p.orcid && <a href={`https://orcid.org/${p.orcid}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">ORCID</a>}
              {p.email && <a href={`mailto:${p.email}`} className="text-primary hover:underline">{p.email}</a>}
              <button onClick={() => setEmailFor(p)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 hover:text-foreground">
                <Mail className="h-3 w-3" /> AI outreach email
              </button>
            </div>
            {emailFor?.id === p.id && <EmailBox prof={p} onClose={() => setEmailFor(null)} />}
          </article>
        ))}
      </div>
    </div>
  );
}

function EmailBox({ prof, onClose }: { prof: Prof; onClose: () => void }) {
  const write = useServerFn(researchWriter);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ subject: string; body: string; tips: string[] } | null>(null);
  const [note, setNote] = useState("");

  async function go() {
    setBusy(true);
    try {
      setRes(await write({
        data: {
          kind: "professor_email",
          target: `${prof.name}, ${prof.department ?? ""} ${prof.university ?? ""}`,
          context: `Research areas: ${(prof.research_areas ?? []).join(", ")}. Projects: ${prof.current_projects ?? ""}. Student note: ${note}`,
        },
      }));
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="mt-3 rounded-xl border border-border/60 p-3">
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What do you want to ask for?" className={`w-full ${inputCls}`} />
      <div className="mt-2 flex gap-2">
        <button onClick={go} disabled={busy} className={btnCls}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate</button>
        <button onClick={onClose} className="rounded-xl border border-border px-4 py-2.5 text-sm">Close</button>
      </div>
      {res && (
        <div className="mt-3 space-y-2 text-xs">
          <p className="font-semibold">{res.subject}</p>
          <pre className="whitespace-pre-wrap font-sans text-muted-foreground">{res.body}</pre>
          <div className="flex gap-2">
            <button onClick={() => { navigator.clipboard.writeText(`${res.subject}\n\n${res.body}`); toast.success("Copied"); }}
              className="rounded-full border border-border px-3 py-1">Copy</button>
            {prof.email && (
              <a href={`mailto:${prof.email}?subject=${encodeURIComponent(res.subject)}&body=${encodeURIComponent(res.body)}`}
                className="rounded-full border border-border px-3 py-1">Open in mail</a>
            )}
          </div>
          <List title="Tips" items={res.tips} />
        </div>
      )}
    </div>
  );
}

/* ---------------- Journals ---------------- */
function Journals({ items }: { items: Journal[] }) {
  const [q, setQ] = useState("");
  const [quartile, setQuartile] = useState("");
  const [oa, setOa] = useState("");
  const [maxApc, setMaxApc] = useState("");
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<any>(null);
  const rec = useServerFn(researchJournalRecommender);

  const filtered = items.filter((j) => {
    if (quartile && j.quartile !== quartile) return false;
    if (oa && !(j.open_access ?? "").toLowerCase().includes(oa.toLowerCase())) return false;
    if (maxApc && (j.apc_usd ?? 0) > Number(maxApc)) return false;
    if (q) {
      const s = q.toLowerCase();
      if (![j.name, j.publisher, j.field, j.scope, (j.indexing ?? []).join(" ")].join(" ").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  async function go() {
    if (!abstract.trim()) return toast.error("Paste your abstract first");
    setBusy(true);
    try { setAi(await rec({ data: { title, abstract } })); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4">
        <p className="text-sm font-semibold">AI Journal Recommender + Publication Readiness Score</p>
        <div className="mt-3 grid gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Manuscript title" className={inputCls} />
          <textarea value={abstract} onChange={(e) => setAbstract(e.target.value)} rows={5} placeholder="Paste your abstract" className={inputCls} />
          <button onClick={go} disabled={busy} className={btnCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Recommend journals
          </button>
        </div>
        {ai && (
          <div className="mt-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-nebula" style={{ width: `${Math.min(100, ai.readiness ?? 0)}%` }} />
              </div>
              <span className="text-xs font-semibold">Readiness {ai.readiness ?? 0}/100</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{ai.verdict}</p>
            <AiPicks picks={ai.picks ?? []} />
            <div className="mt-3"><List title="Improve before submission" items={ai.improvements} /></div>
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-4 grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search journal, publisher, indexing" className={`w-full pl-10 ${inputCls}`} />
        </div>
        <select value={quartile} onChange={(e) => setQuartile(e.target.value)} className={inputCls}>
          <option value="">All quartiles</option><option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option>
        </select>
        <select value={oa} onChange={(e) => setOa(e.target.value)} className={inputCls}>
          <option value="">Any access model</option><option value="Full OA">Full open access</option><option value="Hybrid">Hybrid</option>
        </select>
        <input value={maxApc} onChange={(e) => setMaxApc(e.target.value)} type="number" placeholder="Max APC (USD)" className={`md:col-span-4 ${inputCls}`} />
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} of {items.length} journals</p>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((j) => (
          <article key={j.id} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{j.name}</h3>
                <p className="text-xs text-muted-foreground">{[j.publisher, j.field].filter(Boolean).join(" · ")}</p>
              </div>
              {j.quartile && <Chip>{j.quartile}</Chip>}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{j.scope}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <Field label="Impact factor" value={j.impact_factor ?? "—"} />
              <Field label="CiteScore" value={j.citescore ?? "—"} />
              <Field label="Acceptance" value={j.acceptance_rate ? `${j.acceptance_rate}%` : "—"} />
              <Field label="APC" value={j.apc_usd != null ? `$${j.apc_usd.toLocaleString()}` : "—"} />
              <Field label="Review" value={j.review_weeks ? `${j.review_weeks} wks` : "—"} />
              <Field label="To publication" value={j.publication_weeks ? `${j.publication_weeks} wks` : "—"} />
              <div className="col-span-3"><Field label="Open access" value={j.open_access ?? "—"} /></div>
            </dl>
            <div className="mt-2 flex flex-wrap gap-1">{(j.indexing ?? []).map((i) => <Chip key={i}>{i}</Chip>)}</div>
            {j.link && (
              <a href={j.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Submission guidelines <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Conferences ---------------- */
function Conferences({ items }: { items: Conf[] }) {
  const [q, setQ] = useState("");
  const [format, setFormat] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<{ picks: any[]; plan?: string } | null>(null);
  const rec = useServerFn(researchConferenceRecommender);

  const filtered = items.filter((c) => {
    if (format && c.format !== format) return false;
    if (q) {
      const s = q.toLowerCase();
      if (![c.name, c.organizer, c.field, c.country, (c.topics ?? []).join(" ")].join(" ").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  async function go() {
    setBusy(true);
    try { setAi(await rec({ data: { topic } })); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4">
        <p className="text-sm font-semibold">AI Conference Recommender</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Your paper topic" className={`flex-1 min-w-[220px] ${inputCls}`} />
          <button onClick={go} disabled={busy} className={btnCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Recommend
          </button>
        </div>
        {ai?.plan && <p className="mt-3 text-xs text-muted-foreground">{ai.plan}</p>}
        <AiPicks picks={ai?.picks ?? []} />
      </div>

      <div className="glass rounded-2xl p-4 grid gap-3 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conference, organizer, topic" className={`w-full pl-10 ${inputCls}`} />
        </div>
        <select value={format} onChange={(e) => setFormat(e.target.value)} className={inputCls}>
          <option value="">Any format</option><option>In-person</option><option>Hybrid</option><option>Online</option>
        </select>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} of {items.length} conferences</p>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((c) => (
          <article key={c.id} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-xs text-muted-foreground">{[c.organizer, c.location, c.country].filter(Boolean).join(" · ")}</p>
              </div>
              {c.format && <Chip>{c.format}</Chip>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">{(c.topics ?? []).map((t) => <Chip key={t}>{t}</Chip>)}</div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <Field label="CFP deadline" value={fmt(c.paper_deadline)} />
              <Field label="Event starts" value={fmt(c.start_date)} />
              <Field label="Acceptance" value={c.acceptance_rate ? `${c.acceptance_rate}%` : "—"} />
              <Field label="Registration" value={c.registration_fee ?? "—"} />
              <Field label="Proceedings" value={c.proceedings ?? "—"} />
              <Field label="Awards" value={c.awards ?? "—"} />
            </dl>
            <div className="mt-2 flex flex-wrap gap-1">
              {c.travel_grants && <Chip>Travel grants</Chip>}
              {c.student_discount && <Chip>Student discount</Chip>}
            </div>
            {c.link && (
              <a href={c.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Call for papers <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Funding ---------------- */
function Funding({ items }: { items: Grant[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<{ picks: any[]; strategy?: string } | null>(null);
  const match = useServerFn(researchGrantMatcher);

  const types = useMemo(() => Array.from(new Set(items.map((i) => i.type).filter(Boolean) as string[])).sort(), [items]);
  const filtered = items.filter((g) => {
    if (type && g.type !== type) return false;
    if (q) {
      const s = q.toLowerCase();
      if (![g.name, g.funder, g.country, (g.fields ?? []).join(" ")].join(" ").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  async function go() {
    setBusy(true);
    try { setAi(await match({ data: { topic } })); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4">
        <p className="text-sm font-semibold">AI Grant Matcher</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Project or research area" className={`flex-1 min-w-[220px] ${inputCls}`} />
          <button onClick={go} disabled={busy} className={btnCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Match funding
          </button>
        </div>
        {ai?.strategy && <p className="mt-3 text-xs text-muted-foreground">{ai.strategy}</p>}
        <AiPicks picks={ai?.picks ?? []} />
      </div>

      <div className="glass rounded-2xl p-4 grid gap-3 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search grant, funder, country" className={`w-full pl-10 ${inputCls}`} />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
          <option value="">All funding types</option>{types.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} of {items.length} funding programs</p>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((g) => (
          <article key={g.id} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{g.name}</h3>
                <p className="text-xs text-muted-foreground">{[g.funder, g.country].filter(Boolean).join(" · ")}</p>
              </div>
              {g.type && <Chip>{g.type}</Chip>}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{g.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <Field label="Amount" value={g.amount ?? "—"} />
              <Field label="Duration" value={g.duration ?? "—"} />
              <Field label="Deadline" value={fmt(g.deadline)} />
              <div className="col-span-2 sm:col-span-3"><Field label="Eligibility" value={g.eligibility ?? "—"} /></div>
            </dl>
            {g.link && (
              <a href={g.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Apply / details <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------------- AI Assistant ---------------- */
const ASSIST_MODES = [
  { id: "topics", label: "Topic & idea generator" },
  { id: "gaps", label: "Research gap detection" },
  { id: "questions", label: "Questions & hypotheses" },
  { id: "methodology", label: "Methodology & stats" },
  { id: "literature", label: "Literature review outline" },
  { id: "summarize", label: "Paper summarization" },
  { id: "timeline", label: "Research timeline planner" },
];

function Assistant() {
  const run = useServerFn(researchAssistant);
  const [mode, setMode] = useState("topics");
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ headline: string; items: any[]; next_steps: string[] } | null>(null);

  async function go() {
    setBusy(true);
    try { setRes(await run({ data: { mode, topic, text } })); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5">
        <p className="text-sm font-semibold">AI Research Assistant</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ASSIST_MODES.map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`rounded-full px-3 py-1.5 text-xs ${mode === m.id ? "bg-nebula text-primary-foreground" : "border border-border text-muted-foreground"}`}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Research area or topic" className={inputCls} />
          {(mode === "summarize" || mode === "methodology") && (
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder="Paste the paper text, abstract or study description" className={inputCls} />
          )}
          <button onClick={go} disabled={busy} className={btnCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Run
          </button>
        </div>
      </div>
      {res && (
        <div className="glass rounded-2xl p-5 text-sm">
          <p className="font-medium">{res.headline}</p>
          <ul className="mt-3 space-y-2">
            {(res.items ?? []).map((it, i) => (
              <li key={i} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{it.title}</p>
                  {it.tag && <Chip>{it.tag}</Chip>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{it.detail}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3"><List title="Next steps" items={res.next_steps} /></div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Review & writing ---------------- */
function ReviewWriting() {
  const review = useServerFn(researchReviewer);
  const write = useServerFn(researchWriter);
  const [kind, setKind] = useState("manuscript");
  const [venue, setVenue] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);

  const [wKind, setWKind] = useState("rebuttal");
  const [wCtx, setWCtx] = useState("");
  const [wBusy, setWBusy] = useState(false);
  const [wRes, setWRes] = useState<{ subject: string; body: string; tips: string[] } | null>(null);

  async function go() {
    if (!text.trim()) return toast.error("Paste your text first");
    setBusy(true);
    try { setRes(await review({ data: { kind, text, venue } })); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  async function goWrite() {
    setWBusy(true);
    try { setWRes(await write({ data: { kind: wKind, context: wCtx, target: venue } })); } catch (e: any) { toast.error(e.message); } finally { setWBusy(false); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass rounded-2xl p-5">
        <p className="text-sm font-semibold">AI Peer Review Simulation</p>
        <div className="mt-3 grid gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls}>
            <option value="manuscript">Manuscript</option><option value="abstract">Abstract</option>
            <option value="research proposal">Research proposal</option><option value="thesis chapter">Thesis chapter</option>
          </select>
          <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Target journal / conference (optional)" className={inputCls} />
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder="Paste your text" className={inputCls} />
          <button onClick={go} disabled={busy} className={btnCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />} Review
          </button>
        </div>
        {res && (
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-nebula" style={{ width: `${Math.min(100, res.score ?? 0)}%` }} />
              </div>
              <span className="text-xs font-semibold">{res.score ?? 0}/100 · {res.recommendation}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(res.scores ?? {}).map(([k, v]) => <Chip key={k}>{k}: {String(v)}/10</Chip>)}
            </div>
            <List title="Strengths" items={res.strengths} />
            <List title="Weaknesses" items={res.weaknesses} />
            <List title="Referee comments" items={res.reviewer_comments} />
            <List title="Citation suggestions" items={res.citation_suggestions} />
            {res.revised_abstract && (
              <div className="rounded-xl border border-border/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Improved abstract</p>
                <p className="mt-1 text-xs">{res.revised_abstract}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-5">
        <p className="text-sm font-semibold">AI Academic Writing</p>
        <div className="mt-3 grid gap-2">
          <select value={wKind} onChange={(e) => setWKind(e.target.value)} className={inputCls}>
            <option value="rebuttal">Reviewer response letter</option>
            <option value="cover_letter">Journal cover letter</option>
            <option value="professor_email">Professor outreach email</option>
            <option value="collaboration">Collaboration proposal</option>
          </select>
          <textarea value={wCtx} onChange={(e) => setWCtx(e.target.value)} rows={10} placeholder="Paste reviewer comments, paper summary or context" className={inputCls} />
          <button onClick={goWrite} disabled={wBusy} className={btnCls}>
            {wBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate
          </button>
        </div>
        {wRes && (
          <div className="mt-4 space-y-2 text-sm">
            <p className="font-medium">{wRes.subject}</p>
            <pre className="whitespace-pre-wrap rounded-xl border border-border/60 p-3 font-sans text-xs text-muted-foreground">{wRes.body}</pre>
            <button onClick={() => { navigator.clipboard.writeText(`${wRes.subject}\n\n${wRes.body}`); toast.success("Copied"); }}
              className="rounded-full border border-border px-3 py-1 text-xs">Copy</button>
            <List title="Tips" items={wRes.tips} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Publication tracker ---------------- */
function Tracker({ items, setItems, userId }: { items: Manuscript[]; setItems: (m: Manuscript[]) => void; userId: string }) {
  const [form, setForm] = useState({ title: "", target_venue: "", venue_type: "journal", stage: "drafting" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const { data, error } = await supabase.from("manuscripts").insert({ user_id: userId, ...form }).select().single();
    if (error) return toast.error(error.message);
    setItems([data as Manuscript, ...items]);
    setForm({ title: "", target_venue: "", venue_type: "journal", stage: "drafting" });
    toast.success("Manuscript added");
  }
  async function update(id: string, patch: Partial<Manuscript>) {
    const { error } = await supabase.from("manuscripts").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setItems(items.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  async function remove(id: string) {
    const { error } = await supabase.from("manuscripts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems(items.filter((m) => m.id !== id));
  }

  const byStage = (s: string) => items.filter((m) => m.stage === s).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Under review" value={String(byStage("under review") + byStage("submitted"))} />
        <Stat label="In revision" value={String(byStage("revision requested"))} />
        <Stat label="Accepted" value={String(byStage("accepted") + byStage("published"))} />
        <Stat label="Drafting" value={String(byStage("drafting") + byStage("internal review"))} />
      </div>

      <form onSubmit={add} className="glass rounded-2xl p-5 grid gap-3 sm:grid-cols-2">
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Manuscript title" className={`sm:col-span-2 ${inputCls}`} />
        <input value={form.target_venue} onChange={(e) => setForm({ ...form, target_venue: e.target.value })} placeholder="Target journal / conference" className={inputCls} />
        <select value={form.venue_type} onChange={(e) => setForm({ ...form, venue_type: e.target.value })} className={inputCls}>
          <option value="journal">Journal</option><option value="conference">Conference</option><option value="preprint">Preprint</option><option value="book chapter">Book chapter</option>
        </select>
        <button className={`sm:col-span-2 ${btnCls}`}><Plus className="h-4 w-4" /> Add manuscript</button>
      </form>

      <ul className="space-y-3">
        {items.map((m) => (
          <li key={m.id} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-medium">{m.title}</h3>
                <p className="text-xs text-muted-foreground">{[m.target_venue, m.venue_type].filter(Boolean).join(" · ")}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <select value={m.stage} onChange={(e) => update(m.id, { stage: e.target.value })} className={`text-xs ${inputCls}`}>
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input type="date" value={m.submitted_at ?? ""} onChange={(e) => update(m.id, { submitted_at: e.target.value || null })} className={`text-xs ${inputCls}`} />
                  <input type="number" min={0} value={m.revision_round ?? 0} onChange={(e) => update(m.id, { revision_round: Number(e.target.value) })} placeholder="Revision round" className={`text-xs ${inputCls}`} />
                  <input value={m.doi ?? ""} onChange={(e) => update(m.id, { doi: e.target.value || null })} placeholder="DOI" className={`text-xs ${inputCls}`} />
                </div>
                <textarea value={m.reviewer_notes ?? ""} onChange={(e) => update(m.id, { reviewer_notes: e.target.value })} rows={2}
                  placeholder="Reviewer responses / revision notes" className={`mt-2 w-full text-xs ${inputCls}`} />
              </div>
              <button onClick={() => remove(m.id)} className="rounded-full border border-border p-2 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted-foreground">No manuscripts tracked yet.</li>}
      </ul>

      <div className="glass rounded-2xl p-5 text-sm">
        <p className="font-semibold">Portfolio & profile sync</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Published work lives in your Publication Hub; add ORCID, Google Scholar and ResearchGate links on your profile to keep your portfolio consistent.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link to="/publications" className="rounded-full border border-border px-3 py-1.5">Publication Hub</Link>
          <Link to="/profile" className="rounded-full border border-border px-3 py-1.5">Academic profile links</Link>
          <a href="https://orcid.org/my-orcid" target="_blank" rel="noreferrer" className="rounded-full border border-border px-3 py-1.5">ORCID record</a>
          <a href="https://scholar.google.com/citations" target="_blank" rel="noreferrer" className="rounded-full border border-border px-3 py-1.5">Google Scholar</a>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Collaboration ---------------- */
function Collaboration() {
  const run = useServerFn(researchCollaborationFinder);
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("collaborators");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ headline: string; items: any[]; next_steps: string[] } | null>(null);

  async function go() {
    if (!topic.trim()) return toast.error("Enter a topic");
    setBusy(true);
    try { setRes(await run({ data: { topic, mode } })); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5">
        <p className="text-sm font-semibold">AI Collaboration Finder & Literature Scan</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Research topic" className={`flex-1 min-w-[220px] ${inputCls}`} />
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputCls}>
            <option value="collaborators">Collaborators & communities</option>
            <option value="literature">AI literature search & systematic review</option>
          </select>
          <button onClick={go} disabled={busy} className={btnCls}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />} Find
          </button>
        </div>
        {res && (
          <div className="mt-4 text-sm">
            <p className="font-medium">{res.headline}</p>
            <ul className="mt-3 space-y-2">
              {(res.items ?? []).map((it, i) => (
                <li key={i} className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{it.title}</p>{it.tag && <Chip>{it.tag}</Chip>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{it.detail}</p>
                </li>
              ))}
            </ul>
            <div className="mt-3"><List title="Next steps" items={res.next_steps} /></div>
          </div>
        )}
      </div>

      <ResourceGrid
        title="Research resources & open science"
        items={[
          ["Literature databases", "Scopus, Web of Science, PubMed, IEEE Xplore, ACM DL, Google Scholar, Semantic Scholar", "https://www.semanticscholar.org/"],
          ["Citation managers", "Zotero, Mendeley and BibTeX workflows for reference management", "https://www.zotero.org/"],
          ["Systematic reviews", "PRISMA checklist and flow diagram for review protocols", "https://www.prisma-statement.org/"],
          ["Research ethics & integrity", "COPE guidance on publication ethics and authorship", "https://publicationethics.org/"],
          ["Statistical analysis", "R, Python (statsmodels/scipy), JASP and jamovi resources", "https://www.jamovi.org/"],
          ["Dataset repositories", "Zenodo, Figshare, Dryad, Kaggle and Harvard Dataverse", "https://zenodo.org/"],
          ["Preprint servers", "arXiv, bioRxiv, medRxiv, SSRN and Research Square", "https://arxiv.org/"],
          ["Academic writing guides", "Purdue OWL, Nature Masterclasses and APA/IEEE style guides", "https://owl.purdue.edu/"],
          ["Research methodology", "SAGE Research Methods and open methodology courses", "https://methods.sagepub.com/"],
        ]}
      />
    </div>
  );
}

/* ---------------- Innovation ---------------- */
function Innovation() {
  return (
    <ResourceGrid
      title="Innovation, entrepreneurship & technology transfer"
      items={[
        ["Y Combinator", "World's leading startup accelerator; batches twice a year with seed funding", "https://www.ycombinator.com/"],
        ["Techstars", "Global accelerator network with mentorship and investment", "https://www.techstars.com/"],
        ["MIT Solve", "Innovation challenges with prize funding for social impact ventures", "https://solve.mit.edu/"],
        ["EIT Innovation Communities", "EU innovation and deep-tech venture programs", "https://eit.europa.eu/"],
        ["Hello Tomorrow", "Global deep-tech challenge for science-based startups", "https://hello-tomorrow.org/"],
        ["WIPO Patent Resources", "PATENTSCOPE search and international patent filing guidance", "https://www.wipo.int/patentscope/"],
        ["Google Patents", "Free prior-art search across global patent offices", "https://patents.google.com/"],
        ["Technology Transfer Offices", "How university TTOs license research and create spinouts", "https://autm.net/"],
        ["Research commercialization", "NSF I-Corps customer discovery for research teams", "https://new.nsf.gov/funding/initiatives/i-corps"],
        ["University innovation centers", "Stanford StartX, Cambridge Enterprise, ETH Pioneer Fellowships", "https://startx.com/"],
        ["Startup research grants", "SBIR/STTR early-stage research commercialization funding", "https://www.sbir.gov/"],
        ["Innovation competitions", "Falling Walls, James Dyson Award and Global Student Entrepreneur Awards", "https://falling-walls.com/"],
      ]}
    />
  );
}

function ResourceGrid({ title, items }: { title: string; items: [string, string, string][] }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([name, desc, url]) => (
          <a key={name} href={url} target="_blank" rel="noreferrer" className="rounded-xl border border-border/60 p-4 transition hover:border-primary">
            <p className="text-sm font-medium">{name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary">Open <ExternalLink className="h-3 w-3" /></span>
          </a>
        ))}
      </div>
    </div>
  );
}
