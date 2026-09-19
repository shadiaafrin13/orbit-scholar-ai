import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

async function callAI(messages: ChatMsg[]): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "openai/gpt-6-astra", reasoning_effort: "low", messages }),
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

async function loadContext(supabase: any, userId: string) {
  const [{ data: profile }, { data: activities }, { data: apps }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("activities").select("title,category,role,organization,hours_per_week,impact").eq("user_id", userId).limit(40),
    supabase.from("applications").select("university_name,program,round,status,deadline").eq("user_id", userId).limit(40),
  ]);
  return { profile, activities: activities ?? [], apps: apps ?? [] };
}

/** M07 — AI college list optimizer + university matcher (reach/target/safety). */
export const ugCollegeList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number }) => ({ limit: Math.min(Math.max(d.limit ?? 10, 6), 16) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [{ profile }, { data: unis }] = await Promise.all([
      loadContext(supabase, userId),
      supabase
        .from("universities")
        .select("id,name,country,world_rank,acceptance_rate,tuition_usd,avg_gpa,ielts_min,toefl_min,programs")
        .contains("levels", ["UG"])
        .limit(180),
    ]);
    if (!profile) return { picks: [], note: "Complete your profile first." };
    const raw = await callAI([
      { role: "system", content: "You are an undergraduate admissions counselor. Reply only with strict JSON." },
      {
        role: "user",
        content: `Build a balanced undergraduate college list of ${data.limit} schools (mix of reach/target/safety) for this student.
Return STRICT JSON: {"picks":[{"id":"<uuid>","name":"<name>","band":"reach|target|safety","fit":0-100,"reason":"1-2 sentences","suggestedRound":"ED|EA|RD|Rolling"}],"strategy":"2-3 sentence list strategy"}
Student: ${JSON.stringify({
          pathway: profile.ug_pathway,
          gpa: profile.gpa,
          sat: profile.sat,
          ielts: profile.ielts,
          toefl: profile.toefl,
          field: profile.field_of_study,
          countries: profile.target_countries,
          budget: profile.path_budget,
          interests: profile.interests,
          activities: profile.activities,
        })}
Choose ONLY from: ${JSON.stringify(unis ?? [])}`,
      },
    ]);
    return parseJson<{ picks: any[]; strategy?: string }>(raw, { picks: [], strategy: "" });
  });

/** M07 — AI application readiness score across the UG pipeline. */
export const ugReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const ctx = await loadContext(supabase, userId);
    if (!ctx.profile) return { score: 0, summary: "Complete your profile first.", pillars: [], nextSteps: [] };
    const raw = await callAI([
      { role: "system", content: "You score undergraduate application readiness. Reply only with strict JSON." },
      {
        role: "user",
        content: `Return STRICT JSON: {"score":0-100,"summary":"2 sentences","pillars":[{"name":"Academics|Testing|Activities|Essays|Recommendations|Finances|Applications","score":0-100,"note":"short"}],"nextSteps":["..."],"timeline":[{"month":"e.g. Sep 2026","actions":["..."]}]}
Data: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson(raw, { score: 0, summary: "Could not parse AI response.", pillars: [], nextSteps: [], timeline: [] });
  });

/** M07 — AI essay reviewer (personal statement, supplements) with scoring + grammar. */
export const ugEssayReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { essay: string; kind: string; university?: string; prompt?: string }) => {
    if (!d.essay || d.essay.trim().length < 40) throw new Error("Write at least a few sentences first.");
    return { essay: d.essay.slice(0, 12000), kind: d.kind, university: d.university ?? "", prompt: d.prompt ?? "" };
  })
  .handler(async ({ data }) => {
    const raw = await callAI([
      { role: "system", content: "You are a strict but supportive admissions essay reviewer. Reply only with strict JSON." },
      {
        role: "user",
        content: `Review this ${data.kind}${data.university ? ` for ${data.university}` : ""}.${data.prompt ? ` Prompt: ${data.prompt}` : ""}
Return STRICT JSON: {"score":0-100,"rubric":[{"name":"Hook|Story|Voice|Specificity|Structure|Fit","score":0-100,"note":"short"}],"strengths":["..."],"fixes":["..."],"grammar":[{"issue":"...","suggestion":"..."}],"originalityRisk":"low|medium|high","originalityNote":"why","rewrittenOpening":"a stronger 2-3 sentence opening"}
Essay: """${data.essay}"""`,
      },
    ]);
    return parseJson(raw, { score: 0, rubric: [], strengths: [], fixes: [], grammar: [], originalityRisk: "low", originalityNote: "", rewrittenOpening: "" });
  });

/** M07 — AI mock interview: generates questions, or evaluates an answer. */
export const ugInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mode: "questions" | "evaluate"; interviewType: string; question?: string; answer?: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    if (data.mode === "questions") {
      const { profile } = await loadContext(supabase, userId);
      const raw = await callAI([
        { role: "system", content: "You are an admissions interviewer. Reply only with strict JSON." },
        {
          role: "user",
          content: `Generate 6 realistic ${data.interviewType} questions for an undergraduate applicant.
Return STRICT JSON: {"questions":["..."]}
Applicant: ${JSON.stringify({ field: profile?.field_of_study, countries: profile?.target_countries, interests: profile?.interests, pathway: profile?.ug_pathway })}`,
        },
      ]);
      return parseJson<{ questions: string[] }>(raw, { questions: [] });
    }
    const raw = await callAI([
      { role: "system", content: "You evaluate interview answers. Reply only with strict JSON." },
      {
        role: "user",
        content: `Evaluate this answer to a ${data.interviewType} question.
Return STRICT JSON: {"score":0-100,"confidence":0-100,"communication":0-100,"structure":0-100,"feedback":"2-3 sentences","improve":["..."],"modelAnswer":"a strong 4-6 sentence answer"}
Question: ${data.question}
Answer: """${(data.answer ?? "").slice(0, 6000)}"""`,
      },
    ]);
    return parseJson(raw, { score: 0, confidence: 0, communication: 0, structure: 0, feedback: "", improve: [], modelAnswer: "" });
  });

/** M07 — AI activity profile analyzer + scholarship/aid estimation. */
export const ugProfileAnalyzer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const ctx = await loadContext(supabase, userId);
    const { data: schs } = await supabase
      .from("scholarships")
      .select("id,name,provider,country,amount,deadline,fully_funded,eligibility")
      .ilike("level", "%UG%")
      .limit(80);
    const raw = await callAI([
      { role: "system", content: "You analyze undergraduate extracurricular profiles and match funding. Reply only with strict JSON." },
      {
        role: "user",
        content: `Return STRICT JSON: {"spike":"the student's strongest theme","tiers":[{"activity":"...","tier":1-4,"note":"short"}],"gaps":["..."],"boosters":["concrete next actions"],"scholarships":[{"id":"<uuid>","name":"...","why":"1 sentence","matchPct":0-100}],"aidEstimate":{"needBasedLikelihood":"low|medium|high","meritLikelihood":"low|medium|high","note":"1-2 sentences"}}
Student: ${JSON.stringify(ctx)}
Scholarships (choose only from these): ${JSON.stringify(schs ?? [])}`,
      },
    ]);
    return parseJson(raw, { spike: "", tiers: [], gaps: [], boosters: [], scholarships: [], aidEstimate: null });
  });

/** M07 — Eligibility engine: compares the student profile to one program's requirements. */
export const ugEligibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { universityId?: string; universityName?: string; program?: string }) => ({
    universityId: d.universityId ?? "",
    universityName: d.universityName ?? "",
    program: d.program ?? "",
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { profile } = await loadContext(supabase, userId);
    let uni: any = null;
    if (data.universityId) {
      const { data: u } = await supabase.from("universities").select("*").eq("id", data.universityId).maybeSingle();
      uni = u;
    }
    const raw = await callAI([
      { role: "system", content: "You check undergraduate eligibility. Never guarantee admission. Clearly separate official data from your own interpretation. Reply only with strict JSON." },
      {
        role: "user",
        content: `Compare the student profile with the program requirements.
Return STRICT JSON: {"overall":"appears eligible|information required|potential gaps","checks":[{"requirement":"GPA|Subjects|English|SAT/ACT|Curriculum|Activities|Documents","programValue":"what the program asks (say 'not in Atlas data' if unknown)","studentValue":"what the student has","status":"satisfied|info_required|gap|not_completed","source":"atlas_data|ai_interpretation","note":"short"}],"gapActions":["..."],"verifyOfficially":["what the student must confirm on the official website"]}
Student: ${JSON.stringify({ gpa: profile?.gpa, sat: profile?.sat, act: (profile as any)?.act, ielts: profile?.ielts, toefl: profile?.toefl, curriculum: (profile as any)?.curriculum, subjects: (profile as any)?.subjects, field: profile?.field_of_study, activities: profile?.activities })}
Program: ${JSON.stringify({ university: uni?.name ?? data.universityName, program: data.program, requirements: uni })}`,
      },
    ]);
    return parseJson(raw, { overall: "information required", checks: [], gapActions: [], verifyOfficially: [] });
  });

/** M07 — Undergraduate fit analyzer (academic, requirement, financial, career, ECA). */
export const ugFit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { universityId?: string; program?: string }) => ({ universityId: d.universityId ?? "", program: d.program ?? "" }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const ctx = await loadContext(supabase, userId);
    let uni: any = null;
    if (data.universityId) {
      const { data: u } = await supabase.from("universities").select("*").eq("id", data.universityId).maybeSingle();
      uni = u;
    }
    const raw = await callAI([
      { role: "system", content: "You analyze undergraduate fit. Fit is a planning estimate, never an admission probability. Reply only with strict JSON." },
      {
        role: "user",
        content: `Return STRICT JSON: {"bands":[{"name":"Academic fit|Requirement fit|Financial fit|Career alignment|Program alignment|ECA alignment","rating":"Strong|Moderate|Needs improvement","note":"short"}],"gaps":["..."],"actions":["..."],"summary":"2 sentences"}
Student: ${JSON.stringify(ctx)}
Target: ${JSON.stringify({ program: data.program, university: uni })}`,
      },
    ]);
    return parseJson(raw, { bands: [], gaps: [], actions: [], summary: "" });
  });

/** M07 — Application copilot: per-application requirement checklist + quality check. */
export const ugCopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { applicationId: string; mode: "checklist" | "quality" }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [{ profile, activities }, { data: app }, { data: docs }] = await Promise.all([
      loadContext(supabase, userId),
      supabase.from("applications").select("*").eq("id", data.applicationId).eq("user_id", userId).maybeSingle(),
      supabase.from("documents").select("title,category,doc_type,status,expiry_date").eq("user_id", userId).limit(60),
    ]);
    if (!app) throw new Error("Application not found");
    if (data.mode === "checklist") {
      const raw = await callAI([
        { role: "system", content: "You build undergraduate application checklists. Mark items you inferred as ai_interpretation. Reply only with strict JSON." },
        {
          role: "user",
          content: `Return STRICT JSON: {"items":[{"item":"...","category":"Academic|Testing|Essays|Recommendations|Documents|Financial|Portfolio|Admin","required":"required|recommended|optional|not_required","have":true,"source":"atlas_data|ai_interpretation","action":"short next step"}],"missing":["..."],"note":"1-2 sentences"}
Application: ${JSON.stringify(app)}
Student: ${JSON.stringify({ profile, activities })}
Documents on file: ${JSON.stringify(docs ?? [])}`,
        },
      ]);
      return parseJson(raw, { items: [], missing: [], note: "" });
    }
    const raw = await callAI([
      { role: "system", content: "You run undergraduate application quality checks. Reply only with strict JSON." },
      {
        role: "user",
        content: `Return STRICT JSON: {"verdict":"READY|NEEDS ATTENTION|HIGH RISK","score":0-100,"issues":[{"area":"...","severity":"low|medium|high","issue":"...","fix":"..."}],"strengths":["..."],"beforeSubmitting":["..."]}
Application: ${JSON.stringify(app)}
Student: ${JSON.stringify({ profile, activities })}
Documents on file: ${JSON.stringify(docs ?? [])}`,
      },
    ]);
    return parseJson(raw, { verdict: "NEEDS ATTENTION", score: 0, issues: [], strengths: [], beforeSubmitting: [] });
  });

/** M07 — Decision center + visa & pre-departure planning. */
export const ugDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mode: "decision" | "visa"; country?: string }) => ({ mode: d.mode, country: d.country ?? "" }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [{ profile, apps }, { data: offers }] = await Promise.all([
      loadContext(supabase, userId),
      supabase.from("offers").select("*").eq("user_id", userId).limit(30),
    ]);
    if (data.mode === "decision") {
      const raw = await callAI([
        { role: "system", content: "You help compare undergraduate offers. The student always keeps the final decision. Reply only with strict JSON." },
        {
          role: "user",
          content: `Return STRICT JSON: {"comparison":[{"offer":"university","netCostNote":"...","funding":"...","conditions":"...","deadlineNote":"...","pros":["..."],"cons":["..."]}],"considerations":["..."],"summary":"2-3 sentences, no instruction to pick one"}
Offers: ${JSON.stringify(offers ?? [])}
Student: ${JSON.stringify({ budget: profile?.path_budget, countries: profile?.target_countries, career: (profile as any)?.career_goal })}`,
        },
      ]);
      return parseJson(raw, { comparison: [], considerations: [], summary: "" });
    }
    const raw = await callAI([
      { role: "system", content: "You prepare student visa and pre-departure plans. Immigration rules change — always tell the student to verify with the official authority. Reply only with strict JSON." },
      {
        role: "user",
        content: `Return STRICT JSON: {"country":"...","visaSteps":[{"step":"...","documents":["..."],"timing":"...","note":"short"}],"financialProof":["..."],"preDeparture":["..."],"arrivalFirstWeek":["..."],"verifyOfficially":["..."],"disclaimer":"one sentence"}
Destination: ${data.country || (profile?.target_countries ?? [])[0] || "unspecified"}
Nationality: ${profile?.country ?? "unspecified"}
Applications: ${JSON.stringify(apps)}`,
      },
    ]);
    return parseJson(raw, { country: data.country, visaSteps: [], financialProof: [], preDeparture: [], arrivalFirstWeek: [], verifyOfficially: [], disclaimer: "" });
  });

/** M07 — Undergraduate AI dashboard: next best action + roadmap. */
export const ugDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [ctx, { data: docs }, { data: tasks }] = await Promise.all([
      loadContext(supabase, userId),
      supabase.from("documents").select("title,category,status,expiry_date").eq("user_id", userId).limit(60),
      supabase.from("tasks").select("title,due_date,completed").eq("user_id", userId).limit(80),
    ]);
    const raw = await callAI([
      { role: "system", content: "You are an undergraduate admissions planner. Reply only with strict JSON." },
      {
        role: "user",
        content: `Return STRICT JSON: {"nextBestAction":{"action":"...","why":"...","effort":"short|medium|long"},"alerts":[{"kind":"deadline|missing document|test|essay|funding","text":"...","urgency":"low|medium|high"}],"plan12Months":[{"window":"months 1-3|4-6|7-9|10-12","focus":"...","actions":["..."]}],"next30Days":["..."],"weeklyTasks":["..."]}
Student: ${JSON.stringify(ctx)}
Documents: ${JSON.stringify(docs ?? [])}
Tasks: ${JSON.stringify(tasks ?? [])}`,
      },
    ]);
    return parseJson(raw, { nextBestAction: null, alerts: [], plan12Months: [], next30Days: [], weeklyTasks: [] });
  });
