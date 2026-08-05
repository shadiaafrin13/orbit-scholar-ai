import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { academicPlanner, ecaAnalyzer, productivityCoach } from "@/lib/atlas-ai.functions";
import { toast } from "sonner";
import {
  ArrowLeft, Award, BookOpen, Calculator, Check, Clock, ExternalLink, Flame, GraduationCap,
  Loader2, Pause, Play, Plus, RotateCcw, Sparkles, Trash2, Trophy,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/eca")({
  head: () => ({
    meta: [
      { title: "Academic & ECA Hub — Atlas" },
      { name: "description", content: "Plan your semesters, lift your GPA, track study focus and build a standout extracurricular profile." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EcaPage,
});

type Course = { id: string; term: string | null; year: number | null; name: string; code: string | null; credits: number | null; grade: string | null; grade_points: number | null; attendance_pct: number | null; status: string };
type Act = { id: string; title: string; category: string | null; role: string | null; organization: string | null; start_date: string | null; end_date: string | null; hours_per_week: number | null; impact: string | null; evidence_url: string | null };
type Achievement = { id: string; title: string; kind: string | null; issuer: string | null; level: string | null; awarded_on: string | null; hours: number | null; description: string | null; evidence_url: string | null };
type Habit = { id: string; name: string; target_per_week: number; log: string[] };
type Session = { id: string; subject: string | null; kind: string; minutes: number; occurred_at: string };
type Opportunity = { id: string; name: string; organizer: string | null; category: string | null; type: string | null; country: string | null; mode: string | null; level: string | null; age_range: string | null; deadline: string | null; funding: string | null; fee: string | null; link: string | null; description: string | null };

const ECA_TREE: Record<string, string[]> = {
  Leadership: ["Student Council", "School Prefect", "Club President", "Team Leader", "Community Leadership"],
  "Community Service": ["Volunteering", "NGO Work", "Social Impact Project", "Charity Event", "Community Development"],
  "Academic Competitions": ["Olympiad", "Debate", "Model United Nations", "Science Fair", "Mathematics Competition", "Quiz Competition", "Research Competition"],
  Technology: ["Programming", "Robotics", "Artificial Intelligence", "Data Science", "Cybersecurity", "Open Source", "Hackathon"],
  Entrepreneurship: ["Startup Project", "Business Competition", "Innovation Challenge", "Incubator", "Product Development"],
  "Arts & Creativity": ["Music", "Dance", "Drama", "Photography", "Painting", "Graphic Design", "Content Creation"],
  Sports: ["Individual Sport", "Team Sport", "National Competition", "International Competition"],
  Research: ["Undergraduate Research", "Independent Research", "Research Internship", "Publication", "Conference Presentation"],
};
const CATEGORIES = Object.keys(ECA_TREE);
const ACHIEVEMENT_KINDS = ["Certificate", "Award", "Medal", "Competition Result", "Project", "Portfolio", "Leadership Experience", "Volunteer Hours", "Recommendation Letter"];
const GRADE_MAP: Record<string, number> = { "A+": 4, A: 4, "A-": 3.7, "B+": 3.3, B: 3, "B-": 2.7, "C+": 2.3, C: 2, "C-": 1.7, D: 1, F: 0 };
const TABS = ["Planner", "GPA", "Focus", "Activities", "Opportunities", "Achievements", "AI Analyzer"] as const;
type Tab = (typeof TABS)[number];

const card = "glass rounded-2xl p-5";
const input = "rounded-xl border border-input bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary";
const btn = "inline-flex items-center gap-1.5 rounded-full bg-nebula px-4 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-50";
const ghost = "rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary";

function Bar({ v, label }: { v: number; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{Math.round(v)}</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-nebula" style={{ width: `${Math.min(100, v)}%` }} /></div>
    </div>
  );
}

function EcaPage() {
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState<Tab>("Planner");

  const [courses, setCourses] = useState<Course[]>([]);
  const [acts, setActs] = useState<Act[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [ops, setOps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, a, ac, h, s, o] = await Promise.all([
        supabase.from("courses").select("*").eq("user_id", user.id).order("year", { ascending: false }),
        supabase.from("activities").select("*").eq("user_id", user.id).order("start_date", { ascending: false, nullsFirst: false }),
        supabase.from("achievements").select("*").eq("user_id", user.id).order("awarded_on", { ascending: false, nullsFirst: false }),
        supabase.from("habits").select("*").eq("user_id", user.id).eq("active", true),
        supabase.from("study_sessions").select("*").eq("user_id", user.id).order("occurred_at", { ascending: false }).limit(120),
        supabase.from("eca_opportunities").select("*").order("deadline", { ascending: true, nullsFirst: false }),
      ]);
      setCourses((c.data as Course[]) ?? []);
      setActs((a.data as Act[]) ?? []);
      setAchievements((ac.data as Achievement[]) ?? []);
      setHabits(((h.data as any[]) ?? []).map((x) => ({ ...x, log: Array.isArray(x.log) ? x.log : [] })));
      setSessions((s.data as Session[]) ?? []);
      setOps((o.data as Opportunity[]) ?? []);
      setLoading(false);
    })();
  }, [user.id]);

  /* ---------- GPA ---------- */
  const gpa = useMemo(() => {
    const done = courses.filter((c) => c.grade_points != null && (c.credits ?? 0) > 0);
    const cr = done.reduce((s, c) => s + Number(c.credits), 0);
    if (!cr) return { gpa: 0, credits: 0 };
    return { gpa: done.reduce((s, c) => s + Number(c.grade_points) * Number(c.credits), 0) / cr, credits: cr };
  }, [courses]);

  const attendance = useMemo(() => {
    const v = courses.filter((c) => c.attendance_pct != null);
    return v.length ? v.reduce((s, c) => s + Number(c.attendance_pct), 0) / v.length : 0;
  }, [courses]);

  const focusThisWeek = useMemo(() => {
    const start = Date.now() - 7 * 864e5;
    return sessions.filter((s) => new Date(s.occurred_at).getTime() > start).reduce((t, s) => t + s.minutes, 0);
  }, [sessions]);

  const impactScore = useMemo(() => {
    if (!acts.length) return 0;
    const cats = new Set(acts.map((a) => a.category)).size;
    const hours = acts.reduce((s, a) => s + (a.hours_per_week ?? 0), 0);
    const leads = acts.filter((a) => /lead|president|captain|founder|head/i.test(a.role ?? "")).length;
    return Math.min(100, cats * 8 + hours * 1.5 + leads * 8 + acts.length * 3 + achievements.length * 2);
  }, [acts, achievements]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M05 · Academic & ECA</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow"><Trophy className="h-5 w-5 text-primary-foreground" /></div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">Academic Development & ECA Hub</span></h1>
            <p className="text-sm text-muted-foreground">Plan semesters, lift your GPA, run focus sessions and build a profile top universities notice.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className={card}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">CGPA</p><p className="mt-1 text-2xl font-semibold">{gpa.gpa.toFixed(2)}<span className="text-sm text-muted-foreground">/4.0</span></p><p className="text-[11px] text-muted-foreground">{gpa.credits} credits</p></div>
          <div className={card}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Attendance</p><p className="mt-1 text-2xl font-semibold">{attendance ? `${Math.round(attendance)}%` : "—"}</p></div>
          <div className={card}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Focus this week</p><p className="mt-1 text-2xl font-semibold">{Math.floor(focusThisWeek / 60)}h {focusThisWeek % 60}m</p></div>
          <div className={card}><p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><Sparkles className="h-3 w-3" /> ECA impact</p><p className="mt-1 text-2xl font-semibold">{Math.round(impactScore)}<span className="text-sm text-muted-foreground">/100</span></p></div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full border px-3.5 py-1.5 text-xs ${tab === t ? "border-primary bg-nebula text-primary-foreground" : "border-border glass"}`}>{t}</button>
          ))}
        </div>

        {loading ? (
          <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="mt-6">
            {tab === "Planner" && <Planner userId={user.id} courses={courses} setCourses={setCourses} />}
            {tab === "GPA" && <GpaTab courses={courses} gpa={gpa.gpa} />}
            {tab === "Focus" && <FocusTab userId={user.id} habits={habits} setHabits={setHabits} sessions={sessions} setSessions={setSessions} />}
            {tab === "Activities" && <ActivitiesTab userId={user.id} acts={acts} setActs={setActs} />}
            {tab === "Opportunities" && <OpportunitiesTab ops={ops} />}
            {tab === "Achievements" && <AchievementsTab userId={user.id} items={achievements} setItems={setAchievements} />}
            {tab === "AI Analyzer" && <AnalyzerTab />}
          </div>
        )}
      </main>
    </div>
  );
}

/* ==================== Planner ==================== */
function Planner({ userId, courses, setCourses }: { userId: string; courses: Course[]; setCourses: (c: Course[]) => void }) {
  const year = new Date().getFullYear();
  const [f, setF] = useState({ name: "", code: "", term: "Fall", year: String(year), credits: "3", grade: "", attendance_pct: "" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return;
    const gp = f.grade ? GRADE_MAP[f.grade.toUpperCase()] ?? null : null;
    const { data, error } = await supabase.from("courses").insert({
      user_id: userId, name: f.name.trim(), code: f.code || null, term: f.term, year: Number(f.year),
      credits: Number(f.credits) || 3, grade: f.grade || null, grade_points: gp,
      attendance_pct: f.attendance_pct ? Number(f.attendance_pct) : null,
      status: gp == null ? "in_progress" : "completed",
    }).select().single();
    if (error) return toast.error(error.message);
    setCourses([data as Course, ...courses]);
    setF({ ...f, name: "", code: "", grade: "", attendance_pct: "" });
  }
  async function setGrade(c: Course, grade: string) {
    const gp = GRADE_MAP[grade.toUpperCase()] ?? null;
    const { error } = await supabase.from("courses").update({ grade: grade || null, grade_points: gp, status: gp == null ? "in_progress" : "completed" }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setCourses(courses.map((x) => (x.id === c.id ? { ...x, grade, grade_points: gp, status: gp == null ? "in_progress" : "completed" } : x)));
  }
  async function remove(id: string) {
    await supabase.from("courses").delete().eq("id", id);
    setCourses(courses.filter((c) => c.id !== id));
  }

  const terms = Array.from(new Set(courses.map((c) => `${c.term ?? "Term"} ${c.year ?? ""}`.trim())));

  return (
    <div className="space-y-6">
      <form onSubmit={add} className={`${card} grid gap-3 sm:grid-cols-6`}>
        <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Course name" className={`${input} sm:col-span-2`} />
        <input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="Code" className={input} />
        <select value={f.term} onChange={(e) => setF({ ...f, term: e.target.value })} className={input}>
          {["Fall", "Spring", "Summer", "Winter", "Semester 1", "Semester 2", "Year"].map((t) => <option key={t}>{t}</option>)}
        </select>
        <input type="number" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} placeholder="Year" className={input} />
        <input type="number" step="0.5" value={f.credits} onChange={(e) => setF({ ...f, credits: e.target.value })} placeholder="Credits" className={input} />
        <input value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} placeholder="Grade (A, B+…)" className={input} />
        <input type="number" value={f.attendance_pct} onChange={(e) => setF({ ...f, attendance_pct: e.target.value })} placeholder="Attendance %" className={input} />
        <button className={`${btn} sm:col-span-2`}><Plus className="h-3.5 w-3.5" /> Add course</button>
      </form>

      {terms.length === 0 && <p className="text-sm text-muted-foreground">Add your courses to unlock the GPA calculator, credit tracker and improvement planner.</p>}

      {terms.map((t) => {
        const rows = courses.filter((c) => `${c.term ?? "Term"} ${c.year ?? ""}`.trim() === t);
        const cr = rows.reduce((s, c) => s + Number(c.credits ?? 0), 0);
        const graded = rows.filter((c) => c.grade_points != null);
        const termGpa = graded.length ? graded.reduce((s, c) => s + Number(c.grade_points) * Number(c.credits ?? 0), 0) / graded.reduce((s, c) => s + Number(c.credits ?? 0), 0) : 0;
        return (
          <div key={t} className={card}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t}</h3>
              <p className="text-xs text-muted-foreground">{cr} credits · term GPA {termGpa ? termGpa.toFixed(2) : "—"}</p>
            </div>
            <div className="mt-3 space-y-2">
              {rows.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 px-3 py-2 text-sm">
                  <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 min-w-[140px] font-medium">{c.name} {c.code && <span className="text-xs text-muted-foreground">({c.code})</span>}</span>
                  <span className="text-xs text-muted-foreground">{c.credits} cr</span>
                  {c.attendance_pct != null && <span className={`text-xs ${Number(c.attendance_pct) < 75 ? "text-destructive" : "text-muted-foreground"}`}>{c.attendance_pct}% attendance</span>}
                  <input value={c.grade ?? ""} onChange={(e) => setGrade(c, e.target.value)} placeholder="grade" className="w-20 rounded-lg border border-input bg-background/40 px-2 py-1 text-xs" />
                  <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ==================== GPA ==================== */
function GpaTab({ courses, gpa }: { courses: Course[]; gpa: number }) {
  const run = useServerFn(academicPlanner);
  const [target, setTarget] = useState("3.80");
  const [scale, setScale] = useState("4.0");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);

  const credits = courses.filter((c) => c.grade_points != null).reduce((s, c) => s + Number(c.credits ?? 0), 0);
  const remaining = courses.filter((c) => c.grade_points == null).reduce((s, c) => s + Number(c.credits ?? 0), 0);
  const needed = remaining > 0 ? (Number(target) * (credits + remaining) - gpa * credits) / remaining : null;

  async function analyze() {
    setBusy(true);
    try { setRes(await run({ data: { targetGpa: target, scale } })); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className={card}>
        <h3 className="flex items-center gap-2 font-semibold"><Calculator className="h-4 w-4" /> GPA / CGPA calculator</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div><p className="text-xs text-muted-foreground">Current CGPA</p><p className="text-3xl font-bold text-gradient">{gpa.toFixed(2)}</p></div>
          <div><p className="text-xs text-muted-foreground">Credits earned</p><p className="text-3xl font-bold">{credits}</p></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs text-muted-foreground">Target CGPA<input value={target} onChange={(e) => setTarget(e.target.value)} className={`${input} mt-1 w-full`} /></label>
          <label className="text-xs text-muted-foreground">Scale<select value={scale} onChange={(e) => setScale(e.target.value)} className={`${input} mt-1 w-full`}><option>4.0</option><option>5.0</option><option>10.0</option><option>100</option></select></label>
        </div>
        <div className="mt-4 rounded-xl border border-primary/40 bg-nebula/10 p-4 text-sm">
          {remaining > 0 && needed != null ? (
            <p>To reach <b>{target}</b> you need an average of <b>{needed.toFixed(2)}</b> across your {remaining} remaining credits. {needed > 4 ? "That is above the maximum — extend your plan over more terms." : "That is achievable."}</p>
          ) : (
            <p className="text-muted-foreground">Add in-progress courses (no grade yet) to see what average you need.</p>
          )}
        </div>
        <button onClick={analyze} disabled={busy} className={`${btn} mt-4`}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} AI improvement plan</button>
      </div>

      <div className={card}>
        <h3 className="font-semibold">AI GPA improvement planner</h3>
        {!res && <p className="mt-3 text-sm text-muted-foreground">Run the planner to get course-by-course levers, a weekly plan and an academic success prediction.</p>}
        {res && (
          <div className="mt-3 space-y-3 text-sm">
            <p>{res.currentAssessment}</p>
            {res.successProbability != null && <Bar v={Number(res.successProbability)} label={`Success probability · achievable ${res.achievableGpa ?? "—"}`} />}
            {(res.levers ?? []).map((l: any, i: number) => (
              <div key={i} className="rounded-xl border border-border/60 p-3"><p className="font-medium">{l.course} <span className="text-primary">{l.gain}</span></p><p className="text-xs text-muted-foreground">{l.action}</p></div>
            ))}
            {(res.weeklyPlan ?? []).length > 0 && <ul className="list-disc pl-5 text-xs text-muted-foreground">{res.weeklyPlan.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>}
            {(res.monthlyMilestones ?? []).map((m: any, i: number) => <p key={i} className="text-xs"><b>{m.month}:</b> {m.goal}</p>)}
            {(res.risks ?? []).length > 0 && <p className="text-xs text-destructive">Risks: {res.risks.join(" · ")}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================== Focus ==================== */
function FocusTab({ userId, habits, setHabits, sessions, setSessions }: { userId: string; habits: Habit[]; setHabits: (h: Habit[]) => void; sessions: Session[]; setSessions: (s: Session[]) => void }) {
  const coach = useServerFn(productivityCoach);
  const [minutes, setMinutes] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [subject, setSubject] = useState("");
  const [habitName, setHabitName] = useState("");
  const [report, setReport] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => setLeft((l) => (l <= 1 ? 0 : l - 1)), 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [running]);

  useEffect(() => {
    if (left === 0 && running) { setRunning(false); void logSession(minutes); toast.success("Focus session complete"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  async function logSession(mins: number) {
    const { data, error } = await supabase.from("study_sessions").insert({ user_id: userId, minutes: mins, subject: subject || null, kind: "pomodoro" }).select().single();
    if (error) return toast.error(error.message);
    setSessions([data as Session, ...sessions]);
    setLeft(minutes * 60);
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!habitName.trim()) return;
    const { data, error } = await supabase.from("habits").insert({ user_id: userId, name: habitName.trim() }).select().single();
    if (error) return toast.error(error.message);
    setHabits([...habits, { ...(data as any), log: [] }]);
    setHabitName("");
  }
  async function toggleToday(h: Habit) {
    const today = new Date().toISOString().slice(0, 10);
    const log = h.log.includes(today) ? h.log.filter((d) => d !== today) : [...h.log, today];
    const { error } = await supabase.from("habits").update({ log }).eq("id", h.id);
    if (error) return toast.error(error.message);
    setHabits(habits.map((x) => (x.id === h.id ? { ...x, log } : x)));
  }
  async function removeHabit(id: string) {
    await supabase.from("habits").delete().eq("id", id);
    setHabits(habits.filter((h) => h.id !== id));
  }
  async function runReport() {
    setBusy(true);
    try { setReport(await coach({})); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 864e5).toISOString().slice(0, 10);
    return { d, mins: sessions.filter((s) => s.occurred_at.slice(0, 10) === d).reduce((t, s) => t + s.minutes, 0) };
  });
  const max = Math.max(60, ...last7.map((x) => x.mins));
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className={card}>
        <h3 className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4" /> Pomodoro & focus sessions</h3>
        <p className="mt-6 text-center text-6xl font-bold tabular-nums text-gradient">{mm}:{ss}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {[15, 25, 45, 60].map((m) => (
            <button key={m} onClick={() => { setMinutes(m); setLeft(m * 60); setRunning(false); }} className={`${ghost} ${minutes === m ? "border-primary text-primary" : ""}`}>{m}m</button>
          ))}
        </div>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What are you working on?" className={`${input} mt-4 w-full`} />
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => setRunning(!running)} className={btn}>{running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} {running ? "Pause" : "Start"}</button>
          <button onClick={() => { setRunning(false); setLeft(minutes * 60); }} className={ghost}><RotateCcw className="h-3.5 w-3.5" /></button>
          <button onClick={() => logSession(minutes)} className={ghost}>Log {minutes}m manually</button>
        </div>
        <div className="mt-6 flex h-24 items-end gap-2">
          {last7.map((x) => (
            <div key={x.d} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t bg-nebula" style={{ height: `${(x.mins / max) * 100}%`, minHeight: x.mins ? 4 : 1 }} />
              <span className="text-[10px] text-muted-foreground">{new Date(x.d).toLocaleDateString(undefined, { weekday: "narrow" })}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className={card}>
          <h3 className="flex items-center gap-2 font-semibold"><Flame className="h-4 w-4" /> Habit tracker</h3>
          <form onSubmit={addHabit} className="mt-3 flex gap-2">
            <input value={habitName} onChange={(e) => setHabitName(e.target.value)} placeholder="e.g. 30 min IELTS reading" className={`${input} flex-1`} />
            <button className={btn}><Plus className="h-3.5 w-3.5" /></button>
          </form>
          <div className="mt-3 space-y-2">
            {habits.map((h) => {
              const today = new Date().toISOString().slice(0, 10);
              const week = h.log.filter((d) => new Date(d).getTime() > Date.now() - 7 * 864e5).length;
              return (
                <div key={h.id} className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2">
                  <button onClick={() => toggleToday(h)} className={`flex h-5 w-5 items-center justify-center rounded-md border ${h.log.includes(today) ? "border-primary bg-nebula" : "border-border"}`}>
                    {h.log.includes(today) && <Check className="h-3 w-3 text-primary-foreground" />}
                  </button>
                  <span className="flex-1 text-sm">{h.name}</span>
                  <span className="text-xs text-muted-foreground">{week}/{h.target_per_week} this week</span>
                  <button onClick={() => removeHabit(h.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              );
            })}
            {habits.length === 0 && <p className="text-xs text-muted-foreground">No habits yet.</p>}
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">AI weekly progress report</h3>
            <button onClick={runReport} disabled={busy} className={btn}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Generate</button>
          </div>
          {report && (
            <div className="mt-3 space-y-2 text-sm">
              <p className="font-medium">{report.headline}</p>
              {(report.wins ?? []).map((w: string, i: number) => <p key={i} className="text-xs text-muted-foreground">✓ {w}</p>)}
              {(report.leaks ?? []).map((w: string, i: number) => <p key={i} className="text-xs text-destructive">! {w}</p>)}
              {(report.nextWeek ?? []).map((d: any, i: number) => <p key={i} className="text-xs"><b>{d.day}:</b> {d.plan}</p>)}
              {(report.habitAdvice ?? []).map((h: string, i: number) => <p key={i} className="text-xs text-muted-foreground">→ {h}</p>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== Activities ==================== */
function ActivitiesTab({ userId, acts, setActs }: { userId: string; acts: Act[]; setActs: (a: Act[]) => void }) {
  const [cat, setCat] = useState(CATEGORIES[0]!);
  const [f, setF] = useState({ title: "", sub: ECA_TREE[CATEGORIES[0]!]![0]!, role: "", organization: "", start_date: "", end_date: "", hours_per_week: "", impact: "", evidence_url: "" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return;
    const { data, error } = await supabase.from("activities").insert({
      user_id: userId, title: f.title.trim(), category: `${cat} · ${f.sub}`, role: f.role || null, organization: f.organization || null,
      start_date: f.start_date || null, end_date: f.end_date || null,
      hours_per_week: f.hours_per_week ? Number(f.hours_per_week) : null, impact: f.impact || null, evidence_url: f.evidence_url || null,
    }).select().single();
    if (error) return toast.error(error.message);
    setActs([data as Act, ...acts]);
    setF({ ...f, title: "", role: "", organization: "", hours_per_week: "", impact: "", evidence_url: "" });
  }
  async function remove(id: string) {
    await supabase.from("activities").delete().eq("id", id);
    setActs(acts.filter((a) => a.id !== id));
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className={`${card} grid gap-3 sm:grid-cols-3`}>
        <input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Activity title" className={`${input} sm:col-span-3`} />
        <select value={cat} onChange={(e) => { setCat(e.target.value); setF({ ...f, sub: ECA_TREE[e.target.value]![0]! }); }} className={input}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={f.sub} onChange={(e) => setF({ ...f, sub: e.target.value })} className={input}>
          {ECA_TREE[cat]!.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="Role (e.g. President)" className={input} />
        <input value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} placeholder="Organization" className={input} />
        <input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} className={input} />
        <input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} className={input} />
        <input type="number" value={f.hours_per_week} onChange={(e) => setF({ ...f, hours_per_week: e.target.value })} placeholder="Hours / week" className={input} />
        <input value={f.evidence_url} onChange={(e) => setF({ ...f, evidence_url: e.target.value })} placeholder="Evidence link" className={`${input} sm:col-span-2`} />
        <textarea value={f.impact} onChange={(e) => setF({ ...f, impact: e.target.value })} placeholder="Impact — use numbers (raised $2,400; led 18 members)" className={`${input} sm:col-span-3`} rows={2} />
        <button className={btn}><Plus className="h-3.5 w-3.5" /> Add activity</button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {acts.map((a) => (
          <div key={a.id} className={card}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.category}{a.role ? ` · ${a.role}` : ""}{a.organization ? ` · ${a.organization}` : ""}</p>
              </div>
              <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
            {a.impact && <p className="mt-2 text-sm">{a.impact}</p>}
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              {a.hours_per_week != null && <span>{a.hours_per_week} h/week</span>}
              {a.start_date && <span>· from {new Date(a.start_date).toLocaleDateString()}</span>}
              {a.evidence_url && <a href={a.evidence_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">· evidence</a>}
            </div>
          </div>
        ))}
        {acts.length === 0 && <p className="text-sm text-muted-foreground">No activities logged yet.</p>}
      </div>
    </div>
  );
}

/* ==================== Opportunities ==================== */
function OpportunitiesTab({ ops }: { ops: Opportunity[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [country, setCountry] = useState("All");
  const [mode, setMode] = useState("All");
  const [level, setLevel] = useState("All");
  const [fundedOnly, setFundedOnly] = useState(false);

  const cats = ["All", ...Array.from(new Set(ops.map((o) => o.category).filter(Boolean) as string[]))];
  const countries = ["All", ...Array.from(new Set(ops.map((o) => o.country).filter(Boolean) as string[]))];
  const levels = ["All", ...Array.from(new Set(ops.map((o) => o.level).filter(Boolean) as string[]))];

  const list = ops.filter((o) =>
    (cat === "All" || o.category === cat) &&
    (country === "All" || o.country === country) &&
    (mode === "All" || o.mode === mode) &&
    (level === "All" || o.level === level) &&
    (!fundedOnly || /fund|scholar|stipend|prize|free/i.test(o.funding ?? "")) &&
    (!q || `${o.name} ${o.organizer} ${o.type} ${o.description}`.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className={`${card} grid gap-3 sm:grid-cols-3`}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search competitions, hackathons, summer schools…" className={`${input} sm:col-span-3`} />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={input}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className={input}>{countries.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={input}>{levels.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={mode} onChange={(e) => setMode(e.target.value)} className={input}>{["All", "Online", "Offline", "Hybrid"].map((c) => <option key={c}>{c}</option>)}</select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={fundedOnly} onChange={(e) => setFundedOnly(e.target.checked)} /> Funded / free only</label>
        <p className="self-center text-xs text-muted-foreground">{list.length} opportunities</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((o) => (
          <div key={o.id} className={card}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{o.name}</p>
                <p className="text-xs text-muted-foreground">{o.organizer} · {o.category} · {o.type}</p>
              </div>
              {o.link && <a href={o.link} target="_blank" rel="noreferrer" className="shrink-0 text-primary"><ExternalLink className="h-4 w-4" /></a>}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{o.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
              {[o.country, o.mode, o.level, o.age_range, o.funding, o.fee].filter(Boolean).map((t, i) => (
                <span key={i} className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">{t}</span>
              ))}
              {o.deadline && <span className="rounded-full border border-primary/50 px-2 py-0.5 text-primary">Deadline {new Date(o.deadline).toLocaleDateString()}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================== Achievements ==================== */
function AchievementsTab({ userId, items, setItems }: { userId: string; items: Achievement[]; setItems: (a: Achievement[]) => void }) {
  const [f, setF] = useState({ title: "", kind: ACHIEVEMENT_KINDS[0]!, issuer: "", level: "School", awarded_on: "", hours: "", description: "", evidence_url: "" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return;
    const { data, error } = await supabase.from("achievements").insert({
      user_id: userId, title: f.title.trim(), kind: f.kind, issuer: f.issuer || null, level: f.level,
      awarded_on: f.awarded_on || null, hours: f.hours ? Number(f.hours) : null,
      description: f.description || null, evidence_url: f.evidence_url || null,
    }).select().single();
    if (error) return toast.error(error.message);
    setItems([data as Achievement, ...items]);
    setF({ ...f, title: "", issuer: "", awarded_on: "", hours: "", description: "", evidence_url: "" });
  }
  async function remove(id: string) {
    await supabase.from("achievements").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
  }

  const volunteerHours = items.reduce((s, i) => s + (i.hours ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={card}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Records</p><p className="mt-1 text-2xl font-semibold">{items.length}</p></div>
        <div className={card}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Logged hours</p><p className="mt-1 text-2xl font-semibold">{volunteerHours}</p></div>
        <div className={card}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">International level</p><p className="mt-1 text-2xl font-semibold">{items.filter((i) => i.level === "International").length}</p></div>
      </div>

      <form onSubmit={add} className={`${card} grid gap-3 sm:grid-cols-3`}>
        <input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title" className={`${input} sm:col-span-2`} />
        <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={input}>{ACHIEVEMENT_KINDS.map((k) => <option key={k}>{k}</option>)}</select>
        <input value={f.issuer} onChange={(e) => setF({ ...f, issuer: e.target.value })} placeholder="Issuer / organization" className={input} />
        <select value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} className={input}>{["School", "District", "National", "International"].map((l) => <option key={l}>{l}</option>)}</select>
        <input type="date" value={f.awarded_on} onChange={(e) => setF({ ...f, awarded_on: e.target.value })} className={input} />
        <input type="number" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} placeholder="Hours (for volunteering)" className={input} />
        <input value={f.evidence_url} onChange={(e) => setF({ ...f, evidence_url: e.target.value })} placeholder="Certificate / portfolio link" className={`${input} sm:col-span-2`} />
        <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Description" rows={2} className={`${input} sm:col-span-3`} />
        <button className={btn}><Plus className="h-3.5 w-3.5" /> Add record</button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((i) => (
          <div key={i.id} className={card}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Award className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-semibold">{i.title}</p>
                  <p className="text-xs text-muted-foreground">{[i.kind, i.issuer, i.level, i.awarded_on && new Date(i.awarded_on).toLocaleDateString()].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
              <button onClick={() => remove(i.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
            {i.description && <p className="mt-2 text-sm text-muted-foreground">{i.description}</p>}
            {i.evidence_url && <a href={i.evidence_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary hover:underline">View evidence</a>}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No certificates or awards stored yet.</p>}
      </div>
    </div>
  );
}

/* ==================== AI Analyzer ==================== */
function AnalyzerTab() {
  const run = useServerFn(ecaAnalyzer);
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);

  async function go() {
    setBusy(true);
    try { setRes(await run({ data: { goal } })); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  const s = res?.scores ?? {};
  return (
    <div className="space-y-6">
      <div className={`${card} flex flex-wrap items-center gap-3`}>
        <GraduationCap className="h-5 w-5 text-primary" />
        <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Goal — e.g. CS at MIT, need-based aid" className={`${input} flex-1 min-w-[220px]`} />
        <button onClick={go} disabled={busy} className={btn}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Analyze my profile</button>
      </div>

      {res && (
        <>
          <div className={card}>
            {res.spike && <p className="mb-4 text-sm"><b>Your spike:</b> {res.spike}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <Bar v={Number(s.gpaStrength ?? 0)} label="GPA strength" />
              <Bar v={Number(s.academicCompetitiveness ?? 0)} label="Academic competitiveness" />
              <Bar v={Number(s.leadership ?? 0)} label="Leadership score" />
              <Bar v={Number(s.communityImpact ?? 0)} label="Community impact" />
              <Bar v={Number(s.researchPotential ?? 0)} label="Research potential" />
              <Bar v={Number(s.skillDevelopment ?? 0)} label="Skill development" />
              <Bar v={Number(s.overallEca ?? 0)} label="Overall ECA strength" />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className={card}>
              <h3 className="font-semibold">Strengths</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{(res.strengths ?? []).map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
              <h3 className="mt-4 font-semibold">Missing activities</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-destructive">{(res.missingActivities ?? []).map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className={card}>
              <h3 className="font-semibold">Recommended for you</h3>
              <div className="mt-2 space-y-2">
                {(res.recommended ?? []).map((r: any, i: number) => (
                  <div key={i} className="rounded-xl border border-border/60 p-3">
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.why}</p>
                    {r.deadline && <p className="text-[11px] text-primary">Deadline {r.deadline}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={card}>
            <h3 className="font-semibold">Improvement roadmap</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              {(res.roadmap ?? []).map((r: any, i: number) => (
                <div key={i}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">{r.window}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">{(r.actions ?? []).map((a: string, j: number) => <li key={j}>{a}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
