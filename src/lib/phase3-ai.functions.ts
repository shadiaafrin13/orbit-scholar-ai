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

/** Loads the full cross-module application context for one student. */
async function loadDossier(supabase: any, userId: string) {
  const [profile, apps, docs, appDocs, offers, comms, sops, cvs, recs, pubs, tests, activities] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("applications").select("*").eq("user_id", userId).limit(60),
    supabase.from("documents").select("id,category,doc_type,title,status,issue_date,expiry_date,notes").eq("user_id", userId).limit(120),
    supabase.from("application_documents").select("application_id,requirement,requirement_level,status").eq("user_id", userId).limit(300),
    supabase.from("offers").select("*").eq("user_id", userId).limit(30),
    supabase.from("communications").select("contact_name,organization,contact_type,subject,sent_at,follow_up_date,response_status").eq("user_id", userId).limit(60),
    supabase.from("sops").select("doc_type,university,program,content,ai_score").eq("user_id", userId).limit(12),
    supabase.from("cvs").select("headline,summary,content,ats_score").eq("user_id", userId).limit(4),
    supabase.from("recommenders").select("name,affiliation,relationship,status,requested_at,submitted_at").eq("user_id", userId).limit(20),
    supabase.from("publications").select("title,venue,year,type,citations").eq("user_id", userId).limit(20),
    supabase.from("test_targets").select("exam,target_score,current_score,test_date,registered").eq("user_id", userId).limit(20),
    supabase.from("activities").select("title,category,role,organization,hours_per_week,impact,start_date,end_date").eq("user_id", userId).limit(30),
  ]);
  return {
    profile: profile.data,
    applications: apps.data ?? [],
    documents: docs.data ?? [],
    applicationDocuments: appDocs.data ?? [],
    offers: offers.data ?? [],
    communications: comms.data ?? [],
    sops: (sops.data ?? []).map((s: any) => ({ ...s, content: (s.content ?? "").slice(0, 2500) })),
    cvs: cvs.data ?? [],
    recommenders: recs.data ?? [],
    publications: pubs.data ?? [],
    tests: tests.data ?? [],
    activities: activities.data ?? [],
    today: new Date().toISOString().slice(0, 10),
  };
}

/** Phase 3 — cross-module Application Readiness Report for one application (or all). */
export const applicationReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { applicationId?: string }) => ({ applicationId: d?.applicationId ?? "" }))
  .handler(async ({ context, data }) => {
    const dossier = await loadDossier(context.supabase, context.userId);
    const target = data.applicationId
      ? dossier.applications.find((a: any) => a.id === data.applicationId)
      : null;
    if (data.applicationId && !target) throw new Error("Application not found.");
    const raw = await callAI([
      { role: "system", content: "You are an international admissions readiness auditor. Never guarantee admission. Reply only with strict JSON." },
      {
        role: "user",
        content: `Produce an application readiness report${target ? ` for this specific application: ${JSON.stringify(target)}` : " across all of the student's applications"}.
Today is ${dossier.today}.
Return STRICT JSON: {"overall":0-100,"verdict":"Ready|Needs Attention|High Risk","summary":"2-3 sentences","scores":[{"name":"Academic Fit|Program Fit|SOP Quality|CV Quality|Research Fit|ECA Strength|Recommendation Readiness|Test Readiness|Funding Readiness|Document Readiness","score":0-100,"note":"short explanation"}],"missing":["..."],"risks":[{"risk":"...","severity":"low|medium|high","fix":"..."}],"nextActions":[{"action":"...","due":"e.g. within 7 days","why":"short"}]}
Student dossier: ${JSON.stringify(dossier)}`,
      },
    ]);
    return parseJson(raw, { overall: 0, verdict: "High Risk", summary: "Could not parse AI response.", scores: [], missing: [], risks: [], nextActions: [] });
  });

/** Phase 3 — AI Application Copilot: answers questions using the student's real data. */
export const applicationCopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { question: string }) => {
    if (!d?.question?.trim()) throw new Error("Ask a question first.");
    return { question: d.question.slice(0, 1200) };
  })
  .handler(async ({ context, data }) => {
    const dossier = await loadDossier(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You are Atlas, an AI application copilot. Answer using only the student's actual data. Be concrete and honest; never guarantee admission. Reply only with strict JSON." },
      {
        role: "user",
        content: `Question: "${data.question}"
Today is ${dossier.today}.
Return STRICT JSON: {"answer":"3-6 sentences, direct and specific","steps":["concrete next steps"],"priorities":[{"item":"application/task name","why":"short","urgency":"now|this week|this month"}],"warnings":["..."]}
Student dossier: ${JSON.stringify(dossier)}`,
      },
    ]);
    return parseJson(raw, { answer: "Could not parse AI response.", steps: [], priorities: [], warnings: [] });
  });

/** Phase 3 — Application Consistency Engine: CV vs SOP vs applications vs recommenders. */
export const consistencyCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const dossier = await loadDossier(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You detect factual inconsistencies across application materials. Flag issues for student review; never rewrite facts yourself. Reply only with strict JSON." },
      {
        role: "user",
        content: `Compare the student's profile, CV, SOPs, activities, publications, recommenders and applications for contradictions (dates, GPA, job/role titles, project names, graduation dates, career goals, name spellings).
Return STRICT JSON: {"status":"clean|issues","issues":[{"field":"e.g. Graduation date","sources":["CV","SOP"],"values":["2025","2026"],"severity":"low|medium|high","recommendation":"what the student should verify"}],"notes":"1-2 sentences"}
Materials: ${JSON.stringify(dossier)}`,
      },
    ]);
    return parseJson(raw, { status: "clean", issues: [], notes: "Could not parse AI response." });
  });

/** Phase 3 — Smart submission strategy: priority ordering across all applications. */
export const submissionStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const dossier = await loadDossier(context.supabase, context.userId);
    if (!dossier.applications.length) return { priorities: [], strategy: "Add applications to your tracker first.", calendar: [] };
    const raw = await callAI([
      { role: "system", content: "You sequence international applications for maximum outcome. Reply only with strict JSON." },
      {
        role: "user",
        content: `Rank the student's applications into Priority 1 (strong fit, early deadline, high scholarship potential), Priority 2 (strong targets) and Priority 3 (reach, needs preparation).
Today is ${dossier.today}.
Return STRICT JSON: {"strategy":"3-4 sentences","priorities":[{"application":"University — Program","tier":1|2|3,"band":"safety|target|reach","submitBy":"YYYY-MM-DD","reason":"1-2 sentences","blockers":["..."]}],"calendar":[{"week":"e.g. Week of 21 Sep","focus":["..."]}]}
Dossier: ${JSON.stringify(dossier)}`,
      },
    ]);
    return parseJson<{ priorities: any[]; strategy: string; calendar: any[] }>(raw, { priorities: [], strategy: "", calendar: [] });
  });

/** Phase 3 — Offer comparison & decision assistant. */
export const offerDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { priorities?: string }) => ({ priorities: (d?.priorities ?? "").slice(0, 600) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [{ data: offers }, { data: profile }] = await Promise.all([
      supabase.from("offers").select("*").eq("user_id", userId).limit(30),
      supabase.from("profiles").select("field_of_study,target_countries,path_budget,interests").eq("id", userId).maybeSingle(),
    ]);
    if (!offers?.length) return { ranking: [], summary: "Add at least one offer to compare.", tradeoffs: [] };
    const raw = await callAI([
      { role: "system", content: "You help students weigh admission offers. The final decision always belongs to the student. Reply only with strict JSON." },
      {
        role: "user",
        content: `Compare these offers on net cost, funding, ranking, program quality, research, career outcomes, location and work rights.
Student priorities: ${data.priorities || "not specified — infer balanced priorities"}.
Return STRICT JSON: {"summary":"3-4 sentences","ranking":[{"university":"...","rank":1,"netCostUsd":0,"score":0-100,"pros":["..."],"cons":["..."],"bestIf":"1 sentence"}],"tradeoffs":["..."],"reminder":"1 sentence that the decision is the student's"}
Offers: ${JSON.stringify(offers)}
Student: ${JSON.stringify(profile)}`,
      },
    ]);
    return parseJson(raw, { summary: "", ranking: [], tradeoffs: [], reminder: "" });
  });

/** Phase 3 — AI document analyzer: flags issues in a stored document record. */
export const documentAnalyzer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: docs }, { data: profile }, { data: apps }] = await Promise.all([
      supabase.from("documents").select("id,category,doc_type,title,file_name,issue_date,expiry_date,status,notes,tags").eq("user_id", userId).limit(150),
      supabase.from("profiles").select("full_name,date_of_birth,graduation_year,target_countries,target_level").eq("id", userId).maybeSingle(),
      supabase.from("applications").select("university_name,program,level,deadline,status").eq("user_id", userId).limit(40),
    ]);
    const raw = await callAI([
      { role: "system", content: "You review an application document vault. Flag possible issues; you never legally verify documents. Reply only with strict JSON." },
      {
        role: "user",
        content: `Today is ${new Date().toISOString().slice(0, 10)}.
Review the vault for: expired or soon-to-expire documents, missing document types for the student's applications, inconsistent names or dates, and formatting/naming concerns.
Return STRICT JSON: {"health":0-100,"summary":"2 sentences","flags":[{"document":"title","issue":"...","severity":"low|medium|high","fix":"..."}],"missing":[{"docType":"...","neededFor":"...","why":"short"}],"expiring":[{"document":"...","expiry":"YYYY-MM-DD","action":"..."}]}
Vault: ${JSON.stringify(docs ?? [])}
Student: ${JSON.stringify(profile)}
Applications: ${JSON.stringify(apps ?? [])}`,
      },
    ]);
    return parseJson(raw, { health: 0, summary: "Could not parse AI response.", flags: [], missing: [], expiring: [] });
  });

/** Phase 3 — Generates the document requirement checklist for one application. */
export const requirementChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { applicationId: string }) => {
    if (!d?.applicationId) throw new Error("Pick an application first.");
    return { applicationId: d.applicationId };
  })
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: app } = await supabase.from("applications").select("*").eq("id", data.applicationId).eq("user_id", userId).maybeSingle();
    if (!app) throw new Error("Application not found.");
    const { data: uni } = app.university_id
      ? await supabase.from("universities").select("name,country,required_documents,admission_notes,ielts_min,toefl_min,gre_required,gmat_required,avg_gpa").eq("id", app.university_id).maybeSingle()
      : { data: null };
    const { data: docs } = await supabase.from("documents").select("id,doc_type,title,category").eq("user_id", userId).limit(150);
    const raw = await callAI([
      { role: "system", content: "You build application document checklists. Reply only with strict JSON." },
      {
        role: "user",
        content: `Build the document requirement checklist for this application, separating Required / Recommended / Optional. Where possible, map an already-uploaded document to each requirement.
Return STRICT JSON: {"items":[{"requirement":"e.g. Official transcript","level":"required|recommended|optional","matchedDocumentId":"<uuid or empty string>","note":"short"}]}
Application: ${JSON.stringify(app)}
University: ${JSON.stringify(uni)}
Uploaded documents: ${JSON.stringify(docs ?? [])}`,
      },
    ]);
    const parsed = parseJson<{ items: Array<{ requirement: string; level: string; matchedDocumentId?: string; note?: string }> }>(raw, { items: [] });
    if (!parsed.items.length) return { inserted: 0, items: [] };
    const rows = parsed.items.slice(0, 30).map((i) => ({
      user_id: userId,
      application_id: data.applicationId,
      document_id: i.matchedDocumentId && i.matchedDocumentId.length > 20 ? i.matchedDocumentId : null,
      requirement: i.requirement.slice(0, 160),
      requirement_level: ["required", "recommended", "optional"].includes(i.level) ? i.level : "required",
      status: i.matchedDocumentId && i.matchedDocumentId.length > 20 ? "uploaded" : "missing",
    }));
    await supabase.from("application_documents").delete().eq("application_id", data.applicationId).eq("user_id", userId);
    const { error } = await supabase.from("application_documents").insert(rows);
    if (error) throw new Error(error.message);
    return { inserted: rows.length, items: parsed.items };
  });

/** Phase 3 — Pre-submission quality check for a single application. */
export const qualityCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { applicationId: string }) => {
    if (!d?.applicationId) throw new Error("Pick an application first.");
    return { applicationId: d.applicationId };
  })
  .handler(async ({ context, data }) => {
    const dossier = await loadDossier(context.supabase, context.userId);
    const app = dossier.applications.find((a: any) => a.id === data.applicationId);
    if (!app) throw new Error("Application not found.");
    const raw = await callAI([
      { role: "system", content: "You run a final pre-submission checklist for university applications. Reply only with strict JSON." },
      {
        role: "user",
        content: `Run the final quality check before submission. Today is ${dossier.today}.
Return STRICT JSON: {"verdict":"Ready|Needs Attention|High Risk","sections":[{"name":"Academic|Documents|Writing|Administrative|Financial","status":"pass|warn|fail","checks":[{"item":"...","status":"pass|warn|fail","note":"short"}]}],"blockers":["..."],"finalAdvice":"2-3 sentences"}
Application: ${JSON.stringify(app)}
Full dossier: ${JSON.stringify(dossier)}`,
      },
    ]);
    return parseJson(raw, { verdict: "High Risk", sections: [], blockers: [], finalAdvice: "Could not parse AI response." });
  });

/** Phase 3 — Interview question generator + answer evaluation (university / scholarship / professor / visa). */
export const interviewCenter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { mode: "questions" | "evaluate"; kind: string; target?: string; question?: string; answer?: string }) => d)
  .handler(async ({ context, data }) => {
    if (data.mode === "questions") {
      const dossier = await loadDossier(context.supabase, context.userId);
      const raw = await callAI([
        { role: "system", content: "You are an admissions, scholarship and visa interviewer. Reply only with strict JSON." },
        {
          role: "user",
          content: `Generate 8 realistic ${data.kind} interview questions${data.target ? ` for ${data.target}` : ""}, mixing personal, academic, program-specific, activity and behavioral questions.
Return STRICT JSON: {"questions":["..."]}
Applicant: ${JSON.stringify({ profile: dossier.profile, applications: dossier.applications, activities: dossier.activities, publications: dossier.publications })}`,
        },
      ]);
      return parseJson<{ questions: string[] }>(raw, { questions: [] });
    }
    const raw = await callAI([
      { role: "system", content: "You evaluate interview answers on communication, structure, confidence, relevance and clarity. Reply only with strict JSON." },
      {
        role: "user",
        content: `Evaluate this answer to a ${data.kind} interview question.
Return STRICT JSON: {"score":0-100,"communication":0-100,"structure":0-100,"confidence":0-100,"relevance":0-100,"clarity":0-100,"feedback":"2-3 sentences","improve":["..."],"modelAnswer":"a strong 4-6 sentence answer"}
Question: ${data.question}
Answer: """${(data.answer ?? "").slice(0, 6000)}"""`,
      },
    ]);
    return parseJson(raw, { score: 0, communication: 0, structure: 0, confidence: 0, relevance: 0, clarity: 0, feedback: "", improve: [], modelAnswer: "" });
  });

/** Phase 3 — Outreach / follow-up email drafting for the communication center. */
export const outreachDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { purpose: string; contact: string; organization?: string; context?: string }) => {
    if (!d?.purpose) throw new Error("Choose a purpose first.");
    return { purpose: d.purpose, contact: d.contact ?? "", organization: (d.organization ?? "").slice(0, 200), context: (d.context ?? "").slice(0, 1500) };
  })
  .handler(async ({ context, data }) => {
    const dossier = await loadDossier(context.supabase, context.userId);
    const raw = await callAI([
      { role: "system", content: "You write concise, credible, personalized academic and admissions emails. Reply only with strict JSON." },
      {
        role: "user",
        content: `Write a ${data.purpose} email to ${data.contact || "the admissions office"}${data.organization ? ` at ${data.organization}` : ""}.
Extra context: ${data.context || "none"}
Return STRICT JSON: {"subject":"...","body":"120-220 word email in plain text with line breaks","followUpInDays":7,"tips":["..."]}
Applicant: ${JSON.stringify({ profile: dossier.profile, applications: dossier.applications })}`,
      },
    ]);
    return parseJson(raw, { subject: "", body: "", followUpInDays: 7, tips: [] });
  });
