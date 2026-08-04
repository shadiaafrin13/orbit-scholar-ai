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

async function loadResearcher(supabase: any, userId: string) {
  const [{ data: profile }, { data: pubs }, { data: manus }, { data: acts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("publications").select("title,venue,year,type,citations,coauthors").eq("user_id", userId).limit(40),
    supabase.from("manuscripts").select("title,target_venue,venue_type,stage,revision_round").eq("user_id", userId).limit(40),
    supabase.from("activities").select("title,category,role,organization,impact").eq("user_id", userId).limit(25),
  ]);
  return { profile, publications: pubs ?? [], manuscripts: manus ?? [], activities: acts ?? [] };
}

function who(ctx: Awaited<ReturnType<typeof loadResearcher>>) {
  const p = ctx.profile ?? {};
  return JSON.stringify({
    level: p.current_level,
    field: p.field_of_study,
    gpa: p.gpa,
    interests: p.interests,
    countries: p.target_countries,
    work: p.work_experience,
    honors: p.honors,
    publications: ctx.publications,
    manuscripts: ctx.manuscripts,
    activities: ctx.activities,
  });
}

/** M11 — match the researcher to catalog research opportunities. */
export const researchOpportunityMatcher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { topic?: string }) => ({ topic: (d.topic ?? "").slice(0, 300) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [ctx, { data: ops }] = await Promise.all([
      loadResearcher(supabase, userId),
      supabase
        .from("research_opportunities")
        .select("id,title,host,country,category,level,mode,field,funded,stipend,deadline")
        .limit(200),
    ]);
    const raw = await callAI([
      { role: "system", content: "You are a research placement advisor. Reply only with strict JSON." },
      {
        role: "user",
        content: `Rank the 8 best research opportunities for this student${data.topic ? ` focused on: ${data.topic}` : ""}.
Return STRICT JSON: {"picks":[{"id":"<uuid>","title":"...","host":"...","fit":0-100,"band":"reach|target|safety","reason":"1-2 sentences","action":"next step"}],"strategy":"3 sentences"}
Student: ${who(ctx)}
Choose ONLY from: ${JSON.stringify(ops ?? [])}`,
      },
    ]);
    return parseJson<{ picks: any[]; strategy?: string }>(raw, { picks: [], strategy: "" });
  });

/** M11 — professor / lab / supervisor matcher over the directory. */
export const researchProfessorMatcher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { topic?: string; goal?: string }) => ({
    topic: (d.topic ?? "").slice(0, 300),
    goal: (d.goal ?? "research position").slice(0, 80),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [ctx, { data: profs }] = await Promise.all([
      loadResearcher(supabase, userId),
      supabase
        .from("professors")
        .select("id,name,university,department,country,research_areas,keywords,h_index,open_positions,accepting_students,collaboration_open,lab_name")
        .limit(200),
    ]);
    const raw = await callAI([
      { role: "system", content: "You are an academic networking advisor. Reply only with strict JSON." },
      {
        role: "user",
        content: `Recommend 6 professors/labs for a student seeking a ${data.goal}${data.topic ? ` in ${data.topic}` : ""}.
Return STRICT JSON: {"picks":[{"id":"<uuid>","name":"...","university":"...","score":0-100,"lab_fit":"...","why":"1-2 sentences","approach":"how to contact"}],"summary":"2 sentences"}
Student: ${who(ctx)}
Choose ONLY from: ${JSON.stringify(profs ?? [])}`,
      },
    ]);
    return parseJson<{ picks: any[]; summary?: string }>(raw, { picks: [], summary: "" });
  });

/** M11 — journal recommender with publication-readiness score. */
export const researchJournalRecommender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title?: string; abstract?: string }) => ({
    title: (d.title ?? "").slice(0, 300),
    abstract: (d.abstract ?? "").slice(0, 6000),
  }))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: journals } = await supabase
      .from("journals")
      .select("id,name,publisher,field,scope,impact_factor,quartile,apc_usd,acceptance_rate,review_weeks,open_access")
      .limit(200);
    const raw = await callAI([
      { role: "system", content: "You are a scholarly publishing advisor. Reply only with strict JSON." },
      {
        role: "user",
        content: `Recommend the 6 best journals for this manuscript and score its publication readiness.
Return STRICT JSON: {"readiness":0-100,"verdict":"1 sentence","picks":[{"id":"<uuid>","name":"...","fit":0-100,"tier":"stretch|solid|fallback","why":"1 sentence","timeline":"expected weeks"}],"improvements":["..."]}
Title: ${data.title}
Abstract: ${data.abstract}
Choose ONLY from: ${JSON.stringify(journals ?? [])}`,
      },
    ]);
    return parseJson<{ readiness: number; verdict: string; picks: any[]; improvements: string[] }>(raw, {
      readiness: 0,
      verdict: "",
      picks: [],
      improvements: [],
    });
  });

/** M11 — conference recommender. */
export const researchConferenceRecommender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { topic?: string }) => ({ topic: (d.topic ?? "").slice(0, 400) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [ctx, { data: confs }] = await Promise.all([
      loadResearcher(supabase, userId),
      supabase
        .from("conferences")
        .select("id,name,organizer,field,topics,location,country,format,start_date,paper_deadline,acceptance_rate,travel_grants")
        .limit(200),
    ]);
    const raw = await callAI([
      { role: "system", content: "You are a conference strategy advisor. Reply only with strict JSON." },
      {
        role: "user",
        content: `Recommend 6 conferences for this researcher${data.topic ? ` working on ${data.topic}` : ""}, ordered by deadline feasibility.
Return STRICT JSON: {"picks":[{"id":"<uuid>","name":"...","fit":0-100,"why":"1 sentence","prep":"what to submit and by when"}],"plan":"2-3 sentences"}
Researcher: ${who(ctx)}
Choose ONLY from: ${JSON.stringify(confs ?? [])}`,
      },
    ]);
    return parseJson<{ picks: any[]; plan?: string }>(raw, { picks: [], plan: "" });
  });

/** M11 — grant / funding matcher. */
export const researchGrantMatcher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { topic?: string }) => ({ topic: (d.topic ?? "").slice(0, 300) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [ctx, { data: grants }] = await Promise.all([
      loadResearcher(supabase, userId),
      supabase.from("research_grants").select("id,name,funder,type,country,amount,eligibility,fields,deadline").limit(200),
    ]);
    const raw = await callAI([
      { role: "system", content: "You are a research funding advisor. Reply only with strict JSON." },
      {
        role: "user",
        content: `Match this researcher to 6 funding programs${data.topic ? ` for work on ${data.topic}` : ""}.
Return STRICT JSON: {"picks":[{"id":"<uuid>","name":"...","eligibility":"eligible|partially eligible|not yet","odds":0-100,"why":"1 sentence","prep":"what to prepare"}],"strategy":"3 sentences"}
Researcher: ${who(ctx)}
Choose ONLY from: ${JSON.stringify(grants ?? [])}`,
      },
    ]);
    return parseJson<{ picks: any[]; strategy?: string }>(raw, { picks: [], strategy: "" });
  });

/** M11 — research assistant: topics, gaps, questions, hypotheses, methodology, timeline. */
export const researchAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mode: string; topic?: string; text?: string }) => ({
    mode: d.mode,
    topic: (d.topic ?? "").slice(0, 400),
    text: (d.text ?? "").slice(0, 12000),
  }))
  .handler(async ({ context, data }) => {
    const ctx = await loadResearcher(context.supabase, context.userId);
    const prompts: Record<string, string> = {
      topics: `Generate 6 novel, feasible research topics in "${data.topic}" for this researcher's level.`,
      gaps: `Detect 6 concrete research gaps in "${data.topic}" and why each is under-explored.`,
      questions: `Generate 6 sharp research questions and matching hypotheses for "${data.topic}".`,
      methodology: `Recommend methodology, experimental design, data sources and statistical tests for: ${data.text || data.topic}`,
      literature: `Write a structured literature review outline with themes, seminal-work placeholders and synthesis guidance for "${data.topic}".`,
      summarize: `Summarize this paper/text: key contribution, method, results, limitations, and how to cite it.\n\n${data.text}`,
      timeline: `Build a month-by-month research timeline (12 months) from idea to submission for "${data.topic}".`,
    };
    const instruction = prompts[data.mode] ?? prompts["topics"];
    const raw = await callAI([
      { role: "system", content: "You are a rigorous research mentor. Reply only with strict JSON." },
      {
        role: "user",
        content: `${instruction}
Return STRICT JSON: {"headline":"1 sentence","items":[{"title":"...","detail":"2-4 sentences","tag":"short label"}],"next_steps":["..."]}
Researcher context: ${who(ctx)}`,
      },
    ]);
    return parseJson<{ headline: string; items: any[]; next_steps: string[] }>(raw, {
      headline: "",
      items: [],
      next_steps: [],
    });
  });

/** M11 — reviewer: proposal, abstract, manuscript, peer-review simulation. */
export const researchReviewer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: string; text: string; venue?: string }) => ({
    kind: d.kind,
    text: (d.text ?? "").slice(0, 20000),
    venue: (d.venue ?? "").slice(0, 120),
  }))
  .handler(async ({ data }) => {
    const raw = await callAI([
      { role: "system", content: "You are a strict but constructive peer reviewer. Reply only with strict JSON." },
      {
        role: "user",
        content: `Review this ${data.kind}${data.venue ? ` targeting ${data.venue}` : ""} as a journal referee would.
Return STRICT JSON: {"score":0-100,"recommendation":"accept|minor revision|major revision|reject","scores":{"novelty":0-10,"rigor":0-10,"clarity":0-10,"significance":0-10,"presentation":0-10},"strengths":["..."],"weaknesses":["..."],"reviewer_comments":["numbered referee-style comments"],"citation_suggestions":["topic or work to cite"],"revised_abstract":"improved version"}

${data.text}`,
      },
    ]);
    return parseJson<any>(raw, { score: 0, recommendation: "", scores: {}, strengths: [], weaknesses: [], reviewer_comments: [], citation_suggestions: [], revised_abstract: "" });
  });

/** M11 — reviewer response letter + academic email generator. */
export const researchWriter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: string; context: string; target?: string }) => ({
    kind: d.kind,
    context: (d.context ?? "").slice(0, 12000),
    target: (d.target ?? "").slice(0, 200),
  }))
  .handler(async ({ context, data }) => {
    const ctx = await loadResearcher(context.supabase, context.userId);
    const kinds: Record<string, string> = {
      rebuttal: "Write a point-by-point response letter to reviewers: polite, evidence-based, listing each comment and the change made.",
      professor_email: "Write a concise cold outreach email to a professor requesting a research position or collaboration (subject + body, under 220 words).",
      collaboration: "Write a collaboration proposal email to a peer researcher, proposing a concrete joint project.",
      cover_letter: "Write a journal submission cover letter to the editor.",
    };
    const raw = await callAI([
      { role: "system", content: "You are an academic writing assistant. Reply only with strict JSON." },
      {
        role: "user",
        content: `${kinds[data.kind] ?? kinds["professor_email"]}
Target: ${data.target}
Return STRICT JSON: {"subject":"...","body":"full text with line breaks","tips":["..."]}
Author profile: ${who(ctx)}
Context: ${data.context}`,
      },
    ]);
    return parseJson<{ subject: string; body: string; tips: string[] }>(raw, { subject: "", body: "", tips: [] });
  });

/** M11 — research portfolio + impact analyzer. */
export const researchPortfolioAnalyzer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await loadResearcher(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You are a research career analyst. Reply only with strict JSON." },
      {
        role: "user",
        content: `Analyze this research portfolio and its academic impact.
Return STRICT JSON: {"score":0-100,"stage":"beginner|emerging|competitive|strong","summary":"2 sentences","strengths":["..."],"gaps":["..."],"impact":{"estimated_h_index":0,"citation_outlook":"1 sentence","visibility_actions":["..."]},"citation_optimizer":["concrete steps to raise citations"],"next_90_days":[{"week":"Weeks 1-2","action":"..."}]}
Portfolio: ${who(ctx)}`,
      },
    ]);
    return parseJson<any>(raw, { score: 0, stage: "", summary: "", strengths: [], gaps: [], impact: {}, citation_optimizer: [], next_90_days: [] });
  });

/** M11 — collaborator finder + literature search assistant. */
export const researchCollaborationFinder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { topic: string; mode?: string }) => ({
    topic: (d.topic ?? "").slice(0, 400),
    mode: d.mode ?? "collaborators",
  }))
  .handler(async ({ context, data }) => {
    const ctx = await loadResearcher(context.supabase, context.userId);
    const instruction =
      data.mode === "literature"
        ? `Run an AI literature scan on "${data.topic}": list the key works/authors to read, search strings for Scopus/Google Scholar, and a systematic-review protocol outline.`
        : `Find the kinds of collaborators, labs, communities and networks this researcher should join for "${data.topic}", including co-author strategies and international collaboration routes.`;
    const raw = await callAI([
      { role: "system", content: "You are a research collaboration and literature specialist. Reply only with strict JSON." },
      {
        role: "user",
        content: `${instruction}
Return STRICT JSON: {"headline":"1 sentence","items":[{"title":"...","detail":"2-3 sentences","tag":"short label"}],"next_steps":["..."]}
Researcher: ${who(ctx)}`,
      },
    ]);
    return parseJson<{ headline: string; items: any[]; next_steps: string[] }>(raw, { headline: "", items: [], next_steps: [] });
  });
