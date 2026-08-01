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
