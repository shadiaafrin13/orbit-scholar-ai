import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { documentAnalyzer } from "@/lib/phase3-ai.functions";
import { AIResult } from "@/components/ai-result";
import { toast } from "sonner";
import { AlertTriangle, Download, FileText, FolderOpen, Loader2, Sparkles, Trash2, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Document Center — Atlas" },
      { name: "description", content: "A private vault for transcripts, test reports, passports, financial proofs and every application document, with expiry tracking and AI checks." },
      { property: "og:title", content: "Document Center — Atlas" },
      { property: "og:description", content: "Keep every application document organized, verified and ready to submit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DocumentCenter,
});

const CATEGORIES = ["Academic", "Testing", "Identity", "Financial", "Recommendation", "Experience", "Application", "Visa", "Other"] as const;
const DOC_TYPES = [
  "Transcript", "Degree certificate", "Mark sheet", "IELTS score report", "TOEFL score report", "GRE score report",
  "SAT score report", "Passport", "National ID", "Bank statement", "Sponsor letter", "Scholarship letter",
  "Recommendation letter", "SOP", "CV", "Portfolio", "Internship certificate", "Research paper", "Photo", "Other",
];

type Doc = {
  id: string;
  category: string;
  doc_type: string;
  title: string;
  status: string;
  version: number;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  issue_date: string | null;
  expiry_date: string | null;
  tags: string[] | null;
  notes: string | null;
};

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

function DocumentCenter() {
  const { user } = Route.useRouteContext();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<unknown>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const analyze = useServerFn(documentAnalyzer);

  const [form, setForm] = useState({
    title: "", category: "Academic", doc_type: "Transcript", status: "verified",
    issue_date: "", expiry_date: "", tags: "", notes: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("id,category,doc_type,title,status,version,file_name,file_path,file_size,issue_date,expiry_date,tags,notes")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setDocs((data as Doc[]) ?? []);
  }, [user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Give the document a title");
    setBusy(true);
    try {
      let file_path: string | null = null;
      if (file) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        file_path = `${user.id}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage.from("documents").upload(file_path, file, { upsert: false });
        if (upErr) throw new Error(upErr.message);
      }
      const { error } = await supabase.from("documents").insert({
        user_id: user.id,
        title: form.title.trim(),
        category: form.category,
        doc_type: form.doc_type,
        status: form.status,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null,
        notes: form.notes || null,
        file_path,
        file_name: file?.name ?? null,
        file_size: file?.size ?? null,
        mime_type: file?.type || null,
      });
      if (error) throw new Error(error.message);
      toast.success("Document saved to your vault");
      setForm({ title: "", category: form.category, doc_type: form.doc_type, status: "verified", issue_date: "", expiry_date: "", tags: "", notes: "" });
      setFile(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function open(d: Doc) {
    if (!d.file_path) return toast.error("No file attached to this record");
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.file_path, 120);
    if (error || !data) return toast.error(error?.message ?? "Could not open file");
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function remove(d: Doc) {
    if (d.file_path) await supabase.storage.from("documents").remove([d.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setDocs((x) => x.filter((y) => y.id !== d.id));
  }

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      setAnalysis(await analyze());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI check failed");
    } finally {
      setAnalyzing(false);
    }
  }

  const shown = filter === "All" ? docs : docs.filter((d) => d.category === filter);
  const expiring = docs.filter((d) => d.expiry_date && daysUntil(d.expiry_date) <= 180);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
          <FolderOpen className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold"><span className="text-gradient">Document Center</span></h1>
          <p className="text-sm text-muted-foreground">Your private vault — only you can open these files.</p>
        </div>
        <Link to="/applications" className="ml-auto text-xs text-primary hover:underline">Application Center →</Link>
      </div>

      {expiring.length > 0 && (
        <div className="mt-6 glass rounded-2xl border border-border p-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-primary" /> Expiring soon</p>
          <ul className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
            {expiring.map((d) => (
              <li key={d.id} className="rounded-xl border border-border bg-background/40 px-3 py-2">
                {d.title} — {daysUntil(d.expiry_date!) < 0 ? "expired" : `${daysUntil(d.expiry_date!)} days left`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <form onSubmit={save} className="glass rounded-2xl p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Upload className="h-4 w-4 text-primary" /> Add a document</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title, e.g. Bachelor transcript"
              className="rounded-xl border border-border bg-background/60 px-3 py-2" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border border-border bg-background/60 px-3 py-2">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })} className="rounded-xl border border-border bg-background/60 px-3 py-2">
                {DOC_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-xs text-muted-foreground">Issued
                <input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">Expires
                <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm" />
              </label>
            </div>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-xl border border-border bg-background/60 px-3 py-2">
              {["verified", "pending", "needs update", "missing"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags, comma separated"
              className="rounded-xl border border-border bg-background/60 px-3 py-2" />
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={2}
              className="rounded-xl border border-border bg-background/60 px-3 py-2" />
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
            <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-full bg-nebula px-4 py-2 text-sm font-semibold text-primary-foreground glow disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Save to vault
            </button>
          </div>
        </form>

        <div className="grid gap-6">
          <section className="glass rounded-2xl p-6">
            <div className="flex flex-wrap items-center gap-2">
              {(["All", ...CATEGORIES] as string[]).map((c) => (
                <button key={c} onClick={() => setFilter(c)}
                  className={`rounded-full border px-3 py-1 text-xs ${filter === c ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                  {c}
                </button>
              ))}
            </div>
            <ul className="mt-4 space-y-2">
              {shown.length === 0 && <li className="text-sm text-muted-foreground">Nothing here yet — add your transcript to start.</li>}
              {shown.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background/40 px-4 py-3 text-sm">
                  <div>
                    <p className="flex items-center gap-2 font-medium"><FileText className="h-3.5 w-3.5 text-primary" /> {d.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {d.category} · {d.doc_type} · {d.status}
                      {d.expiry_date ? ` · expires ${new Date(d.expiry_date).toLocaleDateString()}` : ""}
                      {d.file_name ? ` · ${d.file_name}` : " · no file"}
                    </p>
                    {d.tags?.length ? <p className="mt-1 text-xs text-primary">{d.tags.join(" · ")}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {d.file_path && (
                      <button onClick={() => open(d)} className="rounded-full border border-border p-1.5 hover:bg-secondary" title="Open">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => remove(d)} className="rounded-full border border-border p-1.5 hover:bg-secondary" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-primary" /> AI vault check</h2>
              <button onClick={runAnalysis} disabled={analyzing}
                className="inline-flex items-center gap-2 rounded-full bg-nebula px-4 py-1.5 text-xs font-semibold text-primary-foreground glow disabled:opacity-60">
                {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Analyze
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Finds missing, expiring or inconsistent documents. Estimates only — always confirm requirements with the university.</p>
            {analysis ? <div className="mt-4"><AIResult data={analysis} /></div> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
