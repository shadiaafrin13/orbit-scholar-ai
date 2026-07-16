import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { predictAdmissionChance } from "@/lib/university-ai.functions";
import { toast } from "sonner";
import {
  ArrowLeft, Award, Bookmark, BookmarkCheck, Building2, ExternalLink, Globe, GraduationCap,
  Landmark, Loader2, MapPin, Scale, Sparkles, Trophy, Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/universities/$id")({
  head: ({ loaderData }: { loaderData?: { name?: string } }) => ({
    meta: [
      { title: loaderData?.name ? `${loaderData.name} — Atlas` : "University — Atlas" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ params }) => {
    const { data } = await supabase.from("universities").select("*").eq("id", params.id).maybeSingle();
    if (!data) throw notFound();
    return data;
  },
  errorComponent: ({ error }) => <div className="p-10 text-sm text-red-500">Failed to load: {error.message}</div>,
  notFoundComponent: () => <div className="p-10 text-sm text-muted-foreground">University not found.</div>,
  component: UniDetail,
});

type Prediction = { chance: number; band: string; summary: string; strengths: string[]; gaps: string[]; suggestions: string[] };

function UniDetail() {
  const u = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const [saved, setSaved] = useState(false);
  const [pred, setPred] = useState<Prediction | null>(null);
  const [predLoading, setPredLoading] = useState(false);
  const predictFn = useServerFn(predictAdmissionChance);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("saved_items").select("id")
        .eq("user_id", user.id).eq("item_type", "university").eq("item_id", u.id).maybeSingle();
      setSaved(!!data);
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/universities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Universities
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
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {[u.city, u.country].filter(Boolean).join(", ")}
              {u.continent && <span>· {u.continent}</span>}
              {u.campus_type && <span>· {u.campus_type} campus</span>}
            </div>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{u.name}</h1>
            {u.description && <p className="mt-3 text-muted-foreground">{u.description}</p>}
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

          {/* Cost card */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cost & Requirements</h3>
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
          </div>
        </div>

        {/* AI predict */}
        <section className="mt-8 glass rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">AI Admission Chance</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Predicts your fit using your profile vs. this university's benchmarks.</p>
            </div>
            <button onClick={runPredict} disabled={predLoading}
              className="inline-flex items-center gap-2 rounded-full bg-nebula px-4 py-2 text-sm font-medium text-primary-foreground glow disabled:opacity-60">
              {predLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
              {predLoading ? "Analyzing…" : "Predict my chances"}
            </button>
          </div>
          {pred && (
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="glass rounded-xl p-4 text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Chance</p>
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

        {/* Sections */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {(u.faculties?.length ?? 0) > 0 && (
            <Section icon={Building2} title="Faculties">
              <div className="flex flex-wrap gap-2">{u.faculties!.map((f: string) => <Chip key={f}>{f}</Chip>)}</div>
            </Section>
          )}
          {(u.programs?.length ?? 0) > 0 && (
            <Section icon={GraduationCap} title="Available Programs">
              <div className="flex flex-wrap gap-2">{u.programs!.map((p: string) => <Chip key={p}>{p}</Chip>)}</div>
              {(u.levels?.length ?? 0) > 0 && (
                <div className="mt-3 text-xs text-muted-foreground">Levels: {u.levels!.join(" · ")}</div>
              )}
            </Section>
          )}
          {(u.required_documents?.length ?? 0) > 0 && (
            <Section icon={Landmark} title="Required Documents">
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                {u.required_documents!.map((d: string) => <li key={d}>{d}</li>)}
              </ul>
              {u.admission_notes && <p className="mt-3 text-sm text-muted-foreground">{u.admission_notes}</p>}
            </Section>
          )}
          {(u.scholarships_info || (u.research_areas?.length ?? 0) > 0) && (
            <Section icon={Award} title="Scholarships & Research">
              {u.scholarships_info && <p className="text-sm text-muted-foreground">{u.scholarships_info}</p>}
              {(u.research_areas?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">{u.research_areas!.map((r: string) => <Chip key={r}>{r}</Chip>)}</div>
              )}
              {u.exchange_partners && <p className="mt-3 text-xs text-muted-foreground">Exchange: {u.exchange_partners}</p>}
            </Section>
          )}
          {(u.visa_info || u.work_during_study || u.post_study_work || u.pr_pathway) && (
            <Section icon={Globe} title="Visa & Work">
              {u.visa_info && <KVBlock k="Visa" v={u.visa_info} />}
              {u.work_during_study && <KVBlock k="Work during study" v={u.work_during_study} />}
              {u.post_study_work && <KVBlock k="Post-study work" v={u.post_study_work} />}
              {u.pr_pathway && <KVBlock k="PR pathway" v={u.pr_pathway} />}
            </Section>
          )}
          {(u.notable_alumni?.length ?? 0) > 0 && (
            <Section icon={Trophy} title="Notable Alumni">
              <div className="flex flex-wrap gap-2">{u.notable_alumni!.map((a: string) => <Chip key={a}>{a}</Chip>)}</div>
              {u.employability_rank && <p className="mt-3 text-xs text-muted-foreground">Employability rank: #{u.employability_rank}</p>}
            </Section>
          )}
        </div>

        {mapUrl && (
          <section className="mt-8">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Location</h3>
            <div className="mt-3 overflow-hidden rounded-2xl border border-border">
              <iframe title="Campus map" src={mapUrl} className="h-72 w-full" loading="lazy" />
            </div>
          </section>
        )}
      </main>
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
