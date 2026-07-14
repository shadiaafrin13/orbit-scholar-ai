import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { LevelPage } from "@/components/level-page";

export const Route = createFileRoute("/_authenticated/undergrad")({
  head: () => ({ meta: [{ title: "Undergraduate Abroad — Atlas" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <Wrapper title="Undergraduate Abroad" n="M06">
      <LevelPage
        level="UG"
        icon={GraduationCap}
        heading="Undergraduate Abroad"
        subtitle="SAT, ACT, IELTS, Common App, UC — the full UG toolkit."
        checklist={[
          "Register for SAT / ACT",
          "Book IELTS or TOEFL",
          "Draft Common App essay",
          "Request 2 teacher recommendations",
          "Shortlist 8–12 universities (Reach / Target / Safety)",
          "Complete FAFSA / CSS Profile if applying to the US",
          "Prepare portfolio (if applicable)",
        ]}
      />
    </Wrapper>
  ),
});

function Wrapper({ title, n, children }: { title: string; n: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-xs text-muted-foreground">Module {n} · {title}</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>
    </div>
  );
}
