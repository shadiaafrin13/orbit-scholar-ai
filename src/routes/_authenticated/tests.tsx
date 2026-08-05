import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { examCoach, examRequirementMatcher, examResponseReview, vocabularyCoach } from "@/lib/atlas-ai.functions";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, ExternalLink, Languages, Loader2, Plus, Sparkles, Target, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tests")({
  head: () => ({
    meta: [
      { title: "Test Prep Hub — Atlas" },
      { name: "description", content: "IELTS, TOEFL, PTE, DET, SAT, ACT, GRE, GMAT and language exams: formats, fees, calendar, practice and AI scoring." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TestsPage,
});

type Target = { id: string; exam: string; target_score: number | null; current_score: number | null; test_date: string | null; registered: boolean; center: string | null; notes: string | null };
type Attempt = { id: string; exam: string; section: string | null; score: number | null; max_score: number | null; minutes: number | null; taken_at: string; notes: string | null };
type ExamEvent = { id: string; exam: string; event_type: string; country: string | null; event_date: string | null; note: string | null; link: string | null };

type ExamInfo = {
  name: string; group: string; overview: string; eligibility: string; accepted: string; format: string;
  sections: string[]; duration: string; scoring: string; validity: string; fee: string; documents: string;
  centers: string; online: string; retake: string; link: string;
};

const EXAMS: ExamInfo[] = [
  { name: "IELTS Academic", group: "English proficiency", overview: "The most widely accepted English test for university admission and migration.", eligibility: "No minimum qualification; 16+ recommended.", accepted: "12,000+ institutions in UK, Australia, Canada, NZ, USA, Europe.", format: "Paper or computer-delivered; face-to-face or video Speaking.", sections: ["Listening 30 min", "Reading 60 min", "Writing 60 min", "Speaking 11-14 min"], duration: "2h 45m", scoring: "Band 0-9 per section, averaged to an overall band in 0.5 steps.", validity: "2 years", fee: "USD 215-310 (varies by country)", documents: "Valid passport used at registration and on test day.", centers: "British Council, IDP and partner centres worldwide.", online: "IELTS Online available in many countries.", retake: "Unlimited retakes; One Skill Retake available in select markets.", link: "https://ielts.org" },
  { name: "IELTS UKVI", group: "English proficiency", overview: "Same test content, taken at a UK-government approved centre for visa purposes.", eligibility: "Applicants needing a UK visa (student/work).", accepted: "UK Home Office and UK universities.", format: "Identical to IELTS Academic with extra ID/security procedures.", sections: ["Listening", "Reading", "Writing", "Speaking"], duration: "2h 45m", scoring: "Band 0-9", validity: "2 years", fee: "USD 250-340", documents: "Passport only.", centers: "UKVI-approved centres only.", online: "Not available online.", retake: "Unlimited.", link: "https://ielts.org/take-a-test/test-types/ielts-for-ukvi" },
  { name: "TOEFL iBT", group: "English proficiency", overview: "ETS's academic English test, dominant for US admissions.", eligibility: "No prerequisite.", accepted: "12,500+ institutions in 160+ countries.", format: "Internet-based at a centre or Home Edition.", sections: ["Reading 35 min", "Listening 36 min", "Speaking 16 min", "Writing 29 min"], duration: "About 2 hours", scoring: "0-30 per section, total 0-120.", validity: "2 years", fee: "USD 195-330", documents: "Government-issued photo ID (passport for most).", centers: "ETS authorised centres.", online: "TOEFL iBT Home Edition, 24/7.", retake: "Any number of times, 3 days apart.", link: "https://www.ets.org/toefl" },
  { name: "PTE Academic", group: "English proficiency", overview: "Fully computer-scored English test with very fast results.", eligibility: "16+ (parental consent under 18).", accepted: "Australia, NZ, UK, Canada visas and thousands of universities.", format: "Single 2-hour computer session with an AI-scored speaking section.", sections: ["Speaking & Writing 54-67 min", "Reading 29-30 min", "Listening 30-43 min"], duration: "About 2 hours", scoring: "Global scale 10-90.", validity: "2 years", fee: "USD 200-300", documents: "Passport.", centers: "Pearson VUE centres.", online: "PTE Home available in selected countries.", retake: "After results are released; unlimited.", link: "https://www.pearsonpte.com" },
  { name: "Duolingo English Test (DET)", group: "English proficiency", overview: "Affordable at-home adaptive English test with 2-day results.", eligibility: "No prerequisite.", accepted: "5,000+ institutions, strongest in USA and Canada.", format: "Adaptive computer test plus a recorded interview and writing sample.", sections: ["Adaptive section 45 min", "Interview & writing sample 10 min"], duration: "About 1 hour", scoring: "10-160 overall plus 4 subscores.", validity: "2 years", fee: "USD 65", documents: "Passport or government photo ID.", centers: "None — taken at home.", online: "Fully online, on demand.", retake: "3 tests per 30-day period.", link: "https://englishtest.duolingo.com" },
  { name: "Cambridge English (B2 First / C1 Advanced / C2 Proficiency)", group: "English proficiency", overview: "Level-based certificates that never expire.", eligibility: "No prerequisite; choose the level matching your ability.", accepted: "25,000+ organisations worldwide.", format: "Paper or computer-based at a Cambridge centre.", sections: ["Reading & Use of English", "Writing", "Listening", "Speaking (paired)"], duration: "About 4 hours", scoring: "Cambridge Scale 80-230, mapped to CEFR.", validity: "No expiry (institutions may prefer 2 years).", fee: "USD 150-260", documents: "Photo ID as specified by the centre.", centers: "Authorised Cambridge centres.", online: "Computer-based at centres only.", retake: "Any future session.", link: "https://www.cambridgeenglish.org" },
  { name: "SAT", group: "Undergraduate admission", overview: "Digital adaptive admission test for US and international undergraduate entry.", eligibility: "Typically grades 11-12; no age limit.", accepted: "US universities and many institutions worldwide.", format: "Digital, section-adaptive, taken on Bluebook app at a centre.", sections: ["Reading & Writing 64 min", "Math 70 min"], duration: "2h 14m", scoring: "400-1600 (two 200-800 sections).", validity: "No formal expiry; usually accepted within 5 years.", fee: "USD 68 international (plus regional fee)", documents: "Acceptable photo ID / passport.", centers: "School and commercial test centres.", online: "Digital but proctored in person.", retake: "Up to 7 national dates a year.", link: "https://satsuite.collegeboard.org" },
  { name: "ACT", group: "Undergraduate admission", overview: "Alternative US undergraduate admission test with a science section.", eligibility: "High-school students.", accepted: "All US universities accept ACT in place of SAT.", format: "Paper or online at a centre.", sections: ["English 45 min", "Math 60 min", "Reading 35 min", "Science 35 min", "Writing optional 40 min"], duration: "2h 55m (3h 35m with Writing)", scoring: "1-36 composite.", validity: "No expiry.", fee: "USD 104-181 international", documents: "Photo ID.", centers: "ACT test centres worldwide.", online: "Online testing at centres in some regions.", retake: "Up to 12 times.", link: "https://www.act.org" },
  { name: "AP Examinations", group: "Undergraduate admission", overview: "College-level subject exams that can earn university credit.", eligibility: "Open to any student, AP course not required.", accepted: "Credit or placement at 4,000+ universities.", format: "Paper and digital, each May.", sections: ["Multiple choice", "Free response"], duration: "2-3 hours per subject", scoring: "1-5 (3+ usually earns credit).", validity: "No expiry.", fee: "USD 99-129 per exam", documents: "School AP coordinator registration.", centers: "Schools and authorised centres.", online: "Digital format for many subjects.", retake: "Once per year per subject.", link: "https://apstudents.collegeboard.org" },
  { name: "GRE General Test", group: "Graduate admission", overview: "Standard test for master's and PhD admission across disciplines.", eligibility: "No prerequisite; typically final-year undergraduates and above.", accepted: "Graduate and business schools worldwide.", format: "Shortened computer-adaptive test at a centre or at home.", sections: ["Analytical Writing 30 min", "Verbal 2 sections", "Quantitative 2 sections"], duration: "1h 58m", scoring: "Verbal 130-170, Quant 130-170, Writing 0-6.", validity: "5 years", fee: "USD 220-233", documents: "Passport for international test takers.", centers: "Prometric and ETS centres.", online: "GRE at Home available.", retake: "Once every 21 days, up to 5 times a year.", link: "https://www.ets.org/gre" },
  { name: "GRE Subject Tests", group: "Graduate admission", overview: "Discipline-specific tests (Maths, Physics, Psychology, Chemistry).", eligibility: "Undergraduate major-level knowledge expected.", accepted: "Selective PhD programmes, especially in the US.", format: "Computer-delivered at centres on set dates.", sections: ["Single multiple-choice paper"], duration: "About 2h 20m", scoring: "200-990 scaled.", validity: "5 years", fee: "USD 150", documents: "Passport.", centers: "Prometric centres.", online: "Not available at home.", retake: "Each administration window.", link: "https://www.ets.org/gre/subject" },
  { name: "GMAT Focus Edition", group: "Graduate admission", overview: "Business-school admission test focused on data and reasoning.", eligibility: "18+ (13-17 with consent).", accepted: "7,000+ business and management programmes.", format: "Computer-adaptive, at a centre or online.", sections: ["Quantitative Reasoning 45 min", "Verbal Reasoning 45 min", "Data Insights 45 min"], duration: "2h 15m", scoring: "205-805 total.", validity: "5 years", fee: "USD 275 centre / USD 300 online", documents: "Passport.", centers: "Pearson VUE.", online: "GMAT Online available.", retake: "Every 16 days, 5 per year, 8 lifetime.", link: "https://www.mba.com" },
  { name: "JLPT", group: "Country & language", overview: "Japanese-Language Proficiency Test, levels N5 (easiest) to N1.", eligibility: "Any non-native Japanese speaker.", accepted: "Japanese universities, employers and immigration points.", format: "Paper-based, twice a year (July, December).", sections: ["Language knowledge", "Reading", "Listening"], duration: "1h 45m - 2h 50m by level", scoring: "Scaled per section, pass/fail with section minimums.", validity: "No expiry (institutions may prefer 2 years).", fee: "USD 40-80", documents: "Photo ID and test voucher.", centers: "Worldwide host institutions.", online: "Not available online.", retake: "Each July / December session.", link: "https://www.jlpt.jp/e/" },
  { name: "TOPIK", group: "Country & language", overview: "Test of Proficiency in Korean, levels 1-6 across TOPIK I and II.", eligibility: "Non-native Korean speakers.", accepted: "Korean universities, KGSP scholarship and visas.", format: "Paper-based on scheduled dates.", sections: ["Listening", "Reading", "Writing (TOPIK II)"], duration: "100-180 min", scoring: "Levels 1-6 by total score.", validity: "2 years", fee: "USD 35-60", documents: "Passport and application photo.", centers: "Korean cultural centres and universities.", online: "Internet-based TOPIK piloting in some regions.", retake: "Each scheduled sitting.", link: "https://www.topik.go.kr" },
  { name: "TestAS", group: "Country & language", overview: "Aptitude test for international applicants to German universities.", eligibility: "International students applying to German bachelor programmes.", accepted: "German universities, sometimes bonus points in admission.", format: "Core module plus a subject-specific module.", sections: ["Core module 110 min", "Subject module 145-150 min"], duration: "About 5 hours", scoring: "Standard score with percentile rank.", validity: "No expiry.", fee: "EUR 80-140", documents: "Passport.", centers: "TestAS centres worldwide.", online: "Online TestAS available.", retake: "Any future sitting.", link: "https://www.testas.de" },
  { name: "DELF / DALF", group: "Country & language", overview: "Official French proficiency diplomas from A1 to C2.", eligibility: "Non-native French speakers.", accepted: "French universities (usually B2/C1) and Campus France.", format: "Paper and oral exam at an accredited centre.", sections: ["Listening", "Reading", "Writing", "Speaking"], duration: "1h 30m - 4h by level", scoring: "100 points, pass at 50 with 5+ per section.", validity: "Lifetime", fee: "EUR 100-250", documents: "Photo ID.", centers: "Institut francais / Alliance francaise.", online: "In-person only.", retake: "Each session.", link: "https://www.france-education-international.fr" },
  { name: "Goethe-Zertifikat", group: "Country & language", overview: "Goethe-Institut German certificates A1-C2.", eligibility: "Non-native German speakers.", accepted: "German universities, visas and employers.", format: "Modular — sit all four skills or individual modules.", sections: ["Reading", "Listening", "Writing", "Speaking"], duration: "3-4 hours", scoring: "100 points per module, pass at 60.", validity: "Lifetime (visa uses may require 1-2 years).", fee: "EUR 130-300", documents: "Photo ID.", centers: "Goethe-Institut and partners.", online: "In-person; some online options.", retake: "Module-level retakes allowed.", link: "https://www.goethe.de" },
  { name: "DELE", group: "Country & language", overview: "Official Spanish diplomas issued by Instituto Cervantes.", eligibility: "Non-native Spanish speakers.", accepted: "Spanish and Latin American universities, and Spanish nationality applications.", format: "Written and oral exam on fixed session dates.", sections: ["Reading", "Listening", "Writing", "Speaking"], duration: "2-4 hours", scoring: "Pass/fail with two grouped sections.", validity: "Lifetime", fee: "EUR 110-230", documents: "Passport or national ID.", centers: "Instituto Cervantes centres.", online: "In-person only.", retake: "Each session.", link: "https://examenes.cervantes.es" },
];

const GROUPS = ["English proficiency", "Undergraduate admission", "Graduate admission", "Country & language"];
const TABS = ["Exams", "Calendar", "My plan", "Practice", "AI Coach", "Requirements"] as const;
type Tab = (typeof TABS)[number];

const card = "glass rounded-2xl p-5";
const input = "rounded-xl border border-input bg-background/40 px-3 py-2 text-sm outline-none focus:border-primary";
const btn = "inline-flex items-center gap-1.5 rounded-full bg-nebula px-4 py-2 text-xs font-semibold text-primary-foreground glow disabled:opacity-50";

function TestsPage() {
  const { user } = Route.useRouteContext();
  const [tab, setTab] = useState<Tab>("Exams");
  const [targets, setTargets] = useState<Target[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [events, setEvents] = useState<ExamEvent[]>([]);

  useEffect(() => {
    (async () => {
      const [t, a, e] = await Promise.all([
        supabase.from("test_targets").select("*").eq("user_id", user.id).order("test_date", { ascending: true, nullsFirst: false }),
        supabase.from("practice_attempts").select("*").eq("user_id", user.id).order("taken_at", { ascending: false }),
        supabase.from("exam_events").select("*").order("event_date", { ascending: true }),
      ]);
      setTargets((t.data as Target[]) ?? []);
      setAttempts((a.data as Attempt[]) ?? []);
      setEvents((e.data as ExamEvent[]) ?? []);
    })();
  }, [user.id]);

  const nextTest = targets.find((t) => t.test_date && new Date(t.test_date) >= new Date());
  const daysLeft = nextTest?.test_date ? Math.ceil((new Date(nextTest.test_date).getTime() - Date.now()) / 864e5) : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M06 · Test Preparation</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow"><Languages className="h-5 w-5 text-primary-foreground" /></div>
          <div>
            <h1 className="text-3xl font-bold"><span className="text-gradient">English & Standardized Test Hub</span></h1>
            <p className="text-sm text-muted-foreground">18 exams, a live global calendar, practice logging and AI examiner-grade feedback.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className={card}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Exams planned</p><p className="mt-1 text-2xl font-semibold">{targets.length}</p></div>
          <div className={card}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Next test</p><p className="mt-1 text-lg font-semibold">{nextTest ? `${nextTest.exam} · ${daysLeft}d` : "Not scheduled"}</p></div>
          <div className={card}><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Practice attempts</p><p className="mt-1 text-2xl font-semibold">{attempts.length}</p></div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full border px-3.5 py-1.5 text-xs ${tab === t ? "border-primary bg-nebula text-primary-foreground" : "border-border glass"}`}>{t}</button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "Exams" && <ExamsTab />}
          {tab === "Calendar" && <CalendarTab events={events} />}
          {tab === "My plan" && <PlanTab userId={user.id} targets={targets} setTargets={setTargets} />}
          {tab === "Practice" && <PracticeTab userId={user.id} attempts={attempts} setAttempts={setAttempts} />}
          {tab === "AI Coach" && <CoachTab />}
          {tab === "Requirements" && <RequirementsTab />}
        </div>
      </main>
    </div>
  );
}

function ExamsTab() {
  const [group, setGroup] = useState(GROUPS[0]!);
  const [open, setOpen] = useState<string | null>(null);
  const list = EXAMS.filter((e) => e.group === group);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <button key={g} onClick={() => setGroup(g)} className={`rounded-full border px-3 py-1 text-xs ${group === g ? "border-primary text-primary" : "border-border"}`}>{g}</button>
        ))}
      </div>
      <div className="space-y-3">
        {list.map((e) => (
          <div key={e.name} className={card}>
            <button onClick={() => setOpen(open === e.name ? null : e.name)} className="flex w-full items-start justify-between gap-3 text-left">
              <div>
                <p className="font-semibold">{e.name}</p>
                <p className="text-sm text-muted-foreground">{e.overview}</p>
              </div>
              <span className="shrink-0 text-xs text-primary">{open === e.name ? "Hide" : "Details"}</span>
            </button>
            {open === e.name && (
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                {[["Eligibility", e.eligibility], ["Accepted by", e.accepted], ["Format", e.format], ["Duration", e.duration], ["Scoring", e.scoring], ["Score validity", e.validity], ["Fee", e.fee], ["Required documents", e.documents], ["Test centers", e.centers], ["Online availability", e.online], ["Retake policy", e.retake]].map(([k, v]) => (
                  <div key={k as string}><p className="font-semibold">{k}</p><p className="text-muted-foreground">{v}</p></div>
                ))}
                <div className="sm:col-span-2">
                  <p className="font-semibold">Sections</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">{e.sections.map((s) => <span key={s} className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">{s}</span>)}</div>
                </div>
                <a href={e.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline sm:col-span-2">Official registration & resources <ExternalLink className="h-3 w-3" /></a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarTab({ events }: { events: ExamEvent[] }) {
  const [exam, setExam] = useState("All");
  const [type, setType] = useState("All");
  const exams = ["All", ...Array.from(new Set(events.map((e) => e.exam)))];
  const types = ["All", ...Array.from(new Set(events.map((e) => e.event_type)))];
  const list = events.filter((e) => (exam === "All" || e.exam === exam) && (type === "All" || e.event_type === type));
  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap gap-3`}>
        <select value={exam} onChange={(e) => setExam(e.target.value)} className={input}>{exams.map((x) => <option key={x}>{x}</option>)}</select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={input}>{types.map((x) => <option key={x}>{x}</option>)}</select>
        <p className="self-center text-xs text-muted-foreground">{list.length} entries</p>
      </div>
      <div className="space-y-2">
        {list.map((e) => (
          <div key={e.id} className="glass flex flex-wrap items-center gap-3 rounded-xl p-4">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="w-24 text-sm font-semibold">{e.event_date ? new Date(e.event_date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
            <span className="text-sm font-medium">{e.exam}</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{e.event_type}</span>
            <span className="flex-1 text-xs text-muted-foreground">{e.note}</span>
            {e.link && <a href={e.link} target="_blank" rel="noreferrer" className="text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanTab({ userId, targets, setTargets }: { userId: string; targets: Target[]; setTargets: (t: Target[]) => void }) {
  const [f, setF] = useState({ exam: EXAMS[0]!.name, target_score: "", current_score: "", test_date: "", center: "" });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.from("test_targets").insert({
      user_id: userId, exam: f.exam,
      target_score: f.target_score ? Number(f.target_score) : null,
      current_score: f.current_score ? Number(f.current_score) : null,
      test_date: f.test_date || null, center: f.center || null,
    }).select().single();
    if (error) return toast.error(error.message);
    setTargets([...targets, data as Target]);
    setF({ ...f, target_score: "", current_score: "", test_date: "", center: "" });
  }
  async function toggleReg(t: Target) {
    await supabase.from("test_targets").update({ registered: !t.registered }).eq("id", t.id);
    setTargets(targets.map((x) => (x.id === t.id ? { ...x, registered: !x.registered } : x)));
  }
  async function remove(id: string) {
    await supabase.from("test_targets").delete().eq("id", id);
    setTargets(targets.filter((t) => t.id !== id));
  }
  return (
    <div className="space-y-4">
      <form onSubmit={add} className={`${card} grid gap-3 sm:grid-cols-5`}>
        <select value={f.exam} onChange={(e) => setF({ ...f, exam: e.target.value })} className={`${input} sm:col-span-2`}>{EXAMS.map((e) => <option key={e.name}>{e.name}</option>)}</select>
        <input value={f.current_score} onChange={(e) => setF({ ...f, current_score: e.target.value })} placeholder="Current score" className={input} />
        <input value={f.target_score} onChange={(e) => setF({ ...f, target_score: e.target.value })} placeholder="Target score" className={input} />
        <input type="date" value={f.test_date} onChange={(e) => setF({ ...f, test_date: e.target.value })} className={input} />
        <input value={f.center} onChange={(e) => setF({ ...f, center: e.target.value })} placeholder="Test centre / city" className={`${input} sm:col-span-4`} />
        <button className={btn}><Plus className="h-3.5 w-3.5" /> Add exam</button>
      </form>
      <div className="grid gap-3 md:grid-cols-2">
        {targets.map((t) => {
          const d = t.test_date ? Math.ceil((new Date(t.test_date).getTime() - Date.now()) / 864e5) : null;
          return (
            <div key={t.id} className={card}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{t.exam}</p>
                  <p className="text-xs text-muted-foreground">{t.current_score ?? "—"} → target {t.target_score ?? "—"}{t.center ? ` · ${t.center}` : ""}</p>
                </div>
                <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {t.test_date && <span className="rounded-full border border-primary/50 px-2 py-0.5 text-primary">{new Date(t.test_date).toLocaleDateString()} {d != null && d >= 0 ? `· ${d} days left` : ""}</span>}
                <button onClick={() => toggleReg(t)} className={`rounded-full border px-2 py-0.5 ${t.registered ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{t.registered ? "Registered" : "Not registered"}</button>
              </div>
            </div>
          );
        })}
        {targets.length === 0 && <p className="text-sm text-muted-foreground">Add the exams you plan to take to unlock reminders and AI planning.</p>}
      </div>
    </div>
  );
}

function PracticeTab({ userId, attempts, setAttempts }: { userId: string; attempts: Attempt[]; setAttempts: (a: Attempt[]) => void }) {
  const [f, setF] = useState({ exam: EXAMS[0]!.name, section: "Reading", score: "", max_score: "", minutes: "", notes: "" });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.from("practice_attempts").insert({
      user_id: userId, exam: f.exam, section: f.section,
      score: f.score ? Number(f.score) : null, max_score: f.max_score ? Number(f.max_score) : null,
      minutes: f.minutes ? Number(f.minutes) : null, notes: f.notes || null,
    }).select().single();
    if (error) return toast.error(error.message);
    setAttempts([data as Attempt, ...attempts]);
    setF({ ...f, score: "", max_score: "", minutes: "", notes: "" });
  }
  async function remove(id: string) {
    await supabase.from("practice_attempts").delete().eq("id", id);
    setAttempts(attempts.filter((a) => a.id !== id));
  }
  const bySection = useMemo(() => {
    const m = new Map<string, { n: number; pct: number }>();
    attempts.forEach((a) => {
      if (a.score == null || !a.max_score) return;
      const k = a.section ?? "Overall";
      const prev = m.get(k) ?? { n: 0, pct: 0 };
      m.set(k, { n: prev.n + 1, pct: prev.pct + (Number(a.score) / Number(a.max_score)) * 100 });
    });
    return Array.from(m, ([k, v]) => ({ section: k, avg: v.pct / v.n, n: v.n }));
  }, [attempts]);

  return (
    <div className="space-y-4">
      <form onSubmit={add} className={`${card} grid gap-3 sm:grid-cols-6`}>
        <select value={f.exam} onChange={(e) => setF({ ...f, exam: e.target.value })} className={`${input} sm:col-span-2`}>{EXAMS.map((e) => <option key={e.name}>{e.name}</option>)}</select>
        <select value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} className={input}>{["Reading", "Listening", "Writing", "Speaking", "Math", "Verbal", "Quantitative", "Data Insights", "Science", "Full mock"].map((s) => <option key={s}>{s}</option>)}</select>
        <input value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} placeholder="Score" className={input} />
        <input value={f.max_score} onChange={(e) => setF({ ...f, max_score: e.target.value })} placeholder="Out of" className={input} />
        <input value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} placeholder="Minutes" className={input} />
        <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Notes — what went wrong?" className={`${input} sm:col-span-5`} />
        <button className={btn}><Plus className="h-3.5 w-3.5" /> Log</button>
      </form>

      {bySection.length > 0 && (
        <div className={`${card} grid gap-3 sm:grid-cols-3`}>
          {bySection.map((s) => (
            <div key={s.section}>
              <p className="text-xs text-muted-foreground">{s.section} · {s.n} attempts</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-nebula" style={{ width: `${s.avg}%` }} /></div>
              <p className="mt-1 text-xs font-semibold">{Math.round(s.avg)}% average</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {attempts.map((a) => (
          <div key={a.id} className="glass flex flex-wrap items-center gap-3 rounded-xl p-3 text-sm">
            <span className="w-24 text-xs text-muted-foreground">{new Date(a.taken_at).toLocaleDateString()}</span>
            <span className="font-medium">{a.exam}</span>
            <span className="text-xs text-muted-foreground">{a.section}</span>
            <span className="font-semibold">{a.score}{a.max_score ? `/${a.max_score}` : ""}</span>
            <span className="flex-1 text-xs text-muted-foreground">{a.notes}</span>
            <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoachTab() {
  const coach = useServerFn(examCoach);
  const review = useServerFn(examResponseReview);
  const vocab = useServerFn(vocabularyCoach);
  const [exam, setExam] = useState(EXAMS[0]!.name);
  const [target, setTarget] = useState("");
  const [weeks, setWeeks] = useState("8");
  const [plan, setPlan] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [skill, setSkill] = useState("writing");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [fb, setFb] = useState<any>(null);

  const [topic, setTopic] = useState("education");
  const [cards, setCards] = useState<any>(null);

  async function go(kind: string, fn: () => Promise<any>, set: (v: any) => void) {
    setBusy(kind);
    try { set(await fn()); } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="space-y-6">
      <div className={card}>
        <h3 className="flex items-center gap-2 font-semibold"><Target className="h-4 w-4" /> Readiness score, score prediction & study plan</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <select value={exam} onChange={(e) => setExam(e.target.value)} className={`${input} sm:col-span-2`}>{EXAMS.map((e) => <option key={e.name}>{e.name}</option>)}</select>
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target score" className={input} />
          <input value={weeks} onChange={(e) => setWeeks(e.target.value)} placeholder="Weeks" className={input} />
        </div>
        <button onClick={() => go("plan", () => coach({ data: { exam, targetScore: target, weeks } }), setPlan)} disabled={busy === "plan"} className={`${btn} mt-3`}>
          {busy === "plan" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Build my plan
        </button>
        {plan && (
          <div className="mt-4 space-y-3 text-sm">
            <p><b>Readiness {plan.readiness}/100</b> · predicted {plan.predictedScore} · {plan.gapToTarget}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-nebula" style={{ width: `${plan.readiness}%` }} /></div>
            {(plan.weakAreas ?? []).map((w: any, i: number) => (
              <div key={i} className="rounded-xl border border-border/60 p-3"><p className="font-medium">{w.section}</p><p className="text-xs text-muted-foreground">{w.issue} → {w.fix}</p></div>
            ))}
            {(plan.dailyGoals ?? []).length > 0 && <p className="text-xs text-muted-foreground">Daily: {plan.dailyGoals.join(" · ")}</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              {(plan.weekPlan ?? []).map((w: any, i: number) => (
                <div key={i} className="rounded-xl border border-border/60 p-3 text-xs">
                  <p className="font-semibold">Week {w.week} — {w.focus}</p>
                  <ul className="mt-1 list-disc pl-4 text-muted-foreground">{(w.tasks ?? []).map((t: string, j: number) => <li key={j}>{t}</li>)}</ul>
                  {w.mock && <p className="mt-1 text-primary">Mock: {w.mock}</p>}
                </div>
              ))}
            </div>
            {(plan.resources ?? []).map((r: any, i: number) => (
              <a key={i} href={r.url} target="_blank" rel="noreferrer" className="block text-xs text-primary hover:underline">{r.name} — {r.why}</a>
            ))}
          </div>
        )}
      </div>

      <div className={card}>
        <h3 className="font-semibold">AI writing & speaking evaluation</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {["writing", "speaking"].map((s) => (
            <button key={s} onClick={() => setSkill(s)} className={`rounded-full border px-3 py-1 text-xs capitalize ${skill === s ? "border-primary text-primary" : "border-border"}`}>{s}</button>
          ))}
        </div>
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Task / question prompt" className={`${input} mt-3 w-full`} />
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={8} placeholder={skill === "speaking" ? "Paste a transcript of your spoken answer…" : "Paste your essay…"} className={`${input} mt-3 w-full`} />
        <button onClick={() => go("fb", () => review({ data: { exam, skill, prompt, answer } }), setFb)} disabled={!answer.trim() || busy === "fb"} className={`${btn} mt-3`}>
          {busy === "fb" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Score my response
        </button>
        {fb && (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-lg font-semibold text-gradient">Overall: {fb.overall}</p>
            {(fb.criteria ?? []).map((c: any, i: number) => <p key={i} className="text-xs"><b>{c.name} — {c.score}:</b> {c.comment}</p>)}
            {(fb.grammarIssues ?? []).map((g: any, i: number) => <p key={i} className="text-xs text-destructive">“{g.quote}” → {g.fix}</p>)}
            {(fb.vocabularyUpgrades ?? []).length > 0 && <p className="text-xs text-muted-foreground">Upgrades: {fb.vocabularyUpgrades.map((v: any) => `${v.from} → ${v.to}`).join(" · ")}</p>}
            {(fb.pronunciationNotes ?? []).map((p: string, i: number) => <p key={i} className="text-xs text-muted-foreground">🔊 {p}</p>)}
            {fb.improvedVersion && <div className="rounded-xl border border-primary/40 bg-nebula/10 p-3 text-xs whitespace-pre-wrap">{fb.improvedVersion}</div>}
          </div>
        )}
      </div>

      <div className={card}>
        <h3 className="font-semibold">AI vocabulary coach</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (education, environment…)" className={`${input} flex-1`} />
          <button onClick={() => go("v", () => vocab({ data: { exam, topic } }), setCards)} disabled={busy === "v"} className={btn}>
            {busy === "v" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Generate flashcards
          </button>
        </div>
        {cards && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(cards.cards ?? []).map((c: any, i: number) => (
              <div key={i} className="rounded-xl border border-border/60 p-3 text-xs">
                <p className="text-sm font-semibold">{c.word} <span className="text-muted-foreground">{c.band}</span></p>
                <p className="text-muted-foreground">{c.meaning}</p>
                <p className="mt-1 italic">{c.sentence}</p>
                {(c.collocations ?? []).length > 0 && <p className="mt-1 text-primary">{c.collocations.join(" · ")}</p>}
              </div>
            ))}
          </div>
        )}
        {cards?.drill && <p className="mt-3 text-xs text-muted-foreground">Drill: {cards.drill}</p>}
      </div>
    </div>
  );
}

function RequirementsTab() {
  const match = useServerFn(examRequirementMatcher);
  const [country, setCountry] = useState("");
  const [level, setLevel] = useState("Master's");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap gap-3`}>
        <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country (blank = all)" className={`${input} flex-1`} />
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={input}>{["Undergraduate", "Master's", "PhD", "MBA"].map((l) => <option key={l}>{l}</option>)}</select>
        <button onClick={async () => { setBusy(true); try { setRes(await match({ data: { country, level } })); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); } }} disabled={busy} className={btn}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Match my scores
        </button>
      </div>
      {res && (
        <div className={card}>
          <p className="text-sm">{res.summary}</p>
          <div className="mt-4 space-y-2">
            {(res.rows ?? []).map((r: any, i: number) => (
              <div key={i} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-3 text-xs">
                <span className="flex-1 font-medium">{r.university} <span className="text-muted-foreground">{r.country}</span></span>
                <span className="text-muted-foreground">needs {r.required}</span>
                <span>you {r.yourScore}</span>
                <span className={`rounded-full px-2 py-0.5 ${r.status === "meets" ? "bg-nebula text-primary-foreground" : r.status === "close" ? "border border-primary text-primary" : "border border-border text-muted-foreground"}`}>{r.status}</span>
                <span className="w-full text-muted-foreground">{r.note}</span>
              </div>
            ))}
          </div>
          {(res.waivers ?? []).length > 0 && <p className="mt-3 text-xs text-muted-foreground"><b>Test-optional / waivers:</b> {res.waivers.join(" · ")}</p>}
          {(res.priorityExams ?? []).length > 0 && <p className="mt-1 text-xs text-primary"><b>Take these first:</b> {res.priorityExams.join(" · ")}</p>}
        </div>
      )}
    </div>
  );
}
