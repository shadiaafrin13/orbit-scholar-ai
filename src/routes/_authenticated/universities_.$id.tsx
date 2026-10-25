import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { predictAdmissionChance } from "@/lib/university-ai.functions";
import { toast } from "sonner";
import {
  ArrowLeft, Award, Bookmark, BookmarkCheck, BookOpen, Building2, ExternalLink, Globe, GraduationCap,
  Landmark, Loader2, MapPin, Scale, Sparkles, Trophy, Users, Wallet,
} from "lucide-react";

const TABS = [
  ["overview", "Overview"],
  ["faculties", "Faculties & Departments"],
  ["programs", "All Programs"],
  ["tuition", "Tuition & Costs"],
  ["admissions", "Admission Requirements"],
  ["funding", "Scholarships & Funding"],
  ["research", "Research & Faculty"],
  ["campus", "Campus & Student Services"],
] as const;
type TabKey = (typeof TABS)[number][0];

type IndexedProgram = {
  id: string; title: string; institution: string; country: string;
  degree_level: string; subject: string | null; official_url: string;
  identity_verification: string;
};

export const Route = createFileRoute("/_authenticated/universities_/$id")({
  validateSearch: (search: Record<string, unknown>): { tab?: TabKey } => ({
    tab: TABS.some(([key]) => key === search.tab) ? (search.tab as TabKey) : undefined,
  }),
  head: ({ loaderData }: { loaderData?: { university?: { name?: string } } }) => ({
    meta: [
      { title: loaderData?.university?.name ? `${loaderData.university.name} — Atlas` : "University — Atlas" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ params }) => {
    const [uniRes, progRes] = await Promise.all([
      supabase.from("universities").select("*").eq("id", params.id).maybeSingle(),
      supabase
        .from("discovery_programs")
        .select("id,title,institution,country,degree_level,subject,official_url,identity_verification")
        .eq("university_id", params.id)
        .order("title"),
    ]);
    if (uniRes.error || !uniRes.data) throw notFound();
    return { university: uniRes.data, programs: (progRes.data ?? []) as IndexedProgram[] };
  },
  errorComponent: ({ error }) => <div className="p-10 text-sm text-red-500">Failed to load: {error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-10 text-sm text-muted-foreground">University not found.</div>,
  component: UniDetail,
});

type Prediction = { chance: number; band: string; summary: string; strengths: string[]; gaps: string[]; suggestions: string[] };

function UniDetail() {
  const data = Route.useLoaderData();
  const u = data.university;
  const { tab } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const [saved, setSaved] = useState(false);
  const [pred, setPred] = useState<Prediction | null>(null);
  const [predLoading, setPredLoading] = useState(false);
  const predictFn = useServerFn(predictAdmissionChance);

  useEffect(() => {
    (async () => {
      const { data: row } = await supabase.from("saved_items").select("id")
        .eq("user_id", user.id).eq("item_type", "university").eq("item_id", u.id).maybeSingle();
      setSaved(!!row);
    })();
  }, [u.id, user.id]);

  async function toggleSave() {
    if (saved) {
      await supabase.from("saved_items").delete().eq("user_id", user.id).eq("item_type", "university").eq("item_id", u.id);
      setSaved(false);
    } else {
      await supabase.from("saved_items").insert({ user_id: user.id, item_type: "university", item_id: u.id });
      setSaved(true); toast.success("Saved");
    }
  }

  async function runPredict() {
    setPredLoading(true); setPred(null);
    try {
      const r = (await predictFn({ data: { universityId: u.id } })) as Prediction;
      setPred(r);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Prediction failed"); }
    finally { setPredLoading(false); }
  }

  const mapUrl = u.latitude != null && u.longitude != null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${u.longitude - 0.05}%2C${u.latitude - 0.03}%2C${u.longitude + 0.05}%2C${u.latitude + 0.03}&layer=mapnik&marker=${u.latitude}%2C${u.longitude}`
    : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Link to="/countries" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Countries
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={toggleSave}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs ${saved ? "border-primary bg-nebula text-primary-foreground" : "border-border"}`}>
              {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
              {saved ? "Saved" : "Save"}
            </button>
            {u.website && (
              <a href={u.website} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                <ExternalLink className="h-3.5 w-3.5" /> Official site
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Hero */}
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {[u.city, u.country].filter(Boolean).join(", ")}
            {u.continent && <span>· {u.continent}</span>}
            {u.campus_type && <span>· {u.campus_type} campus</span>}
          </div>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{u.name}</h1>
          {u.description && <p className="mt-3 max-w-3xl text-muted-foreground">{u.description}</p>}
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {u.world_rank && <Chip>World #{u.world_rank}</Chip>}
            {u.qs_rank && <Chip>QS #{u.qs_rank}</Chip>}
            {u.the_rank && <Chip>THE #{u.the_rank}</Chip>}
            {u.arwu_rank && <Chip>ARWU #{u.arwu_rank}</Chip>}
            {u.established_year && <Chip>Est. {u.established_year}</Chip>}
            {u.student_count && <Chip><Users className="mr-1 inline h-3 w-3" />{u.student_count.toLocaleString()} students</Chip>}
            {u.intl_ratio != null && <Chip>{u.intl_ratio}% international</Chip>}
            {u.language && <Chip>{u.language}</Chip>}
          </div>
        </div>

        {/* Tabs */}
        <nav aria-label="University profile sections" className="mt-8 flex flex-wrap gap-1 border-b border-border pb-2">
          {TABS.map(([key, label]) => (
            <Link key={key} to="/universities/$id" params={{ id: u.id }} search={{ tab: key }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${tab === key
                ? "bg-nebula text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              aria-current={tab === key ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-7">
          {tab === "overview" && <OverviewTab u={u} pred={pred} predLoading={predLoading} runPredict={runPredict} />}
          {tab === "faculties" && <FacultiesTab u={u} />}
          {tab === "programs" && <ProgramsTab u={u} programs={data.programs} />}
          {tab === "tuition" && <TuitionTab u={u} />}
          {tab === "admissions" && <AdmissionsTab u={u} />}
          {tab === "funding" && <FundingTab u={u} />}
          {tab === "research" && <ResearchTab u={u} />}
          {tab === "campus" && <CampusTab u={u} mapUrl={mapUrl} />}
        </div>
      </main>
    </div>
  );
}

/* ---- Tab A: Overview ---- */
function OverviewTab({ u, pred, predLoading, runPredict }: { u: any; pred: Prediction | null; predLoading: boolean; runPredict: () => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Section icon={Building2} title="Institution snapshot">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <KV k="Official name" v={u.name} />
            <KV k="Location" v={[u.city, u.country].filter(Boolean).join(", ") || "Not published"} />
            <KV k="Founded" v={u.established_year ?? "Not published"} />
            <KV k="Type" v={u.campus_type ? `${u.campus_type} campus` : "Not published"} />
            <KV k="Languages of instruction" v={u.language ?? "Not published"} />
            <KV k="Students" v={u.student_count ? u.student_count.toLocaleString() : "Not published"} />
            <KV k="International students" v={u.intl_ratio != null ? `${u.intl_ratio}%` : "Not published"} />
            <KV k="Employability rank" v={u.employability_rank ? `#${u.employability_rank}` : "Not published"} />
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Figures above are directory records, not admissions guarantees — verify anything you rely on against the institution's official pages.
          </p>
        </Section>

        {/* AI estimate */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Profile fit estimate</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Compares your saved profile with this university's directory benchmarks. This is an estimate of fit — not an official admission probability.
              </p>
            </div>
            <button onClick={runPredict} disabled={predLoading}
              className="inline-flex items-center gap-2 rounded-full bg-nebula px-4 py-2 text-sm font-medium text-primary-foreground glow disabled:opacity-60">
              {predLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
              {predLoading ? "Analyzing…" : "Estimate my fit"}
            </button>
          </div>
          {pred && (
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="glass rounded-xl p-4 text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Fit estimate</p>
                <p className="mt-1 text-4xl font-bold text-gradient">{pred.chance}%</p>
                <p className="mt-1 text-xs font-medium capitalize text-primary">{pred.band}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">{pred.summary}</p>
                {pred.strengths?.length > 0 && <List title="Strengths" items={pred.strengths} />}
                {pred.gaps?.length > 0 && <List title="Gaps" items={pred.gaps} />}
                {pred.suggestions?.length > 0 && <List title="Suggestions" items={pred.suggestions} />}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="glass rounded-2xl p-5 self-start">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cost & benchmarks</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <KV k="Tuition / yr" v={u.tuition_usd ? `$${u.tuition_usd.toLocaleString()} ${u.currency ?? "USD"}` : "—"} />
          {u.tuition_min_usd != null && u.tuition_max_usd != null && (
            <KV k="Range" v={`$${u.tuition_min_usd.toLocaleString()} – $${u.tuition_max_usd.toLocaleString()}`} />
          )}
          <KV k="Living cost" v={u.living_cost_usd ? `$${u.living_cost_usd.toLocaleString()}/yr` : "—"} />
          <KV k="Housing" v={u.housing_cost_usd ? `$${u.housing_cost_usd.toLocaleString()}/yr` : "—"} />
          <KV k="Acceptance" v={u.acceptance_rate ? `${u.acceptance_rate}%` : "—"} />
          <KV k="Avg GPA" v={u.avg_gpa ?? "—"} />
          <KV k="IELTS min" v={u.ielts_min ?? "—"} />
          <KV k="TOEFL min" v={u.toefl_min ?? "—"} />
          <KV k="DET min" v={u.det_min ?? "—"} />
          <KV k="GRE" v={u.gre_required ? "Required" : "Optional"} />
          <KV k="GMAT" v={u.gmat_required ? "Required" : "Optional"} />
          <KV k="Deadline" v={u.application_deadline ?? "—"} />
        </dl>
        <p className="mt-3 text-[11px] text-muted-foreground">Institution-level directory figures — program-level fees and deadlines live on each program page.</p>
      </div>
    </div>
  );
}

/* ---- Tab B: Faculties & Departments ---- */
function FacultiesTab({ u }: { u: any }) {
  const faculties = u.faculties ?? [];
  return (
    <Section icon={Building2} title="Documented academic structure">
      {faculties.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">Faculties and academic units recorded for this institution in the directory. Departments, subjects, and programs per faculty are reviewed against official pages as the catalog expands.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {faculties.map((f: string) => (
              <div key={f} className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm">{f}</div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState icon={Building2} message="No faculty structure has been recorded for this institution yet." />
      )}
      {(u.research_areas?.length ?? 0) > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Research areas represented</p>
          <div className="mt-2 flex flex-wrap gap-2">{u.research_areas!.map((r: string) => <Chip key={r}>{r}</Chip>)}</div>
        </div>
      )}
    </Section>
  );
}

/* ---- Tab C: All Programs ---- */
function ProgramsTab({ u, programs }: { u: any; programs: IndexedProgram[] }) {
  return (
    <div className="space-y-6">
      <Section icon={GraduationCap} title="Programs indexed in Atlas">
        <p className="text-sm text-muted-foreground">
          Program pages ATLAS has opened for this institution. Every entry carries its own verification status on the program page — this list is not claimed to be the institution's complete catalog.
        </p>
        {programs.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {programs.map((p) => (
              <Link key={p.id} to="/programs/$programId" params={{ programId: p.id }}
                className="flex flex-col rounded-lg border border-border bg-card p-4 transition hover:border-primary/50">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-snug hover:text-primary">{p.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${p.identity_verification === "reviewed_official"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
                    {p.identity_verification === "reviewed_official" ? "Verified official" : "Awaiting verification"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{[p.degree_level, p.subject].filter(Boolean).join(" · ")}</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={GraduationCap} message="No individual program pages have been indexed for this institution yet — the directory lists the institution, not its full catalog." />
        )}
      </Section>

      {(u.programs?.length ?? 0) > 0 && (
        <Section icon={BookOpen} title="Officially listed — details incomplete">
          <p className="text-sm text-muted-foreground">Program names recorded from directory sources. Tuition, deadlines, and requirements are not yet verified at program level.</p>
          <div className="mt-3 flex flex-wrap gap-2">{u.programs!.map((p: string) => <Chip key={p}>{p}</Chip>)}</div>
          {(u.levels?.length ?? 0) > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">Degree levels on record: {u.levels!.join(" · ")}</div>
          )}
        </Section>
      )}
    </div>
  );
}

/* ---- Tab D: Tuition & Costs ---- */
function TuitionTab({ u }: { u: any }) {
  return (
    <Section icon={Wallet} title="Tuition & cost context">
      <p className="text-sm text-muted-foreground">Institution-level figures from directory sources. Individual program fees may differ — each program page lists its own verified tuition where available.</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
        <KV k="Typical tuition / year" v={u.tuition_usd ? `$${u.tuition_usd.toLocaleString()} ${u.currency ?? "USD"}` : "Not published"} />
        <KV k="Published range" v={u.tuition_min_usd != null || u.tuition_max_usd != null ? `$${u.tuition_min_usd?.toLocaleString() ?? "?"} – $${u.tuition_max_usd?.toLocaleString() ?? "?"}` : "Not published"} />
        <KV k="Currency" v={u.currency ?? "USD assumed"} />
        <KV k="Living costs" v={u.living_cost_usd ? `$${u.living_cost_usd.toLocaleString()}/yr` : "Not published"} />
        <KV k="Housing estimate" v={u.housing_cost_usd ? `$${u.housing_cost_usd.toLocaleString()}/yr` : "Not published"} />
        <KV k="Acceptance rate (directory)" v={u.acceptance_rate ? `${u.acceptance_rate}%` : "Not published"} />
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        A full degree-cost calculation is not shown because program-level fee structure and duration are not verified for this institution. Atlas does not estimate a total cost without those inputs.
      </p>
      {(u.scholarships_info) && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Funding notes on record</p>
          <p className="mt-2 text-sm text-muted-foreground">{u.scholarships_info}</p>
        </div>
      )}
    </Section>
  );
}

/* ---- Tab E: Admission Requirements ---- */
function AdmissionsTab({ u }: { u: any }) {
  return (
    <Section icon={Landmark} title="Admission requirements on record">
      <p className="text-sm text-muted-foreground">
        Minimum benchmarks recorded at institution level. These are directory figures — competitive applicant profiles often exceed them, and each program can add its own requirements.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
        <KV k="Average GPA (admitted)" v={u.avg_gpa ?? "Not published"} />
        <KV k="IELTS minimum" v={u.ielts_min ?? "Not published"} />
        <KV k="TOEFL minimum" v={u.toefl_min ?? "Not published"} />
        <KV k="Duolingo minimum" v={u.det_min ?? "Not published"} />
        <KV k="GRE" v={u.gre_required == null ? "Not published" : u.gre_required ? "Required" : "Not required"} />
        <KV k="GMAT" v={u.gmat_required == null ? "Not published" : u.gmat_required ? "Required" : "Not required"} />
        <KV k="Application deadline (typical)" v={u.application_deadline ?? "Not published"} />
        <KV k="Acceptance rate (directory)" v={u.acceptance_rate ? `${u.acceptance_rate}%` : "Not published"} />
      </dl>
      {(u.required_documents?.length ?? 0) > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Required documents</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {u.required_documents!.map((d: string) => <li key={d}>{d}</li>)}
          </ul>
        </div>
      )}
      {u.admission_notes && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admission notes</p>
          <p className="mt-2 text-sm text-muted-foreground">{u.admission_notes}</p>
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">Program-level prerequisites, portfolios, and interviews appear on each program page. Always confirm on the official admissions site before applying.</p>
    </Section>
  );
}

/* ---- Tab F: Scholarships & Funding ---- */
function FundingTab({ u }: { u: any }) {
  return (
    <Section icon={Award} title="Scholarships & funding">
      {u.scholarships_info ? (
        <>
          <p className="text-sm text-muted-foreground">{u.scholarships_info}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            Funding notes are directory records. Availability is never guaranteed to any applicant — check eligibility, deadlines, and renewal conditions on the official scholarship page, and see the Scholarships module for national awards.
          </p>
        </>
      ) : (
        <EmptyState icon={Award} message="No funding information has been recorded for this institution yet." />
      )}
    </Section>
  );
}

/* ---- Tab G: Research & Faculty ---- */
function ResearchTab({ u }: { u: any }) {
  return (
    <Section icon={Sparkles} title="Research & faculty">
      {(u.research_areas?.length ?? 0) > 0 ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Research areas</p>
          <div className="mt-2 flex flex-wrap gap-2">{u.research_areas!.map((r: string) => <Chip key={r}>{r}</Chip>)}</div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No research-area data recorded yet.</p>
      )}
      {u.exchange_partners && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exchange partners</p>
          <p className="mt-2 text-sm text-muted-foreground">{u.exchange_partners}</p>
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Faculty and research-group profiles are documented from official pages as the catalog expands. A listed profile never implies a professor is currently accepting students — confirm on their official page.
      </p>
    </Section>
  );
}

/* ---- Tab H: Campus & Student Services ---- */
function CampusTab({ u, mapUrl }: { u: any; mapUrl: string | null }) {
  return (
    <div className="space-y-6">
      <Section icon={Globe} title="Visa, work & settlement context">
        {u.visa_info || u.work_during_study || u.post_study_work || u.pr_pathway ? (
          <dl className="space-y-3 text-sm">
            {u.visa_info && <KVBlock k="Visa" v={u.visa_info} />}
            {u.work_during_study && <KVBlock k="Work during study" v={u.work_during_study} />}
            {u.post_study_work && <KVBlock k="Post-study work" v={u.post_study_work} />}
            {u.pr_pathway && <KVBlock k="PR pathway" v={u.pr_pathway} />}
          </dl>
        ) : (
          <EmptyState icon={Globe} message="No visa or work information recorded for this destination yet." />
        )}
      </Section>

      {(u.notable_alumni?.length ?? 0) > 0 && (
        <Section icon={Trophy} title="Notable alumni">
          <div className="flex flex-wrap gap-2">{u.notable_alumni!.map((a: string) => <Chip key={a}>{a}</Chip>)}</div>
          {u.employability_rank && <p className="mt-3 text-xs text-muted-foreground">Employability rank: #{u.employability_rank}</p>}
        </Section>
      )}

      {mapUrl && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Location</h3>
          <div className="mt-3 overflow-hidden rounded-2xl border border-border">
            <iframe title="Campus map" src={mapUrl} className="h-72 w-full" loading="lazy" />
          </div>
        </section>
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{children}</span>;
}
function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>;
}
function KVBlock({ k, v }: { k: string; v: string }) {
  return <div className="mt-2"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p><p className="text-sm">{v}</p></div>;
}
function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><h3 className="font-semibold">{title}</h3></div>
      {children}
    </section>
  );
}
function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center">
      <Icon className="mx-auto h-5 w-5 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground space-y-0.5">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}
