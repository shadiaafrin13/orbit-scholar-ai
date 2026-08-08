import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

async function callAI(messages: ChatMsg[]): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "openai/gpt-5.6-sol", reasoning_effort: "none", messages }),
  });
  if (res.status === 429) throw new Error("AI is busy right now — please retry in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted — add credits to continue.");
  if (!res.ok) throw new Error(`AI error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return j.choices?.[0]?.message?.content ?? "";
}

function parseJson<T>(raw: string, fallback: T): T {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return fallback;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return fallback;
  }
}

const GUARD =
  "You are Atlas, a study-abroad strategist. Never guarantee admission, scholarships or visas. Present all scores and probabilities as estimates based on the information provided. Never invent achievements, publications or requirements. Reply with strict JSON only.";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function snapshot(supabase: any, userId: string) {
  const [profile, tasks, apps, tests, attempts, courses, acts, ach, pubs, recs, sops, saved] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("tasks").select("title,category,due_date,priority,completed").eq("user_id", userId).limit(120),
    supabase.from("applications").select("university_name,program,level,status,deadline,missing_documents,interview_date,aid_status,visa_status").eq("user_id", userId).limit(40),
    supabase.from("test_targets").select("exam,target_score,current_score,test_date,registered").eq("user_id", userId).limit(20),
    supabase.from("practice_attempts").select("exam,section,score,max_score,taken_at").eq("user_id", userId).order("taken_at", { ascending: false }).limit(20),
    supabase.from("courses").select("name,credits,grade,grade_points,status,term,year").eq("user_id", userId).limit(60),
    supabase.from("activities").select("title,category,role,organization,hours_per_week,impact").eq("user_id", userId).limit(40),
    supabase.from("achievements").select("title,kind,level,hours").eq("user_id", userId).limit(40),
    supabase.from("publications").select("title,venue,year,type,citations").eq("user_id", userId).limit(20),
    supabase.from("recommenders").select("name,affiliation,status,requested_at,submitted_at").eq("user_id", userId).limit(20),
    supabase.from("sops").select("doc_type,university,program,ai_score,authenticity_score,updated_at").eq("user_id", userId).limit(20),
    supabase.from("saved_items").select("item_type").eq("user_id", userId).limit(200),
  ]);
  const p: any = profile.data ?? {};
  return {
    today: new Date().toISOString().slice(0, 10),
    profile: {
      level: p.current_level,
      target_level: p.target_level,
      field: p.field_of_study,
      country: p.country,
      target_countries: p.target_countries,
      intake_year: p.intake_year,
      gpa: p.gpa,
      ielts: p.ielts,
      toefl: p.toefl,
      sat: p.sat,
      gre: p.gre,
      gmat: p.gmat,
      budget: p.path_budget,
      timeline: p.path_timeline,
      goal: p.path_goal,
      interests: p.interests,
      work_experience: p.work_experience,
      honors: p.honors,
      graduation_year: p.graduation_year,
    },
    tasks: tasks.data ?? [],
    applications: apps.data ?? [],
    tests: tests.data ?? [],
    attempts: attempts.data ?? [],
    courses: courses.data ?? [],
    activities: acts.data ?? [],
    achievements: ach.data ?? [],
    publications: pubs.data ?? [],
    recommenders: recs.data ?? [],
    documents: sops.data ?? [],
    savedCount: (saved.data ?? []).length,
  };
}

export type ReadinessArea = {
  area: string;
  score: number;
  explanation: string;
  strengths: string[];
  weaknesses: string[];
  priority: "Critical" | "High" | "Recommended" | "Optional";
  action: string;
};

export const readinessReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const snap = await snapshot(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: GUARD },
      {
        role: "user",
        content: `Produce an AI Student Readiness Report.
Return JSON: {"overall":0-100,"verdict":"Ready|Almost Ready|Needs Improvement|Not Ready","summary":"2 sentences","areas":[{"area":"Academic Strength|ECA Strength|Research Strength|Test Readiness|Financial Readiness|Application Readiness|Career Alignment","score":0-100,"explanation":"","strengths":[".."],"weaknesses":[".."],"priority":"Critical|High|Recommended|Optional","action":".."}]}
Include exactly those 7 areas in that order.
Student snapshot: ${JSON.stringify(snap)}`,
      },
    ]);
    return parseJson(raw, { overall: 0, verdict: "Needs Improvement", summary: "", areas: [] as ReadinessArea[] });
  });

export const nextBestAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const snap = await snapshot(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: GUARD },
      {
        role: "user",
        content: `Determine the single Next Best Action, plus this week's strategy and any risk alerts.
Return JSON: {"headline":"one imperative sentence","why":"1-2 sentences referencing real numbers/dates from the data","effort":"e.g. 45 min","deadlinePressure":"low|medium|high","weekly":[{"day":"Mon".."Sun","focus":".."}],"risks":[{"type":"deadline|document|test|financial|recommendation","severity":"low|medium|high","message":".."}],"forecast":"one sentence progress forecast"}
Snapshot: ${JSON.stringify(snap)}`,
      },
    ]);
    return parseJson(raw, {
      headline: "",
      why: "",
      effort: "",
      deadlinePressure: "low",
      weekly: [] as Array<{ day: string; focus: string }>,
      risks: [] as Array<{ type: string; severity: string; message: string }>,
      forecast: "",
    });
  });

export const generateRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { horizon?: string }) => ({ horizon: d.horizon ?? "12 months" }))
  .handler(async ({ context, data }) => {
    const snap = await snapshot(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: GUARD },
      {
        role: "user",
        content: `Build a personalized roadmap over a ${data.horizon} horizon, today is ${snap.today}.
Return JSON: {"phases":[{"label":"2-year|1-year|6-month|3-month|30-day","window":"e.g. Aug 2026 – Feb 2027","goal":"..","milestones":[".."]}],"tasks":[{"title":"..","category":"Application|Test prep|Scholarship|Research|Documents|Outreach|Other","due_date":"YYYY-MM-DD","priority":"critical|high|normal|low","estimate":"e.g. 3 h","difficulty":"easy|moderate|hard","depends_on":"task title or empty","why":".."}]}
Produce 12-18 concrete, non-duplicate tasks ordered by urgency. Do not repeat tasks the student already has.
Snapshot: ${JSON.stringify(snap)}`,
      },
    ]);
    return parseJson(raw, {
      phases: [] as Array<{ label: string; window: string; goal: string; milestones: string[] }>,
      tasks: [] as Array<{
        title: string;
        category: string;
        due_date: string;
        priority: string;
        estimate: string;
        difficulty: string;
        depends_on: string;
        why: string;
      }>,
    });
  });

export const commitRoadmapTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      tasks: Array<{ title: string; category?: string; due_date?: string; priority?: string; estimate?: string; difficulty?: string; depends_on?: string; why?: string }>;
    }) => ({ tasks: (d.tasks ?? []).slice(0, 30) }),
  )
  .handler(async ({ context, data }) => {
    if (!data.tasks.length) return { inserted: 0 };
    const rows = data.tasks.map((t) => ({
      user_id: context.userId,
      title: t.title.slice(0, 200),
      category: t.category ?? "Other",
      due_date: t.due_date && /^\d{4}-\d{2}-\d{2}$/.test(t.due_date) ? t.due_date : null,
      priority: ["critical", "high", "normal", "low"].includes(t.priority ?? "") ? t.priority! : "normal",
      notes: [t.why, t.estimate ? `Est: ${t.estimate}` : "", t.difficulty ? `Difficulty: ${t.difficulty}` : "", t.depends_on ? `Depends on: ${t.depends_on}` : ""]
        .filter(Boolean)
        .join(" · ") || null,
    }));
    const { error } = await context.supabase.from("tasks").insert(rows);
    if (error) throw new Error(error.message);
    return { inserted: rows.length };
  });

export const prioritizeTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const snap = await snapshot(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: GUARD },
      {
        role: "user",
        content: `Re-rank the student's open tasks with the Atlas priority engine (deadline proximity, admission importance, student weakness, university and scholarship requirements). Today is ${snap.today}.
Return JSON: {"ranked":[{"title":"exact existing task title","tier":"Critical|High Priority|Recommended|Optional","reason":".."}],"note":".."}
Snapshot: ${JSON.stringify(snap)}`,
      },
    ]);
    return parseJson(raw, { ranked: [] as Array<{ title: string; tier: string; reason: string }>, note: "" });
  });

export const scenarioSimulate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { question: string }) => ({ question: d.question.slice(0, 500) }))
  .handler(async ({ context, data }) => {
    const snap = await snapshot(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: GUARD },
      {
        role: "user",
        content: `Scenario question: "${data.question}"
Recalculate the outlook and return JSON: {"scenario":"restated","universityOptions":"..","scholarshipOutlook":"..","admissionProbability":"e.g. moderately improved — estimate only","financialFeasibility":"..","tradeoffs":[".."],"nextSteps":[".."],"verdict":"one sentence"}
Snapshot: ${JSON.stringify(snap)}`,
      },
    ]);
    return parseJson(raw, {
      scenario: data.question,
      universityOptions: "",
      scholarshipOutlook: "",
      admissionProbability: "",
      financialFeasibility: "",
      tradeoffs: [] as string[],
      nextSteps: [] as string[],
      verdict: "",
    });
  });

export const planCalendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [tasks, apps, tests, recs, exams] = await Promise.all([
      supabase.from("tasks").select("id,title,due_date,category,completed,priority").eq("user_id", userId).not("due_date", "is", null),
      supabase.from("applications").select("id,university_name,program,deadline,interview_date,status").eq("user_id", userId),
      supabase.from("test_targets").select("id,exam,test_date,registered").eq("user_id", userId).not("test_date", "is", null),
      supabase.from("recommenders").select("id,name,requested_at,submitted_at,status").eq("user_id", userId),
      supabase.from("exam_events").select("id,exam,event_type,event_date,country,link").not("event_date", "is", null).limit(200),
    ]);
    type Ev = { id: string; date: string; kind: string; title: string; meta: string | null };
    const out: Ev[] = [];
    for (const t of tasks.data ?? [])
      out.push({ id: `t${t.id}`, date: t.due_date, kind: t.completed ? "Done" : "Task", title: t.title, meta: t.category });
    for (const a of apps.data ?? []) {
      if (a.deadline) out.push({ id: `a${a.id}`, date: a.deadline, kind: "Application", title: `${a.university_name} deadline`, meta: a.program ?? a.status });
      if (a.interview_date) out.push({ id: `i${a.id}`, date: a.interview_date, kind: "Interview", title: `${a.university_name} interview`, meta: a.program });
    }
    for (const t of tests.data ?? [])
      out.push({ id: `x${t.id}`, date: t.test_date, kind: "Test", title: `${t.exam} test date`, meta: t.registered ? "Registered" : "Not registered" });
    for (const r of recs.data ?? []) {
      if (r.requested_at && !r.submitted_at)
        out.push({ id: `r${r.id}`, date: r.requested_at, kind: "Recommendation", title: `${r.name} — letter pending`, meta: r.status });
    }
    for (const e of exams.data ?? [])
      out.push({ id: `e${e.id}`, date: e.event_date, kind: "Exam calendar", title: `${e.exam} — ${e.event_type}`, meta: e.country });
    out.sort((a, b) => a.date.localeCompare(b.date));
    return out;
  });
