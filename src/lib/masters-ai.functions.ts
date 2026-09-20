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
  const [{ data: profile }, { data: pubs }, { data: apps }, { data: profs }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("publications").select("title,venue,year,type,citations").eq("user_id", userId).limit(30),
    supabase.from("applications").select("university_name,program,level,status,deadline,decision").eq("user_id", userId).limit(40),
    supabase.from("professor_contacts").select("name,university,department,research_area,status").eq("user_id", userId).limit(40),
  ]);
  return { profile, publications: pubs ?? [], apps: apps ?? [], professors: profs ?? [] };
}

/** M08 — AI Master's program matcher (fit + funding likelihood). */
export const mastersProgramMatcher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number; specialization?: string }) => ({
    limit: Math.min(Math.max(d.limit ?? 10, 6), 16),
    specialization: (d.specialization ?? "").slice(0, 200),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [ctx, { data: unis }] = await Promise.all([
      loadContext(supabase, userId),
      supabase
        .from("universities")
        .select("id,name,country,world_rank,acceptance_rate,tuition_usd,avg_gpa,ielts_min,toefl_min,gre_required,gmat_required,programs,research_areas,employability_rank")
        .contains("levels", ["PG"])
        .limit(180),
    ]);
    if (!ctx.profile) return { picks: [], strategy: "", note: "Complete your profile first." };
    const raw = await callAI([
      { role: "system", content: "You are a graduate admissions advisor. Reply only with strict JSON." },
      {
        role: "user",
        content: `Build a balanced Master's program list of ${data.limit} programs (reach/target/safety) for this applicant${data.specialization ? ` focused on: ${data.specialization}` : ""}.
Return STRICT JSON: {"picks":[{"id":"<uuid>","name":"<university>","program":"<suggested master's program>","band":"reach|target|safety","fit":0-100,"funding":"low|medium|high","reason":"1-2 sentences","intake":"e.g. Fall 2027"}],"strategy":"2-3 sentence strategy"}
Applicant: ${JSON.stringify({
          pathway: ctx.profile.masters_pathway,
          gpa: ctx.profile.gpa,
          gre: ctx.profile.gre,
          gmat: ctx.profile.gmat,
          ielts: ctx.profile.ielts,
          toefl: ctx.profile.toefl,
          field: ctx.profile.field_of_study,
          countries: ctx.profile.target_countries,
          budget: ctx.profile.path_budget,
          interests: ctx.profile.interests,
          work: ctx.profile.work_experience,
          publications: ctx.publications,
        })}
Choose ONLY from: ${JSON.stringify(unis ?? [])}`,
      },
    ]);
    return parseJson<{ picks: any[]; strategy?: string }>(raw, { picks: [], strategy: "" });
  });

/** M08 — AI admission predictor for a specific Master's program. */
export const mastersAdmissionPredictor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { university: string; program?: string }) => {
    if (!d.university?.trim()) throw new Error("Pick a university first.");
    return { university: d.university.slice(0, 200), program: (d.program ?? "").slice(0, 200) };
  })
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You predict graduate admission chances realistically. Reply only with strict JSON." },
      {
        role: "user",
        content: `Predict admission chance for a Master's application to ${data.university}${data.program ? ` — ${data.program}` : ""}.
Return STRICT JSON: {"chance":0-100,"band":"low|moderate|strong","summary":"2 sentences","strengths":["..."],"gaps":["..."],"actions":["concrete steps to raise the odds"],"fundingChance":0-100}
Applicant: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson(raw, { chance: 0, band: "low", summary: "Could not parse AI response.", strengths: [], gaps: [], actions: [], fundingChance: 0 });
  });

/** M08 — AI funding optimizer + scholarship eligibility. */
export const mastersFundingOptimizer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const ctx = await loadContext(supabase, userId);
    const { data: schs } = await supabase
      .from("scholarships")
      .select("id,name,provider,country,amount,deadline,fully_funded,eligibility,level")
      .limit(120);
    const raw = await callAI([
      { role: "system", content: "You are a graduate funding strategist (scholarships, RA/TA assistantships, fellowships). Reply only with strict JSON." },
      {
        role: "user",
        content: `Return STRICT JSON: {"strategy":"2-3 sentences","scholarships":[{"id":"<uuid>","name":"...","matchPct":0-100,"eligible":"yes|partly|no","why":"1 sentence"}],"assistantships":[{"type":"RA|TA|GA","likelihood":"low|medium|high","how":"1 sentence"}],"fellowships":["..."],"plan":[{"month":"e.g. Oct 2026","actions":["..."]}]}
Applicant: ${JSON.stringify(ctx)}
Scholarships (choose only from these): ${JSON.stringify(schs ?? [])}`,
      },
    ]);
    return parseJson(raw, { strategy: "", scholarships: [], assistantships: [], fellowships: [], plan: [] });
  });

/** M08 — AI document reviewer: SOP, motivation letter, academic CV. */
export const mastersDocReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string; kind: string; program?: string }) => {
    if (!d.text || d.text.trim().length < 40) throw new Error("Write at least a few sentences first.");
    return { text: d.text.slice(0, 14000), kind: d.kind, program: (d.program ?? "").slice(0, 200) };
  })
  .handler(async ({ data }) => {
    const raw = await callAI([
      { role: "system", content: "You are a strict graduate admissions document reviewer. Reply only with strict JSON." },
      {
        role: "user",
        content: `Review this ${data.kind}${data.program ? ` targeting ${data.program}` : ""}.
Return STRICT JSON: {"score":0-100,"rubric":[{"name":"Motivation|Research fit|Evidence|Structure|Clarity|Program fit","score":0-100,"note":"short"}],"strengths":["..."],"fixes":["..."],"grammar":[{"issue":"...","suggestion":"..."}],"rewrittenOpening":"a stronger 2-3 sentence opening"}
Document: """${data.text}"""`,
      },
    ]);
    return parseJson(raw, { score: 0, rubric: [], strengths: [], fixes: [], grammar: [], rewrittenOpening: "" });
  });

/** M08 — AI professor matcher + outreach email generator. */
export const mastersProfessorAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mode: "match" | "email"; area?: string; professor?: string; university?: string; department?: string }) => d)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    if (data.mode === "match") {
      const raw = await callAI([
        { role: "system", content: "You match applicants to graduate faculty and research groups. Reply only with strict JSON." },
        {
          role: "user",
          content: `Suggest 6 realistic professors / research groups to target for a Master's in ${data.area || ctx.profile?.field_of_study || "the applicant's field"}.
Return STRICT JSON: {"matches":[{"name":"...","university":"...","department":"...","researchArea":"...","lab":"...","compatibility":0-100,"why":"1 sentence","openingLine":"a personalized first line for an email"}]}
Applicant: ${JSON.stringify(ctx)}`,
        },
      ]);
      return parseJson<{ matches: any[] }>(raw, { matches: [] });
    }
    const raw = await callAI([
      { role: "system", content: "You write concise, credible academic outreach emails. Reply only with strict JSON." },
      {
        role: "user",
        content: `Write an outreach email to Prof. ${data.professor} (${data.department ?? ""}, ${data.university ?? ""}) about Master's supervision / assistantship.
Return STRICT JSON: {"subject":"...","body":"180-250 word email, plain text with line breaks","tips":["..."]}
Applicant: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson(raw, { subject: "", body: "", tips: [] });
  });

/** M08 — AI mock graduate interview: questions or answer evaluation. */
export const mastersInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mode: "questions" | "evaluate"; interviewType: string; question?: string; answer?: string }) => d)
  .handler(async ({ context, data }) => {
    if (data.mode === "questions") {
      const ctx = await loadContext(context.supabase, context.userId);
      const raw = await callAI([
        { role: "system", content: "You are a graduate admissions / faculty interviewer. Reply only with strict JSON." },
        {
          role: "user",
          content: `Generate 6 realistic ${data.interviewType} questions for a Master's applicant.
Return STRICT JSON: {"questions":["..."]}
Applicant: ${JSON.stringify({ field: ctx.profile?.field_of_study, interests: ctx.profile?.interests, work: ctx.profile?.work_experience, publications: ctx.publications })}`,
        },
      ]);
      return parseJson<{ questions: string[] }>(raw, { questions: [] });
    }
    const raw = await callAI([
      { role: "system", content: "You evaluate graduate interview answers. Reply only with strict JSON." },
      {
        role: "user",
        content: `Evaluate this answer to a ${data.interviewType} question.
Return STRICT JSON: {"score":0-100,"confidence":0-100,"communication":0-100,"depth":0-100,"feedback":"2-3 sentences","improve":["..."],"modelAnswer":"a strong 4-6 sentence answer"}
Question: ${data.question}
Answer: """${(data.answer ?? "").slice(0, 6000)}"""`,
      },
    ]);
    return parseJson(raw, { score: 0, confidence: 0, communication: 0, depth: 0, feedback: "", improve: [], modelAnswer: "" });
  });

/** M08 — AI readiness score, timeline manager and career path advice. */
export const mastersReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    if (!ctx.profile) return { score: 0, summary: "Complete your profile first.", pillars: [], nextSteps: [], timeline: [], careers: [] };
    const raw = await callAI([
      { role: "system", content: "You score Master's application readiness and advise on careers. Reply only with strict JSON." },
      {
        role: "user",
        content: `Return STRICT JSON: {"score":0-100,"summary":"2 sentences","pillars":[{"name":"Academics|Tests|Research|Documents|Recommenders|Funding|Applications","score":0-100,"note":"short"}],"nextSteps":["..."],"timeline":[{"month":"e.g. Sep 2026","actions":["..."]}],"careers":[{"path":"...","why":"1 sentence"}]}
Data: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson(raw, { score: 0, summary: "Could not parse AI response.", pillars: [], nextSteps: [], timeline: [], careers: [] });
  });

/** M08 — Admission requirements classifier + course/prerequisite analyzer for one program. */
export const mastersRequirements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { university: string; program?: string; coursework?: string }) => {
    if (!d.university?.trim()) throw new Error("Pick a university first.");
    return {
      university: d.university.slice(0, 200),
      program: (d.program ?? "").slice(0, 200),
      coursework: (d.coursework ?? "").slice(0, 4000),
    };
  })
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You map Master's admission requirements and academic prerequisites. Never invent official policy — mark anything uncertain. Reply only with strict JSON." },
      {
        role: "user",
        content: `Analyse typical admission requirements for ${data.university}${data.program ? ` — ${data.program}` : ""} and compare them with the applicant's coursework.
Return STRICT JSON: {"note":"1 sentence reminder to verify on the official program page","academic":[{"item":"...","status":"REQUIRED|RECOMMENDED|OPTIONAL|NOT REQUIRED","detail":"short"}],"testing":[{"item":"...","status":"REQUIRED|RECOMMENDED|OPTIONAL|NOT REQUIRED","detail":"short"}],"materials":[{"item":"CV|SOP|Recommendation letters|Writing sample|Portfolio|Research proposal|Interview","status":"REQUIRED|RECOMMENDED|OPTIONAL|NOT REQUIRED","detail":"short"}],"prerequisites":{"expected":["..."],"covered":["..."],"missing":["..."],"strongAreas":["..."],"preparation":[{"gap":"...","how":"course|certification|self-study|project","suggestion":"..."}]},"packageMissing":["application components the applicant has not evidenced yet"]}
Applicant coursework (free text): """${data.coursework}"""
Applicant: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson(raw, { note: "", academic: [], testing: [], materials: [], prerequisites: {}, packageMissing: [] });
  });

/** M08 — Five-dimension fit analyzer (estimate only, not an admission probability). */
export const mastersFitAnalyzer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { university: string; program?: string; specialization?: string }) => {
    if (!d.university?.trim()) throw new Error("Pick a university first.");
    return { university: d.university.slice(0, 200), program: (d.program ?? "").slice(0, 200), specialization: (d.specialization ?? "").slice(0, 200) };
  })
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You analyse Master's programme fit. Fit is an estimate, never an admission probability or guarantee. Reply only with strict JSON." },
      {
        role: "user",
        content: `Analyse fit for ${data.university}${data.program ? ` — ${data.program}` : ""}${data.specialization ? ` (${data.specialization})` : ""}.
Return STRICT JSON: {"summary":"2 sentences","fit":[{"name":"Academic fit|Program fit|Research fit|Career fit|Financial fit","score":0-100,"note":"1 sentence"}],"missingRequirements":["..."],"preparationPriorities":[{"priority":"high|medium|low","action":"..."}],"disclaimer":"Fit is an estimate, not an admission probability."}
Applicant: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson(raw, { summary: "", fit: [], missingRequirements: [], preparationPriorities: [], disclaimer: "" });
  });

/** M08 — Specialization matcher. */
export const mastersSpecializationMatcher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You recommend Master's specializations. Reply only with strict JSON." },
      {
        role: "user",
        content: `Recommend 6 specializations based on academic background, skills, research interests, career goals, projects, work experience and industry demand.
Return STRICT JSON: {"summary":"2 sentences","specializations":[{"name":"...","match":0-100,"why":"1 sentence","buildsOn":["..."],"skillsToAdd":["..."],"careers":["..."],"demand":"low|moderate|high"}],"researchVsProfessional":"which track suits this applicant and why (2 sentences)"}
Applicant: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson(raw, { summary: "", specializations: [], researchVsProfessional: "" });
  });

/** M08 — Pre-submission application quality check (READY / NEEDS ATTENTION / HIGH RISK). */
export const mastersQualityCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { applicationId?: string; university: string; program?: string }) => {
    if (!d.university?.trim()) throw new Error("Pick an application first.");
    return { university: d.university.slice(0, 200), program: (d.program ?? "").slice(0, 200) };
  })
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You run a strict pre-submission Master's application quality check. Reply only with strict JSON." },
      {
        role: "user",
        content: `Quality-check the application to ${data.university}${data.program ? ` — ${data.program}` : ""}.
Return STRICT JSON: {"verdict":"READY|NEEDS ATTENTION|HIGH RISK","score":0-100,"summary":"2 sentences","checks":[{"area":"Program requirements|Academic|Coursework|Tests|SOP|CV|Recommendations|Writing sample|Portfolio|Financial|Deadline|Document completeness","status":"ok|attention|risk","note":"short"}],"blockers":["..."],"fixBeforeSubmitting":["..."]}
Applicant data: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson(raw, { verdict: "NEEDS ATTENTION", score: 0, summary: "", checks: [], blockers: [], fixBeforeSubmitting: [] });
  });

/** M08 — Decision center: compare offers, cost vs funding (student keeps final authority). */
export const mastersDecisionAdvisor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { offers: string }) => {
    if (!d.offers?.trim()) throw new Error("Add at least one offer first.");
    return { offers: d.offers.slice(0, 6000) };
  })
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You compare Master's offers objectively. The student retains final decision authority — advise, never decide. Reply only with strict JSON." },
      {
        role: "user",
        content: `Compare these offers and highlight cost vs funding, conditions, deposits and response deadlines.
Return STRICT JSON: {"summary":"2-3 sentences","comparison":[{"university":"...","program":"...","netCost":"...","fundingStrength":"low|medium|high","conditions":"...","deposit":"...","responseDeadline":"...","pros":["..."],"cons":["..."],"overall":0-100}],"questionsToAsk":["..."],"deadlineActions":["..."],"disclaimer":"The final decision is yours."}
Offers (free text from the student): """${data.offers}"""
Applicant: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson(raw, { summary: "", comparison: [], questionsToAsk: [], deadlineActions: [], disclaimer: "" });
  });

/** M08 — AI roadmap: 12-month / 6-month / 90-day / 30-day plans + weekly and daily focus. */
export const mastersRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { intake?: string }) => ({ intake: (d?.intake ?? "").slice(0, 60) }))
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You build Master's application roadmaps. Reply only with strict JSON." },
      {
        role: "user",
        content: `Build a Master's application roadmap${data.intake ? ` for a ${data.intake} intake` : ""}. Today is ${new Date().toISOString().slice(0, 10)}.
Return STRICT JSON: {"nextBestAction":{"action":"...","why":"1 sentence","doBy":"date or timeframe"},"twelveMonth":[{"window":"e.g. Months 1-3","focus":"...","actions":["..."]}],"sixMonth":[{"window":"...","focus":"...","actions":["..."]}],"ninetyDay":[{"window":"e.g. Weeks 1-4","actions":["..."]}],"thirtyDay":[{"window":"e.g. Week 1","actions":["..."]}],"weeklyTasks":["..."],"dailyPriorities":["..."]}
Applicant data: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson(raw, { nextBestAction: null, twelveMonth: [], sixMonth: [], ninetyDay: [], thirtyDay: [], weeklyTasks: [], dailyPriorities: [] });
  });
