import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen } from "lucide-react";
import { LevelPage } from "@/components/level-page";

export const Route = createFileRoute("/_authenticated/masters")({
  head: () => ({ meta: [{ title: "Master's Admission — Atlas" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module M07 · Master's Admission</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <LevelPage
          level="Masters"
          icon={BookOpen}
          heading="Master's Admission"
          subtitle="Programs, SOP, CV, funding, and professor outreach."
          checklist={[
            "Register for GRE / GMAT (if required)",
            "Book IELTS / TOEFL",
            "Draft Statement of Purpose (v1 → v3)",
            "Update academic CV",
            "Line up 3 recommenders",
            "Shortlist 6–10 programs matched to interests",
            "Identify 3 target scholarships",
            "Email 2 professors of interest per program",
          ]}
        />
      </main>
    </div>
  ),
});
