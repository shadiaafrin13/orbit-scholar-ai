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

async function loadStudent(supabase: any, userId: string) {
  const [{ data: profile }, { data: courses }, { data: acts }, { data: ach }, { data: tests }, { data: sessions }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("courses").select("term,year,name,credits,grade,grade_points,attendance_pct,status").eq("user_id", userId).limit(60),
      supabase.from("activities").select("title,category,role,organization,hours_per_week,impact").eq("user_id", userId).limit(40),
      supabase.from("achievements").select("title,kind,issuer,level,hours").eq("user_id", userId).limit(40),
      supabase.from("test_targets").select("exam,target_score,current_score,test_date,registered").eq("user_id", userId).limit(20),
      supabase.from("practice_attempts").select("exam,section,score,max_score,taken_at").eq("user_id", userId).order("taken_at", { ascending: false }).limit(40),
    ]);
  return {
    profile: profile ?? {},
    courses: courses ?? [],
    activities: acts ?? [],
    achievements: ach ?? [],
    tests: tests ?? [],
    attempts: sessions ?? [],
  };
}

function digest(ctx: Awaited<ReturnType<typeof loadStudent>>) {
  const p: any = ctx.profile ?? {};
  return JSON.stringify({
    level: p.current_level,
    field: p.field_of_study,
    gpa: p.gpa,
    ielts: p.ielts,
    toefl: p.toefl,
    sat: p.sat,
    gre: p.gre,
    gmat: p.gmat,
    countries: p.target_countries,
    interests: p.interests,
    honors: p.honors,
    work: p.work_experience,
    courses: ctx.courses,
    activities: ctx.activities,
    achievements: ctx.achievements,
    tests: ctx.tests,
    practice: ctx.attempts,
  });
}

/* ==================== MODULE 5 — Academic & ECA ==================== */

/** GPA improvement planner + academic success prediction. */
export const academicPlanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetGpa?: string; scale?: string }) => ({
    targetGpa: (d.targetGpa ?? "").slice(0, 20),
    scale: (d.scale ?? "4.0").slice(0, 10),
  }))
  .handler(async ({ context, data }) => {
    const ctx = await loadStudent(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You are an academic success coach for international university applicants. Reply only with strict JSON." },
      {
        role: "user",
        content: `Build a GPA improvement plan on a ${data.scale} scale toward a target of ${data.targetGpa || "the highest realistic"}.
Return STRICT JSON: {"currentAssessment":"2 sentences","successProbability":0-100,"achievableGpa":"x.xx","levers":[{"course":"...","action":"...","gain":"+0.0x"}],"weeklyPlan":["..."],"risks":["..."],"monthlyMilestones":[{"month":"...","goal":"..."}]}
Student: ${digest(ctx)}`,
      },
    ]);
    return parseJson<any>(raw, { currentAssessment: "", successProbability: 0, levers: [], weeklyPlan: [] });
  });

/** ECA profile analyzer: strength, leadership score, gaps, recommended activities. */
export const ecaAnalyzer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { goal?: string }) => ({ goal: (d.goal ?? "").slice(0, 300) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [ctx, { data: ops }] = await Promise.all([
      loadStudent(supabase, userId),
      supabase.from("eca_opportunities").select("id,name,category,type,country,mode,level,deadline,funding").limit(120),
    ]);
    const raw = await callAI([
      { role: "system", content: "You are an admissions reader evaluating extracurricular profiles for top universities. Reply only with strict JSON." },
      {
        role: "user",
        content: `Evaluate this student's academic + ECA profile${data.goal ? ` against this goal: ${data.goal}` : ""}.
Return STRICT JSON: {"scores":{"gpaStrength":0-100,"academicCompetitiveness":0-100,"leadership":0-100,"communityImpact":0-100,"researchPotential":0-100,"skillDevelopment":0-100,"overallEca":0-100},"spike":"the student's defining theme in 1 sentence","strengths":["..."],"missingActivities":["..."],"recommended":[{"id":"<uuid or null>","name":"...","why":"1 sentence","deadline":"..."}],"roadmap":[{"window":"Next 30 days|3 months|6 months","actions":["..."]}]}
Student: ${digest(ctx)}
Recommend ONLY from this catalog where possible: ${JSON.stringify(ops ?? [])}`,
      },
    ]);
    return parseJson<any>(raw, { scores: {}, strengths: [], missingActivities: [], recommended: [], roadmap: [] });
  });

/** Weekly productivity report from study sessions and habits. */
export const productivityCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 28 * 864e5).toISOString();
    const [{ data: sessions }, { data: habits }, { data: tasks }] = await Promise.all([
      supabase.from("study_sessions").select("subject,kind,minutes,focus_score,occurred_at").eq("user_id", userId).gte("occurred_at", since).limit(200),
      supabase.from("habits").select("name,target_per_week,log").eq("user_id", userId).limit(30),
      supabase.from("tasks").select("title,category,due_date,priority,completed").eq("user_id", userId).limit(60),
    ]);
    const raw = await callAI([
      { role: "system", content: "You are a study productivity coach. Reply only with strict JSON." },
      {
        role: "user",
        content: `Write this week's progress review.
Return STRICT JSON: {"headline":"1 sentence","focusMinutes":0,"trend":"up|flat|down","wins":["..."],"leaks":["..."],"nextWeek":[{"day":"Mon".."Sun","plan":"..."}],"habitAdvice":["..."]}
Sessions(last 28 days): ${JSON.stringify(sessions ?? [])}
Habits: ${JSON.stringify(habits ?? [])}
Tasks: ${JSON.stringify(tasks ?? [])}`,
      },
    ]);
    return parseJson<any>(raw, { headline: "", wins: [], leaks: [], nextWeek: [], habitAdvice: [] });
  });

/* ==================== MODULE 6 — Test preparation ==================== */

/** Exam readiness score, score prediction and a daily study plan. */
export const examCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { exam: string; targetScore?: string; weeks?: string }) => ({
    exam: String(d.exam ?? "IELTS Academic").slice(0, 60),
    targetScore: (d.targetScore ?? "").slice(0, 20),
    weeks: (d.weeks ?? "8").slice(0, 4),
  }))
  .handler(async ({ context, data }) => {
    const ctx = await loadStudent(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You are an expert test-prep tutor for international admissions exams. Reply only with strict JSON." },
      {
        role: "user",
        content: `Create a readiness assessment and ${data.weeks}-week plan for ${data.exam} targeting ${data.targetScore || "a competitive score"}.
Return STRICT JSON: {"readiness":0-100,"predictedScore":"...","gapToTarget":"...","weakAreas":[{"section":"...","issue":"...","fix":"..."}],"dailyGoals":["..."],"weekPlan":[{"week":1,"focus":"...","tasks":["..."],"mock":"..."}],"resources":[{"name":"...","url":"...","why":"..."}]}
Student: ${digest(ctx)}`,
      },
    ]);
    return parseJson<any>(raw, { readiness: 0, weakAreas: [], dailyGoals: [], weekPlan: [], resources: [] });
  });

/** Evaluate a writing or speaking response with band-style scoring. */
export const examResponseReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { exam: string; skill: string; prompt?: string; answer: string }) => ({
    exam: String(d.exam ?? "IELTS Academic").slice(0, 60),
    skill: String(d.skill ?? "writing").slice(0, 20),
    prompt: (d.prompt ?? "").slice(0, 1500),
    answer: String(d.answer ?? "").slice(0, 9000),
  }))
  .handler(async ({ data }) => {
    const raw = await callAI([
      { role: "system", content: "You are a certified examiner. Score strictly against the official rubric. Reply only with strict JSON." },
      {
        role: "user",
        content: `Score this ${data.exam} ${data.skill} response.
Return STRICT JSON: {"overall":"band or score","criteria":[{"name":"Task Response|Coherence|Lexical Resource|Grammar|Fluency|Pronunciation","score":"...","comment":"..."}],"grammarIssues":[{"quote":"...","fix":"..."}],"vocabularyUpgrades":[{"from":"...","to":"..."}],"pronunciationNotes":["..."],"improvedVersion":"a rewritten model answer","nextSteps":["..."]}
Prompt: ${data.prompt || "(not provided)"}
Response: ${data.answer}`,
      },
    ]);
    return parseJson<any>(raw, { overall: "", criteria: [], grammarIssues: [], vocabularyUpgrades: [], improvedVersion: "", nextSteps: [] });
  });

/** Match a student's scores to the exam requirements of their target universities. */
export const examRequirementMatcher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { country?: string; level?: string }) => ({
    country: (d.country ?? "").slice(0, 60),
    level: (d.level ?? "").slice(0, 40),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("universities")
      .select("name,country,ielts_min,toefl_min,det_min,gre_required,gmat_required,avg_gpa,levels,world_rank")
      .limit(60);
    if (data.country) q = q.eq("country", data.country);
    const [ctx, { data: unis }] = await Promise.all([loadStudent(supabase, userId), q]);
    const raw = await callAI([
      { role: "system", content: "You are an admissions requirements analyst. Reply only with strict JSON." },
      {
        role: "user",
        content: `Compare the student's test scores against these universities${data.level ? ` for ${data.level} study` : ""}.
Return STRICT JSON: {"summary":"2 sentences","rows":[{"university":"...","country":"...","required":"...","yourScore":"...","status":"meets|close|below|unknown","note":"..."}],"waivers":["universities or policies where tests may be waived / optional / blind"],"priorityExams":["..."]}
Student: ${digest(ctx)}
Universities: ${JSON.stringify(unis ?? [])}`,
      },
    ]);
    return parseJson<any>(raw, { summary: "", rows: [], waivers: [], priorityExams: [] });
  });

/** Vocabulary coach: themed word lists with usage. */
export const vocabularyCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { exam: string; topic?: string; level?: string }) => ({
    exam: String(d.exam ?? "IELTS Academic").slice(0, 60),
    topic: (d.topic ?? "general academic").slice(0, 120),
    level: (d.level ?? "B2-C1").slice(0, 20),
  }))
  .handler(async ({ data }) => {
    const raw = await callAI([
      { role: "system", content: "You are a vocabulary coach. Reply only with strict JSON." },
      {
        role: "user",
        content: `Give 12 high-yield ${data.level} words for ${data.exam} on the topic "${data.topic}".
Return STRICT JSON: {"cards":[{"word":"...","meaning":"...","collocations":["..."],"sentence":"...","band":"..."}],"drill":"one 5-minute practice instruction"}`,
      },
    ]);
    return parseJson<any>(raw, { cards: [], drill: "" });
  });

/* ==================== MODULE 7 — SOP & essays ==================== */

/** Brainstorm structure: hooks, story beats and an outline for a document type. */
export const essayBrainstorm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { docType: string; target?: string; country?: string; wordLimit?: string; prompt?: string }) => ({
    docType: String(d.docType ?? "sop").slice(0, 60),
    target: (d.target ?? "").slice(0, 160),
    country: (d.country ?? "").slice(0, 60),
    wordLimit: (d.wordLimit ?? "").slice(0, 10),
    prompt: (d.prompt ?? "").slice(0, 1200),
  }))
  .handler(async ({ context, data }) => {
    const ctx = await loadStudent(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You are an admissions essay coach who helps students find their own authentic story. Reply only with strict JSON." },
      {
        role: "user",
        content: `Plan a ${data.docType} for ${data.target || "the student's target program"}${data.country ? ` in ${data.country}` : ""}${data.wordLimit ? `, limit ${data.wordLimit} words` : ""}.
Return STRICT JSON: {"brainstorm":["10 probing questions the student should answer"],"hooks":["3 distinct opening lines"],"storyBeats":[{"beat":"...","content":"what to cover"}],"outline":[{"section":"...","words":0,"purpose":"...","mustInclude":["..."]}],"countryNotes":["conventions for this country/system"],"avoid":["..."]}
Essay prompt: ${data.prompt || "(none given)"}
Student: ${digest(ctx)}`,
      },
    ]);
    return parseJson<any>(raw, { brainstorm: [], hooks: [], storyBeats: [], outline: [], countryNotes: [], avoid: [] });
  });

/** Generate a full first draft from the student's real profile. */
export const essayGenerate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { docType: string; target?: string; country?: string; wordLimit?: string; prompt?: string; notes?: string }) => ({
    docType: String(d.docType ?? "sop").slice(0, 60),
    target: (d.target ?? "").slice(0, 160),
    country: (d.country ?? "").slice(0, 60),
    wordLimit: (d.wordLimit ?? "900").slice(0, 10),
    prompt: (d.prompt ?? "").slice(0, 1200),
    notes: (d.notes ?? "").slice(0, 3000),
  }))
  .handler(async ({ context, data }) => {
    const ctx = await loadStudent(context.supabase, context.userId);
    const raw = await callAI([
      {
        role: "system",
        content:
          "You write authentic, specific admissions essays grounded ONLY in the facts provided. Never invent awards, publications or numbers. Return plain prose, no markdown headings.",
      },
      {
        role: "user",
        content: `Write a ${data.wordLimit}-word ${data.docType} for ${data.target || "the target program"}${data.country ? ` (${data.country} conventions)` : ""}.
Prompt: ${data.prompt || "(none)"}
Student's own notes: ${data.notes || "(none)"}
Verified profile: ${digest(ctx)}
If a detail is missing, write [ADD: what to fill in] instead of inventing it.`,
      },
    ]);
    return { draft: raw.trim() };
  });

/** Full rubric review: structure, fit, authenticity, readability, admission strength. */
export const essayReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { docType: string; target?: string; content: string; mode?: string }) => ({
    docType: String(d.docType ?? "sop").slice(0, 60),
    target: (d.target ?? "").slice(0, 160),
    content: String(d.content ?? "").slice(0, 14000),
    mode: (d.mode ?? "review").slice(0, 30),
  }))
  .handler(async ({ context, data }) => {
    const ctx = await loadStudent(context.supabase, context.userId);
    const persona =
      data.mode === "committee"
        ? "You are simulating a real admission committee deliberation: blunt, specific, decision-oriented."
        : "You are a meticulous admissions essay reviewer.";
    const raw = await callAI([
      { role: "system", content: `${persona} Reply only with strict JSON.` },
      {
        role: "user",
        content: `Review this ${data.docType}${data.target ? ` for ${data.target}` : ""}.
Return STRICT JSON: {"overall":0-100,"authenticity":0-100,"readability":"grade level + 1 comment","verdict":"admit-leaning|borderline|reject-leaning","criteria":[{"name":"Structure|Storytelling|Motivation|Career goals|Academic fit|University fit|Research alignment|Grammar|Vocabulary|Flow|Originality","score":0-100,"comment":"..."}],"lineEdits":[{"quote":"...","issue":"...","rewrite":"..."}],"clicheFlags":["overused or AI-sounding phrases found"],"committeeNotes":["what a reader would say in the room"],"checklist":[{"item":"...","done":true}],"topFixes":["3 highest-impact fixes"]}
Verified student profile (use to judge authenticity/consistency): ${digest(ctx)}
Essay: ${data.content}`,
      },
    ]);
    return parseJson<any>(raw, { overall: 0, criteria: [], lineEdits: [], topFixes: [], checklist: [] });
  });

/** Rewrite a passage for tone, clarity, or a specific university. */
export const essayRefine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { content: string; instruction: string; target?: string }) => ({
    content: String(d.content ?? "").slice(0, 12000),
    instruction: String(d.instruction ?? "improve clarity").slice(0, 300),
    target: (d.target ?? "").slice(0, 160),
  }))
  .handler(async ({ data }) => {
    const raw = await callAI([
      { role: "system", content: "You are an essay line editor. Preserve the writer's voice and facts. Return only the rewritten text." },
      {
        role: "user",
        content: `Instruction: ${data.instruction}${data.target ? `\nOptimise for: ${data.target}` : ""}\n\nText:\n${data.content}`,
      },
    ]);
    return { text: raw.trim() };
  });
