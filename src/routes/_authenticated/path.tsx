import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Compass, Loader2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/path")({
  head: () => ({
    meta: [
      { title: "Path Selection — Atlas" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PathPage,
});

const PATH_TYPES = [
  { id: "undergrad", label: "Undergraduate abroad", desc: "Bachelor's degree at an international university." },
  { id: "masters", label: "Master's abroad", desc: "MS, MA, MBA, MEng." },
  { id: "phd", label: "PhD", desc: "Fully funded research doctorate." },
  { id: "postdoc", label: "Postdoc", desc: "Research fellowship after PhD." },
  { id: "exchange", label: "Exchange / Semester", desc: "Erasmus+, Global UGRAD, Campus Asia." },
  { id: "research", label: "Research internship", desc: "Summer or year-long research role." },
];
const TIMELINES = ["This year", "Next intake (6–12 mo)", "1–2 years", "2+ years"];
const BUDGETS = ["Fully funded only", "Under $20k / year", "$20k–$50k / year", "Any budget"];

type PathState = {
  path_type: string | null;
  path_goal: string | null;
  path_timeline: string | null;
  path_budget: string | null;
  path_completed: boolean;
};
const EMPTY: PathState = { path_type: null, path_goal: null, path_timeline: null, path_budget: null, path_completed: false };

function PathPage() {
  const { user } = Route.useRouteContext();
  const [s, setS] = useState<PathState>(EMPTY);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("profiles").select("path_type,path_goal,path_timeline,path_budget,path_completed")
      .eq("id", user.id).maybeSingle().then(({ data }) => {
        if (data) {
          setS({ ...EMPTY, ...data });
          if (data.path_completed) setStep(4);
        }
        setLoading(false);
      });
  }, [user.id]);

  async function persist(next: PathState) {
    setS(next);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...next });
    if (error) toast.error(error.message);
  }

  async function finish() {
    const done = { ...s, path_completed: true };
    await persist(done);
    toast.success("Your academic path is set");
    setStep(4);
  }

  async function reset() {
    await persist(EMPTY);
    setStep(0);
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M03</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
            <Compass className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">Path Selection</span></h1>
            <p className="text-sm text-muted-foreground">Answer 4 questions. Get your personalized roadmap.</p>
          </div>
        </div>

        {step < 4 && (
          <div className="mt-6 flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-nebula" : "bg-secondary"}`} />
            ))}
          </div>
        )}

        <div className="mt-8 glass rounded-3xl p-8">
          {step === 0 && (
            <StepChoice title="Which path fits you?" options={PATH_TYPES.map((p) => ({ id: p.id, label: p.label, desc: p.desc }))}
              value={s.path_type} onSelect={(v) => setS({ ...s, path_type: v })} />
          )}
          {step === 1 && (
            <StepText title="What's your top goal?" placeholder="e.g. Fully funded MS in AI at a top-30 US university"
              value={s.path_goal ?? ""} onChange={(v) => setS({ ...s, path_goal: v })} />
          )}
          {step === 2 && (
            <StepChoice title="When do you want to start?" options={TIMELINES.map((t) => ({ id: t, label: t }))}
              value={s.path_timeline} onSelect={(v) => setS({ ...s, path_timeline: v })} />
          )}
          {step === 3 && (
            <StepChoice title="What's your budget?" options={BUDGETS.map((b) => ({ id: b, label: b }))}
              value={s.path_budget} onSelect={(v) => setS({ ...s, path_budget: v })} />
          )}
          {step === 4 && <Roadmap s={s} onReset={reset} />}

          {step < 4 && (
            <div className="mt-8 flex items-center justify-between">
              <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
                className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30">Back</button>
              {step < 3 ? (
                <button
                  onClick={() => { persist(s); setStep(step + 1); }}
                  disabled={!canProceed(s, step)}
                  className="inline-flex items-center gap-2 rounded-full bg-nebula px-6 py-2.5 text-sm font-semibold text-primary-foreground glow disabled:opacity-40"
                >Next <ArrowRight className="h-4 w-4" /></button>
              ) : (
                <button onClick={finish} disabled={!canProceed(s, step)}
                  className="inline-flex items-center gap-2 rounded-full bg-nebula px-6 py-2.5 text-sm font-semibold text-primary-foreground glow disabled:opacity-40">
                  Generate roadmap <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function canProceed(s: PathState, step: number) {
  if (step === 0) return !!s.path_type;
  if (step === 1) return !!(s.path_goal && s.path_goal.trim().length > 3);
  if (step === 2) return !!s.path_timeline;
  if (step === 3) return !!s.path_budget;
  return true;
}

function StepChoice({ title, options, value, onSelect }: {
  title: string; value: string | null; onSelect: (v: string) => void;
  options: { id: string; label: string; desc?: string }[];
}) {
  return (
    <>
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <button key={o.id} onClick={() => onSelect(o.id)}
            className={`rounded-2xl border p-4 text-left transition ${value === o.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
            <div className="font-medium">{o.label}</div>
            {o.desc && <div className="mt-1 text-xs text-muted-foreground">{o.desc}</div>}
          </button>
        ))}
      </div>
    </>
  );
}
function StepText({ title, placeholder, value, onChange }: { title: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <>
      <h2 className="text-xl font-semibold">{title}</h2>
      <textarea rows={4} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="mt-6 w-full rounded-xl border border-input bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary" />
    </>
  );
}

function Roadmap({ s, onReset }: { s: PathState; onReset: () => void }) {
  const type = PATH_TYPES.find((p) => p.id === s.path_type)?.label ?? "your path";
  const steps = buildSteps(s);
  return (
    <>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent">
        <Check className="h-4 w-4" /> Path locked in
      </div>
      <h2 className="mt-2 text-2xl font-bold">Your <span className="text-gradient">{type}</span> roadmap</h2>
      <p className="mt-1 text-sm text-muted-foreground">Goal: {s.path_goal}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-secondary px-3 py-1">⏱ {s.path_timeline}</span>
        <span className="rounded-full bg-secondary px-3 py-1">💰 {s.path_budget}</span>
      </div>

      <ol className="mt-8 space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nebula text-xs font-semibold text-primary-foreground">{i + 1}</div>
            <div>
              <div className="font-medium">{step.title}</div>
              <div className="text-sm text-muted-foreground">{step.desc}</div>
            </div>
          </li>
        ))}
      </ol>

      <button onClick={onReset} className="mt-8 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary">
        <RefreshCw className="h-3.5 w-3.5" /> Redo the wizard
      </button>
    </>
  );
}

function buildSteps(s: PathState) {
  const type = s.path_type;
  const base = [
    { title: "Complete your AI profile", desc: "Fill academics, tests, ECAs — powers every scoring model." },
    { title: "Shortlist target universities", desc: "Use the Global Universities module with admission odds." },
  ];
  const perType: Record<string, { title: string; desc: string }[]> = {
    undergrad: [
      { title: "Take SAT / ACT + IELTS or TOEFL", desc: "Plan test dates that fit your intake." },
      { title: "Draft Common App + supplemental essays", desc: "Use the SOP & Essay AI module." },
      { title: "Request 2–3 recommendation letters", desc: "Use the Recommendations module workflow." },
    ],
    masters: [
      { title: "Take GRE/GMAT + IELTS or TOEFL", desc: "Confirm which programs require which tests." },
      { title: "Write SOP + academic CV", desc: "Draft, review, and iterate with AI." },
      { title: "Apply for scholarships in parallel", desc: "Fulbright, Chevening, DAAD, MEXT." },
    ],
    phd: [
      { title: "Identify 5–10 potential advisors", desc: "Use the Professor Finder in PhD Admission." },
      { title: "Draft a research proposal", desc: "Refine with the Proposal Builder." },
      { title: "Send personalized outreach emails", desc: "Track responses and set follow-up dates." },
    ],
    postdoc: [
      { title: "Curate 3 core publications to highlight", desc: "Sync from ORCID / Scholar." },
      { title: "Identify labs and fellowship deadlines", desc: "Marie Skłodowska-Curie, JSPS, HFSP." },
      { title: "Draft research statement", desc: "Tailor per lab." },
    ],
    exchange: [
      { title: "Check your home university's partners", desc: "Confirm credit transfer rules." },
      { title: "Shortlist programs", desc: "Erasmus+, Global UGRAD, Campus Asia." },
      { title: "Prepare motivation letter", desc: "Short, specific, and scoped to a semester." },
    ],
    research: [
      { title: "Identify labs matching your interests", desc: "Cold-email with a project fit angle." },
      { title: "Prepare a 1-page research CV", desc: "Highlight projects and skills." },
      { title: "Apply to structured programs", desc: "DAAD RISE, MITACS, Amgen Scholars." },
    ],
  };
  const tail = [
    { title: "Financial plan", desc: `Model tuition + living cost against "${s.path_budget}".` },
    { title: "Visa & departure prep", desc: "Document checklist, interview training, arrival plan." },
  ];
  return [...base, ...(type && perType[type] ? perType[type] : []), ...tail];
}
