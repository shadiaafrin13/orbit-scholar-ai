import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Sparkles, UserRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "AI Student Profile — Atlas" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

type Profile = {
  full_name: string | null;
  country: string | null;
  current_level: string | null;
  field_of_study: string | null;
  gpa: number | null;
  ielts: number | null;
  toefl: number | null;
  sat: number | null;
  gre: number | null;
  gmat: number | null;
  target_countries: string[] | null;
  interests: string | null;
  activities: string | null;
};

const EMPTY: Profile = {
  full_name: "", country: "", current_level: "", field_of_study: "",
  gpa: null, ielts: null, toefl: null, sat: null, gre: null, gmat: null,
  target_countries: [], interests: "", activities: "",
};

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const [p, setP] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data, error }) => {
      if (error) toast.error(error.message);
      if (data) setP({ ...EMPTY, ...data });
      setLoading(false);
    });
  }, [user.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...p });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  }

  const completeness = calcCompleteness(p);
  const num = (v: string) => (v === "" ? null : Number(v));

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M02</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
            <UserRound className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">AI Student Profile</span></h1>
            <p className="text-sm text-muted-foreground">One profile. Every module reads from it.</p>
          </div>
        </div>

        <div className="mt-6 glass rounded-2xl p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Profile completeness</span>
            <span className="text-muted-foreground">{completeness}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-nebula transition-all" style={{ width: `${completeness}%` }} />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Aim for 80%+ so admission scoring is accurate.
          </p>
        </div>

        <form onSubmit={save} className="mt-8 space-y-8">
          <Section title="Basics">
            <Field label="Full name"><Input value={p.full_name ?? ""} onChange={(v) => setP({ ...p, full_name: v })} /></Field>
            <Field label="Country of residence"><Input value={p.country ?? ""} onChange={(v) => setP({ ...p, country: v })} placeholder="India" /></Field>
            <Field label="Current academic level">
              <Select value={p.current_level ?? ""} onChange={(v) => setP({ ...p, current_level: v })}
                options={["", "High school", "Undergraduate", "Bachelor's graduate", "Master's", "PhD"]} />
            </Field>
            <Field label="Field of study"><Input value={p.field_of_study ?? ""} onChange={(v) => setP({ ...p, field_of_study: v })} placeholder="Computer Science" /></Field>
          </Section>

          <Section title="Academics">
            <Field label="GPA (4.0 scale)"><Input type="number" step="0.01" value={p.gpa ?? ""} onChange={(v) => setP({ ...p, gpa: num(v) })} /></Field>
          </Section>

          <Section title="Standardized tests">
            <Field label="IELTS"><Input type="number" step="0.5" value={p.ielts ?? ""} onChange={(v) => setP({ ...p, ielts: num(v) })} /></Field>
            <Field label="TOEFL"><Input type="number" value={p.toefl ?? ""} onChange={(v) => setP({ ...p, toefl: num(v) })} /></Field>
            <Field label="SAT"><Input type="number" value={p.sat ?? ""} onChange={(v) => setP({ ...p, sat: num(v) })} /></Field>
            <Field label="GRE"><Input type="number" value={p.gre ?? ""} onChange={(v) => setP({ ...p, gre: num(v) })} /></Field>
            <Field label="GMAT"><Input type="number" value={p.gmat ?? ""} onChange={(v) => setP({ ...p, gmat: num(v) })} /></Field>
          </Section>

          <Section title="Targets & interests" full>
            <Field label="Target countries (comma-separated)" full>
              <Input
                value={(p.target_countries ?? []).join(", ")}
                onChange={(v) => setP({ ...p, target_countries: v.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder="USA, Germany, Japan"
              />
            </Field>
            <Field label="Research interests" full>
              <Textarea value={p.interests ?? ""} onChange={(v) => setP({ ...p, interests: v })} placeholder="ML systems, NLP, HCI…" />
            </Field>
            <Field label="Extracurriculars & achievements" full>
              <Textarea value={p.activities ?? ""} onChange={(v) => setP({ ...p, activities: v })} placeholder="MUN president, hackathon winner, open-source contributor…" />
            </Field>
          </Section>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-nebula px-6 py-3 text-sm font-semibold text-primary-foreground glow disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save profile
          </button>
        </form>
      </main>
    </div>
  );
}

function Section({ title, children, full }: { title: string; children: React.ReactNode; full?: boolean }) {
  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className={full ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>{children}</div>
    </section>
  );
}
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "sm:col-span-2" : ""}><label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>{children}</div>;
}
function Input(props: { value: string | number; onChange: (v: string) => void; type?: string; step?: string; placeholder?: string }) {
  return <input type={props.type ?? "text"} step={props.step} placeholder={props.placeholder} value={props.value ?? ""}
    onChange={(e) => props.onChange(e.target.value)}
    className="w-full rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />;
}
function Textarea(props: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea rows={3} placeholder={props.placeholder} value={props.value}
    onChange={(e) => props.onChange(e.target.value)}
    className="w-full rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />;
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full rounded-xl border border-input bg-background/40 px-4 py-2.5 text-sm outline-none focus:border-primary">
    {options.map((o) => <option key={o} value={o}>{o || "Select…"}</option>)}
  </select>;
}

function calcCompleteness(p: Profile): number {
  const fields = [p.full_name, p.country, p.current_level, p.field_of_study, p.gpa,
    (p.ielts || p.toefl), (p.sat || p.gre || p.gmat),
    (p.target_countries && p.target_countries.length > 0) ? "y" : null,
    p.interests, p.activities];
  const filled = fields.filter((f) => f !== null && f !== undefined && f !== "" && f !== 0).length;
  return Math.round((filled / fields.length) * 100);
}
