import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  applicationReadiness, applicationCopilot, consistencyCheck, submissionStrategy,
  offerDecision, requirementChecklist, qualityCheck, interviewCenter, outreachDraft,
} from "@/lib/phase3-ai.functions";
import { AIResult } from "@/components/ai-result";
import { toast } from "sonner";
import {
  BadgeCheck, CalendarClock, Loader2, Mail, MessageSquare, Plus, Send, ShieldCheck,
  Sparkles, Target, Trash2, Trophy,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({
    meta: [
      { title: "Application Command Center — Atlas" },
      { name: "description", content: "Track every application from shortlist to offer: deadlines, documents, readiness scores, interviews, outreach and offer comparison." },
      { property: "og:title", content: "Application Command Center — Atlas" },
      { property: "og:description", content: "One place for deadlines, documents, interviews and offers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApplicationCenter,
});

type App = {
  id: string; university_name: string; program: string | null; level: string | null; status: string;
  deadline: string | null; intake: string | null; portal: string | null; platform: string | null;
  application_fee: number | null; fee_paid: boolean; priority: number | null; health_score: number | null;
  band: string | null; interview_date: string | null; decision: string | null; notes: string | null;
};
type ReqRow = { id: string; application_id: string; requirement: string; requirement_level: string; status: string };
type Offer = {
  id: string; university_name: string; program: string | null; country: string | null; tuition_usd: number | null;
  scholarship_usd: number | null; living_cost_usd: number | null; reply_deadline: string | null; decision: string;
};
type Comm = {
  id: string; contact_name: string; organization: string | null; contact_type: string; channel: string;
  subject: string | null; sent_at: string | null; follow_up_date: string | null; response_status: string;
};

const STATUSES = ["shortlisted", "preparing", "documents ready", "submitted", "interview", "decision pending", "admitted", "rejected", "waitlisted", "enrolled"];
const TABS = ["Applications", "Requirements", "AI Readiness", "Strategy", "Interview", "Offers", "Outreach", "Copilot"] as const;

function days(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

function ApplicationCenter() {
  const { user } = Route.useRouteContext() as { user: { id: string } };
  const [tab, setTab] = useState<(typeof TABS)[number]>("Applications");
  const [apps, setApps] = useState<App[]>([]);
  const [reqs, setReqs] = useState<ReqRow[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [comms, setComms] = useState<Comm[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState<string | null>(null);
  const [out, setOut] = useState<Record<string, unknown>>({});

  const runReadiness = useServerFn(applicationReadiness);
  const runCopilot = useServerFn(applicationCopilot);
  const runConsistency = useServerFn(consistencyCheck);
  const runStrategy = useServerFn(submissionStrategy);
  const runOfferDecision = useServerFn(offerDecision);
  const runChecklist = useServerFn(requirementChecklist);
  const runQuality = useServerFn(qualityCheck);
  const runInterview = useServerFn(interviewCenter);
  const runOutreach = useServerFn(outreachDraft);

  const load = useCallback(async () => {
    const [a, r, o, c] = await Promise.all([
      supabase.from("applications").select("*").eq("user_id", user.id).order("deadline", { ascending: true, nullsFirst: false }),
      supabase.from("application_documents").select("id,application_id,requirement,requirement_level,status").eq("user_id", user.id),
      supabase.from("offers").select("id,university_name,program,country,tuition_usd,scholarship_usd,living_cost_usd,reply_deadline,decision").eq("user_id", user.id),
      supabase.from("communications").select("id,contact_name,organization,contact_type,channel,subject,sent_at,follow_up_date,response_status").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setApps((a.data as App[]) ?? []);
    setReqs((r.data as ReqRow[]) ?? []);
    setOffers((o.data as Offer[]) ?? []);
    setComms((c.data as Comm[]) ?? []);
    if (!selected && a.data?.length) setSelected(a.data[0].id);
  }, [user.id, selected]);

  useEffect(() => {
    void load();
  }, [load]);

  async function put(key: string, promise: Promise<unknown>) {
    const value = await promise;
    setOut((o) => ({ ...o, [key]: value }));
  }

  async function guard(key: string, fn: () => Promise<unknown>) {
    setLoading(key);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  /* ------------------------------- applications ------------------------------- */
  const [nf, setNf] = useState({ university_name: "", program: "", level: "Masters", deadline: "", intake: "", portal: "", application_fee: "", status: "shortlisted" });
  async function addApp(e: React.FormEvent) {
    e.preventDefault();
    if (!nf.university_name.trim()) return toast.error("University name is required");
    const { error } = await supabase.from("applications").insert({
      user_id: user.id,
      university_name: nf.university_name.trim(),
      program: nf.program || null,
      level: nf.level,
      status: nf.status,
      deadline: nf.deadline || null,
      intake: nf.intake || null,
      portal: nf.portal || null,
      application_fee: nf.application_fee ? Number(nf.application_fee) : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Application added");
    setNf({ ...nf, university_name: "", program: "", deadline: "", intake: "", portal: "", application_fee: "" });
    await load();
  }
  async function patch(id: string, changes: Partial<App>) {
    const { error } = await supabase.from("applications").update(changes).eq("id", id);
    if (error) return toast.error(error.message);
    setApps((x) => x.map((a) => (a.id === id ? { ...a, ...changes } : a)));
  }
  async function delApp(id: string) {
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setApps((x) => x.filter((a) => a.id !== id));
  }

  /* ------------------------------- requirements ------------------------------- */
  async function buildChecklist() {
    if (!selected) return toast.error("Pick an application first");
    const res = (await runChecklist({ data: { applicationId: selected } })) as {
      requirements?: Array<{ requirement: string; level?: string; note?: string }>;
    };
    const rows = (res.requirements ?? []).slice(0, 40).map((r) => ({
      user_id: user.id,
      application_id: selected,
      requirement: String(r.requirement).slice(0, 200),
      requirement_level: r.level ?? "required",
      status: "missing",
    }));
    if (!rows.length) {
      setOut((o) => ({ ...o, checklist: res }));
      return;
    }
    const { error } = await supabase.from("application_documents").insert(rows);
    if (error) throw new Error(error.message);
    toast.success(`${rows.length} requirements added`);
    setOut((o) => ({ ...o, checklist: res }));
    await load();
  }
  async function setReqStatus(id: string, status: string) {
    const { error } = await supabase.from("application_documents").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setReqs((x) => x.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  /* ---------------------------------- offers ---------------------------------- */
  const [of, setOf] = useState({ university_name: "", program: "", country: "", tuition_usd: "", scholarship_usd: "", living_cost_usd: "", reply_deadline: "" });
  async function addOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!of.university_name.trim()) return toast.error("University name is required");
    const { error } = await supabase.from("offers").insert({
      user_id: user.id,
      university_name: of.university_name.trim(),
      program: of.program || null,
      country: of.country || null,
      tuition_usd: of.tuition_usd ? Number(of.tuition_usd) : null,
      scholarship_usd: of.scholarship_usd ? Number(of.scholarship_usd) : null,
      living_cost_usd: of.living_cost_usd ? Number(of.living_cost_usd) : null,
      reply_deadline: of.reply_deadline || null,
      decision: "undecided",
    });
    if (error) return toast.error(error.message);
    setOf({ university_name: "", program: "", country: "", tuition_usd: "", scholarship_usd: "", living_cost_usd: "", reply_deadline: "" });
    toast.success("Offer saved");
    await load();
  }

  /* -------------------------------- outreach --------------------------------- */
  const [oform, setOform] = useState({ purpose: "Deadline extension request", contact: "", organization: "", context: "" });
  async function logComm(subject: string, body: string) {
    const { error } = await supabase.from("communications").insert({
      user_id: user.id,
      application_id: selected || null,
      contact_name: oform.contact || "Admissions office",
      organization: oform.organization || null,
      contact_type: "admissions",
      channel: "email",
      subject,
      body,
      response_status: "awaiting",
    });
    if (error) return toast.error(error.message);
    toast.success("Saved to your communication log");
    await load();
  }

  /* -------------------------------- interview -------------------------------- */
  const [iv, setIv] = useState({ kind: "Masters admission interview", target: "", question: "", answer: "" });

  /* --------------------------------- copilot --------------------------------- */
  const [question, setQuestion] = useState("");
  const [priorities, setPriorities] = useState("");

  const soon = apps.filter((a) => a.deadline && days(a.deadline) <= 30 && !["submitted", "admitted", "rejected", "enrolled"].includes(a.status));
  const selectedApp = apps.find((a) => a.id === selected);
  const selReqs = reqs.filter((r) => r.application_id === selected);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
          <Target className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold"><span className="text-gradient">Application Command Center</span></h1>
          <p className="text-sm text-muted-foreground">Shortlist → documents → submission → interview → offer.</p>
        </div>
        <Link to="/documents" className="ml-auto text-xs text-primary hover:underline">Document Center →</Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          { label: "Applications", value: apps.length },
          { label: "Submitted", value: apps.filter((a) => ["submitted", "interview", "decision pending", "admitted", "enrolled"].includes(a.status)).length },
          { label: "Due in 30 days", value: soon.length },
          { label: "Offers", value: offers.length },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="mt-2 text-xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium ${tab === t ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {apps.length > 0 && tab !== "Applications" && tab !== "Offers" && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-xs text-muted-foreground">Focus application</span>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="rounded-xl border border-border bg-background/60 px-3 py-1.5 text-sm">
            {apps.map((a) => <option key={a.id} value={a.id}>{a.university_name}{a.program ? ` — ${a.program}` : ""}</option>)}
          </select>
        </div>
      )}

      {/* ---------------------------- Applications ---------------------------- */}
      {tab === "Applications" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <form onSubmit={addApp} className="glass rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Plus className="h-4 w-4 text-primary" /> New application</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <input value={nf.university_name} onChange={(e) => setNf({ ...nf, university_name: e.target.value })} placeholder="University" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              <input value={nf.program} onChange={(e) => setNf({ ...nf, program: e.target.value })} placeholder="Program" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              <div className="grid grid-cols-2 gap-3">
                <select value={nf.level} onChange={(e) => setNf({ ...nf, level: e.target.value })} className="rounded-xl border border-border bg-background/60 px-3 py-2">
                  {["UG", "Masters", "PhD", "Exchange", "Scholarship", "Research"].map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <select value={nf.status} onChange={(e) => setNf({ ...nf, status: e.target.value })} className="rounded-xl border border-border bg-background/60 px-3 py-2">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <label className="grid gap-1 text-xs text-muted-foreground">Deadline
                <input type="date" value={nf.deadline} onChange={(e) => setNf({ ...nf, deadline: e.target.value })} className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input value={nf.intake} onChange={(e) => setNf({ ...nf, intake: e.target.value })} placeholder="Intake, e.g. Fall 2027" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
                <input value={nf.application_fee} onChange={(e) => setNf({ ...nf, application_fee: e.target.value })} placeholder="Fee (USD)" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              </div>
              <input value={nf.portal} onChange={(e) => setNf({ ...nf, portal: e.target.value })} placeholder="Portal / link" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              <button className="rounded-full bg-nebula px-4 py-2 text-sm font-semibold text-primary-foreground glow">Add application</button>
            </div>
          </form>

          <section className="glass rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarClock className="h-4 w-4 text-primary" /> Pipeline</h2>
            <ul className="mt-4 space-y-2">
              {apps.length === 0 && <li className="text-sm text-muted-foreground">Add your first target university to begin.</li>}
              {apps.map((a) => {
                const d = a.deadline ? days(a.deadline) : null;
                const done = selReqs.length && a.id === selected ? selReqs.filter((r) => r.status === "ready").length : null;
                return (
                  <li key={a.id} className="rounded-xl border border-border bg-background/40 px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{a.university_name}{a.program ? ` — ${a.program}` : ""}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {a.level}{a.intake ? ` · ${a.intake}` : ""}
                          {a.deadline ? ` · deadline ${new Date(a.deadline).toLocaleDateString()}` : ""}
                          {d !== null ? ` (${d < 0 ? "passed" : `${d} days`})` : ""}
                          {done !== null ? ` · ${done}/${selReqs.length} docs ready` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={a.status} onChange={(e) => patch(a.id, { status: e.target.value })}
                          className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs">
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => setSelected(a.id)} className={`rounded-full border px-3 py-1 text-xs ${selected === a.id ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>Focus</button>
                        <button onClick={() => delApp(a.id)} className="rounded-full border border-border p-1.5 hover:bg-secondary"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}

      {/* ---------------------------- Requirements ---------------------------- */}
      {tab === "Requirements" && (
        <section className="mt-6 glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><BadgeCheck className="h-4 w-4 text-primary" /> Document requirements{selectedApp ? ` — ${selectedApp.university_name}` : ""}</h2>
            <button onClick={() => guard("cl", buildChecklist)} disabled={loading === "cl"}
              className="inline-flex items-center gap-2 rounded-full bg-nebula px-4 py-1.5 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
              {loading === "cl" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Generate checklist
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">AI drafts a likely checklist — always confirm the official list on the university website before submitting.</p>
          <ul className="mt-4 space-y-2">
            {selReqs.length === 0 && <li className="text-sm text-muted-foreground">No requirements tracked yet.</li>}
            {selReqs.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-4 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{r.requirement}</p>
                  <p className="text-xs text-muted-foreground">{r.requirement_level}</p>
                </div>
                <select value={r.status} onChange={(e) => setReqStatus(r.id, e.target.value)} className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs">
                  {["missing", "in progress", "ready", "submitted", "not required"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </li>
            ))}
          </ul>
          {out.checklist ? <div className="mt-6 border-t border-border pt-4"><AIResult data={out.checklist} /></div> : null}
        </section>
      )}

      {/* ---------------------------- AI Readiness ---------------------------- */}
      {tab === "AI Readiness" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {[
            { key: "rd", title: "Application readiness report", icon: ShieldCheck, run: async () => put("rd", runReadiness({ data: { applicationId: selected } })), result: out.rd },
            { key: "qc", title: "Pre-submission quality check", icon: BadgeCheck, run: async () => put("qc", runQuality({ data: { applicationId: selected } })), result: out.qc },
            { key: "cc", title: "CV · SOP · application consistency", icon: Sparkles, run: async () => put("cc", runConsistency()), result: out.cc },
          ].map((c) => (
            <section key={c.key} className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><c.icon className="h-4 w-4 text-primary" /> {c.title}</h2>
                <button onClick={() => guard(c.key, c.run)} disabled={loading === c.key}
                  className="inline-flex items-center gap-2 rounded-full bg-nebula px-4 py-1.5 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
                  {loading === c.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Run
                </button>
              </div>
              {c.result ? <div className="mt-4"><AIResult data={c.result} /></div> : <p className="mt-3 text-xs text-muted-foreground">Estimates based on the information in your profile — never a guarantee.</p>}
            </section>
          ))}
        </div>
      )}

      {/* ------------------------------ Strategy ------------------------------ */}
      {tab === "Strategy" && (
        <section className="mt-6 glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Target className="h-4 w-4 text-primary" /> Smart submission strategy</h2>
            <button onClick={() => guard("st", async () => put("st", runStrategy()))} disabled={loading === "st"}
              className="inline-flex items-center gap-2 rounded-full bg-nebula px-4 py-1.5 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
              {loading === "st" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Build strategy
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Order of submission, priority tiers, deadline risks and fee planning across all your applications.</p>
          {out.st ? <div className="mt-4"><AIResult data={out.st} /></div> : null}
        </section>
      )}

      {/* ------------------------------ Interview ----------------------------- */}
      {tab === "Interview" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="glass rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><MessageSquare className="h-4 w-4 text-primary" /> Practice questions</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <input value={iv.kind} onChange={(e) => setIv({ ...iv, kind: e.target.value })} placeholder="Interview type" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              <input value={iv.target} onChange={(e) => setIv({ ...iv, target: e.target.value })} placeholder="University / program" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              <button onClick={() => guard("iq", async () => put("iq", runInterview({ data: { mode: "questions", kind: iv.kind, target: iv.target } })))}
                disabled={loading === "iq"}
                className="rounded-full bg-nebula px-4 py-2 text-sm font-semibold text-primary-foreground glow disabled:opacity-60">
                {loading === "iq" ? "Generating…" : "Generate questions"}
              </button>
            </div>
            {out.iq ? <div className="mt-4"><AIResult data={out.iq} /></div> : null}
          </section>
          <section className="glass rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><BadgeCheck className="h-4 w-4 text-primary" /> Answer feedback</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <input value={iv.question} onChange={(e) => setIv({ ...iv, question: e.target.value })} placeholder="The question you were asked" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              <textarea value={iv.answer} onChange={(e) => setIv({ ...iv, answer: e.target.value })} rows={6} placeholder="Your answer" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              <button onClick={() => guard("ie", async () => put("ie", runInterview({ data: { mode: "evaluate", kind: iv.kind, target: iv.target, question: iv.question, answer: iv.answer } })))}
                disabled={loading === "ie"}
                className="rounded-full bg-nebula px-4 py-2 text-sm font-semibold text-primary-foreground glow disabled:opacity-60">
                {loading === "ie" ? "Reviewing…" : "Evaluate my answer"}
              </button>
            </div>
            {out.ie ? <div className="mt-4"><AIResult data={out.ie} /></div> : null}
          </section>
        </div>
      )}

      {/* -------------------------------- Offers ------------------------------- */}
      {tab === "Offers" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          <form onSubmit={addOffer} className="glass rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Trophy className="h-4 w-4 text-primary" /> Add an offer</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <input value={of.university_name} onChange={(e) => setOf({ ...of, university_name: e.target.value })} placeholder="University" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              <input value={of.program} onChange={(e) => setOf({ ...of, program: e.target.value })} placeholder="Program" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              <input value={of.country} onChange={(e) => setOf({ ...of, country: e.target.value })} placeholder="Country" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              <div className="grid grid-cols-3 gap-2">
                <input value={of.tuition_usd} onChange={(e) => setOf({ ...of, tuition_usd: e.target.value })} placeholder="Tuition" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
                <input value={of.scholarship_usd} onChange={(e) => setOf({ ...of, scholarship_usd: e.target.value })} placeholder="Aid" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
                <input value={of.living_cost_usd} onChange={(e) => setOf({ ...of, living_cost_usd: e.target.value })} placeholder="Living" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              </div>
              <label className="grid gap-1 text-xs text-muted-foreground">Reply deadline
                <input type="date" value={of.reply_deadline} onChange={(e) => setOf({ ...of, reply_deadline: e.target.value })} className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm" />
              </label>
              <button className="rounded-full bg-nebula px-4 py-2 text-sm font-semibold text-primary-foreground glow">Save offer</button>
            </div>
          </form>

          <section className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Offer comparison</h2>
              <button onClick={() => guard("od", async () => put("od", runOfferDecision({ data: { priorities } })))} disabled={loading === "od"}
                className="inline-flex items-center gap-2 rounded-full bg-nebula px-4 py-1.5 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
                {loading === "od" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Help me decide
              </button>
            </div>
            <input value={priorities} onChange={(e) => setPriorities(e.target.value)} placeholder="What matters most to you? e.g. lowest cost, research fit, work rights"
              className="mt-3 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm" />
            <ul className="mt-4 space-y-2 text-sm">
              {offers.length === 0 && <li className="text-muted-foreground">No offers logged yet.</li>}
              {offers.map((o) => {
                const net = (o.tuition_usd ?? 0) + (o.living_cost_usd ?? 0) - (o.scholarship_usd ?? 0);
                return (
                  <li key={o.id} className="rounded-xl border border-border bg-background/40 px-4 py-3">
                    <p className="font-medium">{o.university_name}{o.program ? ` — ${o.program}` : ""}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {o.country ?? "—"} · your estimated yearly cost ${net.toLocaleString()}
                      {o.reply_deadline ? ` · reply by ${new Date(o.reply_deadline).toLocaleDateString()}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
            {out.od ? <div className="mt-6 border-t border-border pt-4"><AIResult data={out.od} /></div> : null}
          </section>
        </div>
      )}

      {/* ------------------------------- Outreach ------------------------------ */}
      {tab === "Outreach" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          <section className="glass rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Mail className="h-4 w-4 text-primary" /> Draft an email</h2>
            <div className="mt-4 grid gap-3 text-sm">
              <input value={oform.purpose} onChange={(e) => setOform({ ...oform, purpose: e.target.value })} placeholder="Purpose" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              <input value={oform.contact} onChange={(e) => setOform({ ...oform, contact: e.target.value })} placeholder="Recipient name" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              <input value={oform.organization} onChange={(e) => setOform({ ...oform, organization: e.target.value })} placeholder="University / organization" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              <textarea value={oform.context} onChange={(e) => setOform({ ...oform, context: e.target.value })} rows={4} placeholder="Anything specific to mention" className="rounded-xl border border-border bg-background/60 px-3 py-2" />
              <button onClick={() => guard("or", async () => put("or", runOutreach({ data: oform })))} disabled={loading === "or"}
                className="rounded-full bg-nebula px-4 py-2 text-sm font-semibold text-primary-foreground glow disabled:opacity-60">
                {loading === "or" ? "Writing…" : "Draft email"}
              </button>
              {out.or ? (
                <>
                  <div className="rounded-xl border border-border bg-background/40 p-3"><AIResult data={out.or} /></div>
                  <button onClick={() => logComm(String((out.or as Record<string, unknown>).subject ?? oform.purpose), String((out.or as Record<string, unknown>).body ?? ""))}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">
                    <Send className="h-3.5 w-3.5" /> Save to communication log
                  </button>
                </>
              ) : null}
            </div>
          </section>
          <section className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Communication log</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {comms.length === 0 && <li className="text-muted-foreground">Nothing logged yet.</li>}
              {comms.map((c) => (
                <li key={c.id} className="rounded-xl border border-border bg-background/40 px-4 py-3">
                  <p className="font-medium">{c.subject ?? "(no subject)"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.contact_name}{c.organization ? ` · ${c.organization}` : ""} · {c.channel} · {c.response_status}
                    {c.follow_up_date ? ` · follow up ${new Date(c.follow_up_date).toLocaleDateString()}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* -------------------------------- Copilot ------------------------------ */}
      {tab === "Copilot" && (
        <section className="mt-6 glass rounded-2xl p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Application copilot</h2>
          <p className="mt-2 text-xs text-muted-foreground">Ask anything about your applications — it answers from your own profile, documents and deadlines.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What should I finish this week before the Delft deadline?"
              className="flex-1 rounded-xl border border-border bg-background/60 px-3 py-2 text-sm" />
            <button onClick={() => guard("cp", async () => put("cp", runCopilot({ data: { question } })))} disabled={loading === "cp" || !question.trim()}
              className="rounded-full bg-nebula px-5 py-2 text-sm font-semibold text-primary-foreground glow disabled:opacity-60">
              {loading === "cp" ? "Thinking…" : "Ask"}
            </button>
          </div>
          {out.cp ? <div className="mt-6"><AIResult data={out.cp} /></div> : null}
        </section>
      )}
    </div>
  );
}
