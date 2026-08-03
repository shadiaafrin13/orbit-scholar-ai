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
  const [{ data: profile }, { data: pubs }, { data: apps }, { data: profs }, { data: acts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("publications").select("title,venue,year,type,citations").eq("user_id", userId).limit(30),
    supabase.from("applications").select("university_name,program,level,status,deadline,decision").eq("user_id", userId).limit(40),
    supabase.from("professor_contacts").select("name,university,department,research_area,status,compatibility").eq("user_id", userId).limit(40),
    supabase.from("activities").select("title,category,role,organization,impact").eq("user_id", userId).limit(30),
  ]);
  return { profile, publications: pubs ?? [], apps: apps ?? [], professors: profs ?? [], activities: acts ?? [] };
}

/** M09 — AI PhD opportunity matcher over the phd_positions catalog. */
export const phdOpportunityMatcher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { topic?: string; limit?: number }) => ({
    topic: (d.topic ?? "").slice(0, 300),
    limit: Math.min(Math.max(d.limit ?? 8, 5), 14),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [ctx, { data: pos }] = await Promise.all([
      loadContext(supabase, userId),
      supabase
        .from("phd_positions")
        .select("id,title,university,country,department,supervisor,research_area,keywords,funding_type,fully_funded,stipend_monthly,required_gpa,deadline")
        .limit(200),
    ]);
    if (!ctx.profile) return { picks: [], strategy: "Complete your profile first." };
    const raw = await callAI([
      { role: "system", content: "You are a doctoral admissions advisor. Reply only with strict JSON." },
      {
        role: "user",
        content: `Pick the ${data.limit} best-fit PhD positions for this applicant${data.topic ? ` interested in: ${data.topic}` : ""}.
Return STRICT JSON: {"picks":[{"id":"<uuid>","title":"...","university":"...","fit":0-100,"band":"reach|target|safety","funding":"low|medium|high","reason":"1-2 sentences"}],"strategy":"2-3 sentences"}
Applicant: ${JSON.stringify({
          pathway: ctx.profile.phd_pathway,
          gpa: ctx.profile.gpa,
          gre: ctx.profile.gre,
          ielts: ctx.profile.ielts,
          toefl: ctx.profile.toefl,
          field: ctx.profile.field_of_study,
          countries: ctx.profile.target_countries,
          interests: ctx.profile.interests,
          work: ctx.profile.work_experience,
          publications: ctx.publications,
        })}
Choose ONLY from: ${JSON.stringify(pos ?? [])}`,
      },
    ]);
    return parseJson<{ picks: any[]; strategy?: string }>(raw, { picks: [], strategy: "" });
  });

/** M09 — AI supervisor/professor matcher + compatibility scoring. */
export const phdSupervisorMatcher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { area?: string; country?: string }) => ({
    area: (d.area ?? "").slice(0, 200),
    country: (d.country ?? "").slice(0, 100),
  }))
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You match doctoral applicants to real, well-known research supervisors. Reply only with strict JSON." },
      {
        role: "user",
        content: `Suggest 8 potential PhD supervisors${data.area ? ` in ${data.area}` : ""}${data.country ? ` based in ${data.country}` : ""}.
Return STRICT JSON: {"supervisors":[{"name":"...","university":"...","department":"...","lab":"...","research_area":"...","interests":["..."],"hIndexEstimate":0,"openPositions":"likely|unclear|unlikely","compatibility":0-100,"why":"1-2 sentences","contactStrategy":"1 sentence"}],"note":"verify details on the lab website"}
Applicant: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson<{ supervisors: any[]; note?: string }>(raw, { supervisors: [], note: "" });
  });

/** M09 — AI professor outreach email generator. */
export const phdEmailGenerator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { professor: string; university?: string; area?: string; kind?: string }) => {
    if (!d.professor?.trim()) throw new Error("Professor name is required.");
    return {
      professor: d.professor.slice(0, 200),
      university: (d.university ?? "").slice(0, 200),
      area: (d.area ?? "").slice(0, 300),
      kind: (d.kind ?? "first contact").slice(0, 60),
    };
  })
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You write concise, credible academic outreach emails. Reply only with strict JSON." },
      {
        role: "user",
        content: `Write a ${data.kind} PhD inquiry email to ${data.professor}${data.university ? ` (${data.university})` : ""}${data.area ? ` about ${data.area}` : ""}.
Return STRICT JSON: {"subject":"...","body":"180-250 word email with greeting and sign-off","tips":["..."],"followUp":"when and how to follow up"}
Applicant: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson(raw, { subject: "", body: "", tips: [], followUp: "" });
  });

/** M09 — AI reply analysis for supervisor responses. */
export const phdReplyAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reply: string }) => {
    if (!d.reply?.trim()) throw new Error("Paste the professor's reply first.");
    return { reply: d.reply.slice(0, 6000) };
  })
  .handler(async ({ data }) => {
    const raw = await callAI([
      { role: "system", content: "You interpret academic email replies. Reply only with strict JSON." },
      {
        role: "user",
        content: `Analyze this reply from a professor.
Return STRICT JSON: {"sentiment":"positive|neutral|negative","intent":"1 sentence","signals":["..."],"nextStep":"1-2 sentences","suggestedReply":"short email reply"}
Reply: ${data.reply}`,
      },
    ]);
    return parseJson(raw, { sentiment: "neutral", intent: "", signals: [], nextStep: "", suggestedReply: "" });
  });

/** M09 — Research topic generator + gap detection. */
export const phdResearchIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { field: string; mode?: string }) => {
    if (!d.field?.trim()) throw new Error("Enter a research field or interest.");
    return { field: d.field.slice(0, 300), mode: (d.mode ?? "topics").slice(0, 30) };
  })
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You are a research advisor who finds novel, feasible doctoral directions. Reply only with strict JSON." },
      {
        role: "user",
        content: `For the field "${data.field}", produce doctoral research directions (mode: ${data.mode}).
Return STRICT JSON: {"topics":[{"title":"...","question":"...","novelty":"1 sentence","feasibility":"low|medium|high","methods":["..."],"gap":"the research gap it fills"}],"gaps":["broader open gaps in the field"],"literature":["key subareas or seminal directions to read"],"readiness":0-100,"advice":"2 sentences"}
Applicant context: ${JSON.stringify({ profile: ctx.profile, publications: ctx.publications })}`,
      },
    ]);
    return parseJson<{ topics: any[]; gaps: string[]; literature: string[]; readiness: number; advice: string }>(raw, {
      topics: [], gaps: [], literature: [], readiness: 0, advice: "",
    });
  });

/** M09 — Research proposal / methodology reviewer. */
export const phdProposalReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string; kind?: string }) => {
    if (!d.text?.trim() || d.text.trim().length < 80) throw new Error("Paste at least a paragraph to review.");
    return { text: d.text.slice(0, 14000), kind: (d.kind ?? "Research proposal").slice(0, 80) };
  })
  .handler(async ({ data }) => {
    const raw = await callAI([
      { role: "system", content: "You are a doctoral committee reviewer. Reply only with strict JSON." },
      {
        role: "user",
        content: `Review this ${data.kind} for a PhD application.
Return STRICT JSON: {"score":0-100,"verdict":"2 sentences","rubric":[{"criterion":"Novelty|Clarity|Methodology|Feasibility|Fit|Impact|Writing","score":0-100,"note":"1 sentence"}],"strengths":["..."],"issues":["..."],"methodology":["specific methodology feedback"],"rewrite":"improved opening paragraph","originalityRisk":"low|medium|high with 1 sentence on unoriginal or generic phrasing"}
Text: ${data.text}`,
      },
    ]);
    return parseJson(raw, { score: 0, verdict: "", rubric: [], strengths: [], issues: [], methodology: [], rewrite: "", originalityRisk: "" });
  });

/** M09 — Funding matcher + success prediction. */
export const phdFundingMatcher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [ctx, { data: schs }] = await Promise.all([
      loadContext(supabase, userId),
      supabase.from("scholarships").select("id,name,provider,country,amount,deadline,fully_funded,eligibility,level").limit(120),
    ]);
    const raw = await callAI([
      { role: "system", content: "You are a doctoral funding strategist (fellowships, RA/TA, grants). Reply only with strict JSON." },
      {
        role: "user",
        content: `Return STRICT JSON: {"strategy":"2-3 sentences","matches":[{"id":"<uuid or null>","name":"...","category":"University|Government|International|Research grant|RA|TA|Industry|Foundation|Travel","matchPct":0-100,"successChance":0-100,"deadline":"...","why":"1 sentence"}],"assistantships":[{"type":"RA|TA|GA","likelihood":"low|medium|high","how":"1 sentence"}],"plan":[{"month":"e.g. Nov 2026","actions":["..."]}]}
Applicant: ${JSON.stringify(ctx)}
Scholarship catalog: ${JSON.stringify(schs ?? [])}`,
      },
    ]);
    return parseJson<{ strategy: string; matches: any[]; assistantships: any[]; plan: any[] }>(raw, {
      strategy: "", matches: [], assistantships: [], plan: [],
    });
  });

/** M09 — Admission probability predictor for a target program. */
export const phdAdmissionPredictor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { university: string; program?: string }) => {
    if (!d.university?.trim()) throw new Error("Enter a university first.");
    return { university: d.university.slice(0, 200), program: (d.program ?? "").slice(0, 200) };
  })
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You predict PhD admission chances realistically. Reply only with strict JSON." },
      {
        role: "user",
        content: `Predict PhD admission chance at ${data.university}${data.program ? ` — ${data.program}` : ""}.
Return STRICT JSON: {"chance":0-100,"band":"low|moderate|strong","summary":"2 sentences","strengths":["..."],"gaps":["..."],"actions":["..."],"fundingChance":0-100}
Applicant: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson(raw, { chance: 0, band: "low", summary: "", strengths: [], gaps: [], actions: [], fundingChance: 0 });
  });

/** M09 — Interview coach: questions or answer evaluation. */
export const phdInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: string; answer?: string; question?: string }) => ({
    kind: (d.kind ?? "Supervisor interview").slice(0, 80),
    answer: (d.answer ?? "").slice(0, 6000),
    question: (d.question ?? "").slice(0, 500),
  }))
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    if (data.answer) {
      const raw = await callAI([
        { role: "system", content: "You are a PhD interview coach. Reply only with strict JSON." },
        {
          role: "user",
          content: `Evaluate this answer to "${data.question}" in a ${data.kind}.
Return STRICT JSON: {"score":0-100,"confidence":0-100,"communication":0-100,"feedback":"2-3 sentences","improvements":["..."],"modelAnswer":"a strong 120-word answer"}
Answer: ${data.answer}`,
        },
      ]);
      return parseJson<any>(raw, { score: 0, feedback: "", improvements: [], modelAnswer: "" });
    }
    const raw = await callAI([
      { role: "system", content: "You are a PhD interview coach. Reply only with strict JSON." },
      {
        role: "user",
        content: `Generate a ${data.kind} mock set for this applicant.
Return STRICT JSON: {"questions":[{"q":"...","type":"research|technical|behavioral|proposal defense","hint":"what a strong answer covers"}],"presentationTips":["..."]}
Applicant: ${JSON.stringify({ profile: ctx.profile, publications: ctx.publications })}`,
      },
    ]);
    return parseJson<any>(raw, { questions: [], presentationTips: [] });
  });

/** M09 — Publication strategy + research portfolio analysis. */
export const phdPublicationStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You are a research productivity advisor. Reply only with strict JSON." },
      {
        role: "user",
        content: `Return STRICT JSON: {"portfolioScore":0-100,"summary":"2 sentences","venues":[{"name":"journal or conference","tier":"top|strong|accessible","why":"1 sentence","timing":"e.g. submit by Mar 2027"}],"pipeline":["concrete papers or preprints to target"],"collaborations":[{"type":"co-author|mentor|lab|community","suggestion":"1 sentence"}],"visibility":["ORCID, Scholar, ResearchGate, preprint and branding actions"]}
Researcher: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson<any>(raw, { portfolioScore: 0, summary: "", venues: [], pipeline: [], collaborations: [], visibility: [] });
  });

/** M09 — Academic career advisor + forecast. */
export const phdCareerAdvisor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You advise on academic and research careers after a PhD. Reply only with strict JSON." },
      {
        role: "user",
        content: `Return STRICT JSON: {"forecast":"2-3 sentences","paths":[{"path":"Postdoc|Faculty|Research scientist|Industry research|Government research|Science policy","fit":0-100,"why":"1 sentence","prepare":["..."]}],"grantWriting":["..."],"leadership":["..."],"branding":["..."]}
Researcher: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson<any>(raw, { forecast: "", paths: [], grantWriting: [], leadership: [], branding: [] });
  });

/** M09 — PhD readiness score + success roadmap + weekly recommendations. */
export const phdReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You score PhD application readiness. Reply only with strict JSON." },
      {
        role: "user",
        content: `Return STRICT JSON: {"score":0-100,"summary":"2 sentences","pillars":[{"name":"Academics|Research|Publications|Proposal|Supervisors|Funding|Documents|Applications","score":0-100,"note":"1 sentence"}],"nextSteps":["..."],"timeline":[{"month":"e.g. Sep 2026","actions":["..."]}],"weekly":["3-5 recommendations for this week"]}
Applicant: ${JSON.stringify(ctx)}`,
      },
    ]);
    return parseJson<any>(raw, { score: 0, summary: "", pillars: [], nextSteps: [], timeline: [], weekly: [] });
  });
