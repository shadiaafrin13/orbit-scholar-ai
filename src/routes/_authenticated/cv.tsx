import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ClipboardList, Download, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cv")({
  head: () => ({ meta: [{ title: "CV & Resume Builder — Atlas" }, { name: "robots", content: "noindex" }] }),
  component: CvPage,
});

type Cv = { id: string; template: string | null; headline: string | null; summary: string | null; content: Record<string, unknown> | null; ats_score: number | null };

function CvPage() {
  const { user } = Route.useRouteContext();
  const [cv, setCv] = useState<Cv | null>(null);
  const [education, setEducation] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [awards, setAwards] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("cvs").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        const row = data as Cv;
        setCv(row);
        const c = (row.content ?? {}) as Record<string, string>;
        setEducation(c.education ?? ""); setExperience(c.experience ?? "");
        setSkills(c.skills ?? ""); setAwards(c.awards ?? "");
      } else {
        const { data: created } = await supabase.from("cvs").insert({ user_id: user.id, template: "academic" }).select().single();
        setCv(created as Cv);
      }
    })();
  }, [user.id]);

  async function save() {
    if (!cv) return;
    const content = { education, experience, skills, awards };
    const { error } = await supabase.from("cvs").update({
      template: cv.template, headline: cv.headline, summary: cv.summary, content,
    }).eq("id", cv.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  }

  function score() {
    if (!cv) return;
    const text = [cv.summary, education, experience, skills, awards].join(" ").toLowerCase();
    const keywords = ["led", "built", "designed", "published", "awarded", "increased", "reduced", "achieved", "%", "research", "team"];
    const hits = keywords.filter((k) => text.includes(k)).length;
    const sections = [cv.headline, cv.summary, education, experience, skills, awards].filter((x) => x && x.trim().length > 5).length;
    const s = Math.min(100, hits * 6 + sections * 6);
    supabase.from("cvs").update({ ats_score: s }).eq("id", cv.id).then(({ error }) => {
      if (error) toast.error(error.message);
      else { setCv({ ...cv, ats_score: s }); toast.success(`ATS score: ${s}/100`); }
    });
  }

  function exportPrint() { window.print(); }

  if (!cv) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M14</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center gap-3 print:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
            <ClipboardList className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">CV & Resume Builder</span></h1>
            <p className="text-sm text-muted-foreground">Academic, Europass, or ATS-friendly — with a live score.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2 print:grid-cols-1">
          <section className="glass rounded-2xl p-6 space-y-3 print:hidden">
            <div className="flex items-center gap-2">
              <select value={cv.template ?? "academic"} onChange={(e) => setCv({ ...cv, template: e.target.value })}
                className="rounded-xl border border-input bg-background/40 px-3 py-2 text-sm">
                <option value="academic">Academic CV</option>
                <option value="europass">Europass</option>
                <option value="ats">ATS-friendly</option>
              </select>
              <button onClick={save} className="rounded-xl border border-border px-4 py-2 text-xs">Save</button>
              <button onClick={score} className="inline-flex items-center gap-1 rounded-xl bg-nebula px-4 py-2 text-xs font-semibold text-primary-foreground glow">
                <Sparkles className="h-3 w-3" /> Score
              </button>
              <button onClick={exportPrint} className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2 text-xs">
                <Download className="h-3 w-3" /> PDF
              </button>
            </div>
            <input value={cv.headline ?? ""} onChange={(e) => setCv({ ...cv, headline: e.target.value })}
              placeholder="Headline (e.g. Aspiring computational biologist)" className="w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
            <textarea value={cv.summary ?? ""} onChange={(e) => setCv({ ...cv, summary: e.target.value })}
              rows={3} placeholder="Summary" className="w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
            <textarea value={education} onChange={(e) => setEducation(e.target.value)} rows={4} placeholder="Education (one per line)"
              className="w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
            <textarea value={experience} onChange={(e) => setExperience(e.target.value)} rows={5} placeholder="Experience — use action verbs & metrics"
              className="w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
            <textarea value={skills} onChange={(e) => setSkills(e.target.value)} rows={2} placeholder="Skills (comma-separated)"
              className="w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
            <textarea value={awards} onChange={(e) => setAwards(e.target.value)} rows={3} placeholder="Awards & honors"
              className="w-full rounded-xl border border-input bg-background/40 px-3 py-2 text-sm" />
            {cv.ats_score != null && (
              <p className="rounded-xl border border-primary/40 bg-nebula/10 p-3 text-xs">ATS score: <span className="font-semibold">{cv.ats_score}/100</span> — add measurable impact and role-specific keywords to boost.</p>
            )}
          </section>

          <section className="glass rounded-2xl p-8 text-sm">
            <h2 className="text-2xl font-bold">{cv.headline || "Your name"}</h2>
            <p className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">{cv.template} Template</p>
            {cv.summary && <p className="mt-4">{cv.summary}</p>}
            {education && <Block title="Education" body={education} />}
            {experience && <Block title="Experience" body={experience} />}
            {skills && <Block title="Skills" body={skills} />}
            {awards && <Block title="Awards" body={awards} />}
          </section>
        </div>
      </main>
    </div>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">{title}</h3>
      <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{body}</pre>
    </div>
  );
}
