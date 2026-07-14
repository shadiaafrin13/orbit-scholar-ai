import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { LevelPage } from "@/components/level-page";

export const Route = createFileRoute("/_authenticated/phd")({
  head: () => ({ meta: [{ title: "PhD Admission — Atlas" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M08 · PhD Admission</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <LevelPage
          level="PhD"
          icon={FlaskConical}
          heading="PhD Admission"
          subtitle="Research proposal, advisor fit, fellowships, and interviews."
          checklist={[
            "Refine research question and 1-page proposal",
            "Identify 5–8 advisors whose work matches yours",
            "Send tailored outreach emails to advisors",
            "Draft research statement",
            "Shortlist fellowships (Vanier, DAAD, MEXT, Fulbright, etc.)",
            "Practice technical + research interviews",
            "Line up 3 research-focused recommenders",
          ]}
        />
      </main>
    </div>
  ),
});
