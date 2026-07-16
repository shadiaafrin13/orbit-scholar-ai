import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

async function callAI(messages: ChatMsg[]): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured (missing LOVABLE_API_KEY)");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI error ${res.status}: ${body.slice(0, 300)}`);
  }
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return j.choices?.[0]?.message?.content ?? "";
}

export const recommendUniversities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number }) => ({ limit: Math.min(Math.max(d.limit ?? 8, 3), 15) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: unis }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("universities").select("id,name,country,city,world_rank,tuition_usd,acceptance_rate,ielts_min,toefl_min,avg_gpa,programs,levels,faculties,scholarships_info").limit(200),
    ]);
    if (!profile) return { picks: [] as Array<{ id: string; name: string; reason: string; fit: number }>, note: "Complete your profile first." };
    const prompt = `You are an admissions advisor. Rank ${data.limit} best-fit universities for the student.
Return STRICT JSON: {"picks":[{"id":"<uuid>","name":"<name>","reason":"<1-2 sentence fit>","fit":0-100}]}.
Student profile: ${JSON.stringify({
  level: profile.target_level, countries: profile.target_countries, field: profile.field_of_study,
  gpa: profile.gpa, ielts: profile.ielts, toefl: profile.toefl, sat: profile.sat, gre: profile.gre,
  budget: profile.budget_usd, interests: profile.interests,
})}
Universities (choose ONLY from this list): ${JSON.stringify(unis)}`;
    const raw = await callAI([
      { role: "system", content: "You match students to universities. Reply only with strict JSON." },
      { role: "user", content: prompt },
    ]);
    const m = raw.match(/\{[\s\S]*\}/);
    try {
      const parsed = m ? JSON.parse(m[0]) : { picks: [] };
      return { picks: parsed.picks ?? [], note: null as string | null };
    } catch {
      return { picks: [], note: "Could not parse AI response." };
    }
  });

export const predictAdmissionChance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { universityId: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: uni }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("universities").select("*").eq("id", data.universityId).maybeSingle(),
    ]);
    if (!profile) throw new Error("Profile missing");
    if (!uni) throw new Error("University not found");
    const prompt = `Estimate an applicant's admission chance to ${uni.name} (${uni.country}).
Return STRICT JSON: {"chance":0-100,"band":"reach|target|safety","summary":"...","strengths":["..."],"gaps":["..."],"suggestions":["..."]}.
University benchmarks: ${JSON.stringify({ acceptance: uni.acceptance_rate, ielts: uni.ielts_min, toefl: uni.toefl_min, avg_gpa: uni.avg_gpa, gre: uni.gre_required, gmat: uni.gmat_required, rank: uni.world_rank })}
Student: ${JSON.stringify({ gpa: profile.gpa, ielts: profile.ielts, toefl: profile.toefl, sat: profile.sat, gre: profile.gre, gmat: profile.gmat, field: profile.field_of_study, level: profile.target_level, interests: profile.interests })}`;
    const raw = await callAI([
      { role: "system", content: "You are a calibrated admissions predictor. Reply only with strict JSON." },
      { role: "user", content: prompt },
    ]);
    const m = raw.match(/\{[\s\S]*\}/);
    try { return m ? JSON.parse(m[0]) : { chance: 0, band: "reach", summary: "No response", strengths: [], gaps: [], suggestions: [] }; }
    catch { return { chance: 0, band: "reach", summary: "Parse failed", strengths: [], gaps: [], suggestions: [] }; }
  });
