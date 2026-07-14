import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Sparkles, UserRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Student Profile — Atlas" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

type Profile = {
  full_name: string | null; avatar_url: string | null; phone: string | null;
  date_of_birth: string | null; gender: string | null; country: string | null; city: string | null;
  bio: string | null; languages: string[] | null;
  current_level: string | null; school_name: string | null; graduation_year: number | null;
  field_of_study: string | null; gpa: number | null;
  ielts: number | null; toefl: number | null; sat: number | null; gre: number | null; gmat: number | null;
  target_level: string | null; target_countries: string[] | null; intake_year: number | null;
  interests: string | null; activities: string | null; work_experience: string | null;
  honors: string | null; publications: string | null;
  linkedin_url: string | null; github_url: string | null; orcid: string | null; website_url: string | null;
};

const EMPTY: Profile = {
  full_name: "", avatar_url: "", phone: "", date_of_birth: null, gender: "", country: "", city: "",
  bio: "", languages: [], current_level: "", school_name: "", graduation_year: null,
  field_of_study: "", gpa: null, ielts: null, toefl: null, sat: null, gre: null, gmat: null,
  target_level: "", target_countries: [], intake_year: null,
  interests: "", activities: "", work_experience: "", honors: "", publications: "",
  linkedin_url: "", github_url: "", orcid: "", website_url: "",
};

type Section = "identity" | "academics" | "tests" | "targets" | "achievements" | "links";

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const [p, setP] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<Section>("identity");

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data, error }) => {
      if (error) toast.error(error.message);
      if (data) setP({ ...EMPTY, ...data });
      setLoading(false);
    });
  }, [user.id]);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...p });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  }

  const completeness = useMemo(() => calcCompleteness(p), [p]);
  const num = (v: string) => (v === "" ? null : Number(v));
  const initials = (p.full_name || user.email || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const tabs: { id: Section; label: string }[] = [
    { id: "identity", label: "Identity" },
    { id: "academics", label: "Academics" },
    { id: "tests", label: "Tests" },
    { id: "targets", label: "Targets" },
    { id: "achievements", label: "Achievements" },
    { id: "links", label: "Links" },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M02</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* Header card */}
        <div className="glass rounded-3xl p-6">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <Avatar url={p.avatar_url} initials={initials} />
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{p.full_name || "Your student profile"}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {[p.current_level, p.field_of_study, p.school_name].filter(Boolean).join(" · ") || "Add academics to personalise Atlas."}
              </p>
            </div>
            <div className="w-full sm:w-56">
              <div className="flex items-center justify-between text-xs"><span>Completeness</span><span className="text-muted-foreground">{completeness}%</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-nebula transition-all" style={{ width: `${completeness}%` }} />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 text-accent" /> 80%+ unlocks accurate scoring.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setSection(t.id)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                section === t.id ? "border-primary bg-nebula text-primary-foreground glow" : "border-border glass hover:border-primary/50"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-6">
          {section === "identity" && (
            <Section title="Personal information">
              <Field label="Full name"><Input value={p.full_name ?? ""} onChange={(v) => setP({ ...p, full_name: v })} /></Field>
              <Field label="Avatar URL"><Input value={p.avatar_url ?? ""} onChange={(v) => setP({ ...p, avatar_url: v })} placeholder="https://…" /></Field>
              <Field label="Phone"><Input value={p.phone ?? ""} onChange={(v) => setP({ ...p, phone: v })} placeholder="+91 98…" /></Field>
              <Field label="Date of birth"><Input type="date" value={p.date_of_birth ?? ""} onChange={(v) => setP({ ...p, date_of_birth: v || null })} /></Field>
              <Field label="Gender">
                <Select value={p.gender ?? ""} onChange={(v) => setP({ ...p, gender: v })}
                  options={["", "Female", "Male", "Non-binary", "Prefer not to say"]} />
              </Field>
              <Field label="Country"><Input value={p.country ?? ""} onChange={(v) => setP({ ...p, country: v })} placeholder="India" /></Field>
              <Field label="City"><Input value={p.city ?? ""} onChange={(v) => setP({ ...p, city: v })} placeholder="Bengaluru" /></Field>
              <Field label="Languages (comma-separated)" full>
                <Input value={(p.languages ?? []).join(", ")}
                  onChange={(v) => setP({ ...p, languages: v.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="English, Hindi, French" />
              </Field>
              <Field label="Short bio" full>
                <Textarea value={p.bio ?? ""} onChange={(v) => setP({ ...p, bio: v })}
                  placeholder="A sentence or two about you — the version AI shows recruiters and reviewers." />
              </Field>
            </Section>
          )}

          {section === "academics" && (
            <Section title="Current academics">
              <Field label="Current academic level">
                <Select value={p.current_level ?? ""} onChange={(v) => setP({ ...p, current_level: v })}
                  options={["", "High school", "Undergraduate", "Bachelor's graduate", "Master's", "PhD"]} />
              </Field>
              <Field label="School / University"><Input value={p.school_name ?? ""} onChange={(v) => setP({ ...p, school_name: v })} placeholder="IIT Bombay" /></Field>
              <Field label="Field of study"><Input value={p.field_of_study ?? ""} onChange={(v) => setP({ ...p, field_of_study: v })} placeholder="Computer Science" /></Field>
              <Field label="Graduation year"><Input type="number" value={p.graduation_year ?? ""} onChange={(v) => setP({ ...p, graduation_year: num(v) })} placeholder="2027" /></Field>
              <Field label="GPA (4.0 scale)"><Input type="number" step="0.01" value={p.gpa ?? ""} onChange={(v) => setP({ ...p, gpa: num(v) })} /></Field>
            </Section>
          )}

          {section === "tests" && (
            <Section title="Standardized tests">
              <Field label="IELTS"><Input type="number" step="0.5" value={p.ielts ?? ""} onChange={(v) => setP({ ...p, ielts: num(v) })} /></Field>
              <Field label="TOEFL"><Input type="number" value={p.toefl ?? ""} onChange={(v) => setP({ ...p, toefl: num(v) })} /></Field>
              <Field label="SAT"><Input type="number" value={p.sat ?? ""} onChange={(v) => setP({ ...p, sat: num(v) })} /></Field>
              <Field label="GRE"><Input type="number" value={p.gre ?? ""} onChange={(v) => setP({ ...p, gre: num(v) })} /></Field>
              <Field label="GMAT"><Input type="number" value={p.gmat ?? ""} onChange={(v) => setP({ ...p, gmat: num(v) })} /></Field>
            </Section>
          )}

          {section === "targets" && (
            <Section title="Where you want to go">
              <Field label="Target level">
                <Select value={p.target_level ?? ""} onChange={(v) => setP({ ...p, target_level: v })}
                  options={["", "UG", "Masters", "PhD", "Postdoc", "Exchange"]} />
              </Field>
              <Field label="Intake year"><Input type="number" value={p.intake_year ?? ""} onChange={(v) => setP({ ...p, intake_year: num(v) })} placeholder="2027" /></Field>
              <Field label="Target countries (comma-separated)" full>
                <Input value={(p.target_countries ?? []).join(", ")}
                  onChange={(v) => setP({ ...p, target_countries: v.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="USA, Germany, Japan" />
              </Field>
              <Field label="Research interests" full>
                <Textarea value={p.interests ?? ""} onChange={(v) => setP({ ...p, interests: v })} placeholder="ML systems, NLP, HCI…" />
              </Field>
            </Section>
          )}

          {section === "achievements" && (
            <Section title="Achievements & experience">
              <Field label="Extracurriculars & leadership" full>
                <Textarea value={p.activities ?? ""} onChange={(v) => setP({ ...p, activities: v })}
                  placeholder="MUN president, hackathon winner, open-source contributor…" />
              </Field>
              <Field label="Work / internship experience" full>
                <Textarea value={p.work_experience ?? ""} onChange={(v) => setP({ ...p, work_experience: v })}
                  placeholder="SDE intern at X (Jun–Aug 2025) — shipped …" />
              </Field>
              <Field label="Honors & awards" full>
                <Textarea value={p.honors ?? ""} onChange={(v) => setP({ ...p, honors: v })}
                  placeholder="Dean's List, KVPY fellow, Regeneron STS…" />
              </Field>
              <Field label="Publications" full>
                <Textarea value={p.publications ?? ""} onChange={(v) => setP({ ...p, publications: v })}
                  placeholder="Paper title — venue, year, DOI…" />
              </Field>
            </Section>
          )}

          {section === "links" && (
            <Section title="Public links">
              <Field label="LinkedIn"><Input value={p.linkedin_url ?? ""} onChange={(v) => setP({ ...p, linkedin_url: v })} placeholder="https://linkedin.com/in/…" /></Field>
              <Field label="GitHub"><Input value={p.github_url ?? ""} onChange={(v) => setP({ ...p, github_url: v })} placeholder="https://github.com/…" /></Field>
              <Field label="ORCID"><Input value={p.orcid ?? ""} onChange={(v) => setP({ ...p, orcid: v })} placeholder="0000-0002-…" /></Field>
              <Field label="Website / portfolio"><Input value={p.website_url ?? ""} onChange={(v) => setP({ ...p, website_url: v })} placeholder="https://…" /></Field>
            </Section>
          )}

          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-nebula px-6 py-3 text-sm font-semibold text-primary-foreground glow disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile
            </button>
            <Link to="/path" className="text-sm text-muted-foreground hover:text-foreground">Continue to path selection →</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Avatar({ url, initials }: { url: string | null; initials: string }) {
  return url ? (
    <img src={url} alt="" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-primary/30" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
  ) : (
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-nebula text-2xl font-bold text-primary-foreground glow">
      {initials || <UserRound className="h-8 w-8" />}
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
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
  const groups = [
    p.full_name, p.country, p.city, p.date_of_birth, p.bio,
    p.current_level, p.school_name, p.field_of_study, p.gpa,
    (p.ielts || p.toefl), (p.sat || p.gre || p.gmat),
    p.target_level, (p.target_countries?.length ? "y" : null), p.intake_year,
    p.interests, p.activities, p.work_experience, p.honors,
    (p.linkedin_url || p.github_url || p.website_url),
  ];
  const filled = groups.filter((f) => f !== null && f !== undefined && f !== "" && f !== 0).length;
  return Math.round((filled / groups.length) * 100);
}
