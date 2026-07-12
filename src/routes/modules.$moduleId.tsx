import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Compass, Rocket, Sparkles } from "lucide-react";

type ModuleDetail = {
  n: number;
  slug: string;
  title: string;
  tagline: string;
  overview: string;
  features: string[];
  aiCapabilities: string[];
};

const MODULES: ModuleDetail[] = [
  {
    n: 1, slug: "auth", title: "Authentication & Roles",
    tagline: "One identity across every role in the academic journey.",
    overview: "Secure sign-in for students, parents, teachers, counselors, professors, universities, organizations, and admins — with email verification, 2FA, and social login.",
    features: ["Email + password sign-in", "Google, Apple, Microsoft OAuth", "Two-factor authentication", "Role-based dashboards", "Session management", "Password recovery"],
    aiCapabilities: ["Adaptive onboarding by role", "Risk scoring for suspicious sign-ins"],
  },
  {
    n: 2, slug: "profile", title: "AI Student Profile",
    tagline: "One profile. Every module reads from it.",
    overview: "Academics, standardized tests, extracurriculars, research, publications — captured once, scored by AI, and reused across all 30 modules.",
    features: ["GPA, transcripts, coursework", "IELTS, TOEFL, SAT, GRE, GMAT", "ECAs, awards, leadership", "Publications & research", "Skills & languages"],
    aiCapabilities: ["Profile completeness score", "Competitiveness index by target country", "Gap analysis & next-best-action"],
  },
  {
    n: 3, slug: "path", title: "Path Selection",
    tagline: "UG, Master's, PhD, Postdoc, Exchange, Research — with a personalized roadmap.",
    overview: "Answer a few questions and Atlas maps the exact academic pathway that fits your goals, budget, and timeline.",
    features: ["Interactive pathway wizard", "Timeline generator", "Cost projections", "Alternative-path comparison"],
    aiCapabilities: ["Pathway fit score", "Regret-minimization simulation across paths"],
  },
  {
    n: 4, slug: "dashboard", title: "AI Dashboard",
    tagline: "Your daily command center.",
    overview: "Tasks, deadlines, recommendations, and your AI mentor — all in one focused view.",
    features: ["Daily task list", "Deadline countdown", "Recommendation feed", "Progress widgets"],
    aiCapabilities: ["Task prioritization", "Deadline risk alerts"],
  },
  {
    n: 5, slug: "roadmap", title: "Academic Roadmap",
    tagline: "Year, semester, GPA, and habit planners.",
    overview: "Long-horizon planning tied to your target programs and application windows.",
    features: ["Multi-year plan", "Semester goals", "GPA projections", "Habit tracker"],
    aiCapabilities: ["Auto-plan generation", "What-if simulations"],
  },
  {
    n: 6, slug: "undergrad", title: "Undergraduate Abroad",
    tagline: "The complete UG admissions toolkit.",
    overview: "SAT, ACT, IELTS, Common App, UC — everything an international undergraduate applicant needs.",
    features: ["Common App tracker", "UC application helper", "Test score planner", "Essay bank"],
    aiCapabilities: ["School list optimizer", "Essay feedback"],
  },
  {
    n: 7, slug: "masters", title: "Master's Admission",
    tagline: "Programs, SOP, CV, funding, and outreach.",
    overview: "End-to-end Master's application support with AI writing and professor outreach.",
    features: ["Program shortlisting", "SOP & CV builder", "Funding finder", "Outreach templates"],
    aiCapabilities: ["Admission odds", "SOP grading rubric", "Personalized outreach drafts"],
  },
  {
    n: 8, slug: "phd", title: "PhD Admission",
    tagline: "Research proposals, professor finder, fellowships, interview prep.",
    overview: "Everything you need to land a fully funded PhD — from proposal to interview.",
    features: ["Research proposal builder", "Professor finder", "Fellowship database", "Interview trainer"],
    aiCapabilities: ["Advisor–student fit score", "Proposal reviewer"],
  },
  {
    n: 9, slug: "universities", title: "Global Universities",
    tagline: "28+ countries. Ranked, filtered, matched.",
    overview: "Search universities by country, program, tuition, ranking, and language — with AI admission odds against your profile.",
    features: ["Advanced filters", "Rankings & fees", "Program requirements", "Compare up to 4"],
    aiCapabilities: ["Personalized admission probability", "Reach / target / safety classification"],
  },
  {
    n: 10, slug: "scholarships", title: "Scholarship Hub",
    tagline: "Fulbright, Chevening, DAAD, MEXT — matched to you.",
    overview: "A curated database of global scholarships with eligibility screening and deadline tracking.",
    features: ["Eligibility filters", "Deadline calendar", "Document checklist", "Saved list"],
    aiCapabilities: ["Match score by profile", "Essay prompt-specific coaching"],
  },
  {
    n: 11, slug: "research", title: "Research & Innovation",
    tagline: "Labs, RA/TA roles, journals, conferences, grants.",
    overview: "Discover research opportunities that align with your interests and career direction.",
    features: ["Lab directory", "RA/TA openings", "Journal & conference tracker", "Grant calendar"],
    aiCapabilities: ["Interest-to-lab matching", "Grant fit scoring"],
  },
  {
    n: 12, slug: "publications", title: "Publication Hub",
    tagline: "Track every paper. Sync ORCID & Scholar.",
    overview: "One place for your publications, DOIs, citations, and co-authors.",
    features: ["DOI tracker", "ORCID & Scholar sync", "Citation counts", "Co-author graph"],
    aiCapabilities: ["Journal suggestion", "Citation forecasting"],
  },
  {
    n: 13, slug: "sop", title: "SOP & Essay AI",
    tagline: "Drafted, reviewed, and rewritten by AI.",
    overview: "Statement of Purpose, personal statements, motivation letters — coached end to end.",
    features: ["Prompt library", "Version history", "Reviewer feedback"],
    aiCapabilities: ["Rubric-based scoring", "Rewrite suggestions"],
  },
  {
    n: 14, slug: "cv", title: "CV & Resume Builder",
    tagline: "Academic CV, Europass, ATS-ready — with AI review.",
    overview: "Templates for every audience with structured content and AI review.",
    features: ["Multiple templates", "PDF export", "Section snippets"],
    aiCapabilities: ["ATS score", "Impact-oriented rewrites"],
  },
  {
    n: 15, slug: "recommendations", title: "Recommendation Letters",
    tagline: "Request, remind, and draft with AI.",
    overview: "Manage the entire recommender workflow — from request to submission.",
    features: ["Recommender directory", "Reminder emails", "Draft assistant"],
    aiCapabilities: ["Personalized draft based on your CV"],
  },
  {
    n: 16, slug: "eca", title: "ECA Hub",
    tagline: "Olympiads, MUN, hackathons, sports — quantified.",
    overview: "Track and score your extracurricular impact across categories.",
    features: ["Activity log", "Evidence uploads", "Impact tags"],
    aiCapabilities: ["Impact score by application context"],
  },
  {
    n: 17, slug: "portfolio", title: "Student Portfolio",
    tagline: "A shareable public page for every applicant.",
    overview: "Projects, awards, GitHub, LinkedIn, ORCID — one clean link.",
    features: ["Custom URL", "Project cards", "Contact block"],
    aiCapabilities: ["Portfolio-quality score"],
  },
  {
    n: 18, slug: "careers", title: "Internships & Careers",
    tagline: "Remote jobs, grad programs, salary insights.",
    overview: "Find internships and graduate roles that match your profile — with an AI interview coach.",
    features: ["Filtered job board", "Salary insights", "Application tracker"],
    aiCapabilities: ["Interview simulation", "Answer scoring"],
  },
  {
    n: 19, slug: "exchange", title: "Exchange Programs",
    tagline: "Erasmus+, Global UGRAD, Campus Asia.",
    overview: "Discover semester and summer exchange programs worldwide.",
    features: ["Program catalog", "Eligibility check", "Deadline tracker"],
    aiCapabilities: ["Program fit scoring"],
  },
  {
    n: 20, slug: "test-prep", title: "Test Prep",
    tagline: "IELTS, TOEFL, SAT, GRE, GMAT, JLPT.",
    overview: "AI-driven test preparation with speaking and writing scoring.",
    features: ["Practice questions", "Timed mocks", "Score analytics"],
    aiCapabilities: ["AI speaking & writing scoring", "Adaptive question generation"],
  },
  {
    n: 21, slug: "visa", title: "Visa & Immigration",
    tagline: "Country guides, financials, interview prep, arrival.",
    overview: "Country-by-country visa guides with document checklists and interview training.",
    features: ["Country guides", "Document checklist", "Cost calculator"],
    aiCapabilities: ["Visa interview simulation"],
  },
  {
    n: 22, slug: "finance", title: "Financial Planning",
    tagline: "Tuition, living cost, scholarships, loans, currency.",
    overview: "See the true cost of every plan and how to fund it.",
    features: ["Cost calculator", "Loan comparison", "Currency conversion"],
    aiCapabilities: ["Optimal funding mix"],
  },
  {
    n: 23, slug: "community", title: "Community",
    tagline: "Country groups, alumni, mentors, study partners.",
    overview: "Talk to alumni and peers who are actually where you want to go.",
    features: ["Country groups", "Q&A boards", "Mentor booking"],
    aiCapabilities: ["Mentor matching by profile"],
  },
  {
    n: 24, slug: "events", title: "Events Hub",
    tagline: "Webinars, fairs, conferences, career events.",
    overview: "A single calendar for every event that matters to your applications.",
    features: ["Event calendar", "RSVP", "Reminders"],
    aiCapabilities: ["Event recommendations"],
  },
  {
    n: 25, slug: "news", title: "News & Updates",
    tagline: "Scholarships, rankings, visa updates, funding calls.",
    overview: "Curated news relevant to your target countries and programs.",
    features: ["Personalized feed", "Save & share"],
    aiCapabilities: ["Summarization & impact tagging"],
  },
  {
    n: 26, slug: "mentor", title: "AI Mentor",
    tagline: "Ask anything. Get matched. Get admitted.",
    overview: "A 24/7 mentor that knows your profile, your goals, and every module.",
    features: ["Chat interface", "Voice mode", "Session memory"],
    aiCapabilities: ["RAG over your profile", "Actionable next steps"],
  },
  {
    n: 27, slug: "notifications", title: "Notification Center",
    tagline: "Never miss a deadline or opportunity.",
    overview: "Push, email, and in-app notifications with smart digest scheduling.",
    features: ["Deadline alerts", "Opportunity alerts", "Digest scheduling"],
    aiCapabilities: ["Priority ranking"],
  },
  {
    n: 28, slug: "analytics", title: "AI Scores & Analytics",
    tagline: "Every score in one dashboard.",
    overview: "Admission, scholarship, research match, portfolio — all quantified over time.",
    features: ["Score trends", "Peer benchmark", "Improvement tips"],
    aiCapabilities: ["Explainable scores"],
  },
  {
    n: 29, slug: "admin", title: "Admin Panel",
    tagline: "Manage everything.",
    overview: "For staff and org admins: users, universities, scholarships, content, and AI prompts.",
    features: ["User management", "Content editor", "Prompt registry"],
    aiCapabilities: ["Moderation assistance"],
  },
  {
    n: 30, slug: "integrations", title: "APIs & Integrations",
    tagline: "Scholar, ORCID, GitHub, LinkedIn, Calendar, Stripe.",
    overview: "First-class integrations plus a public API for mobile and partners.",
    features: ["OAuth connectors", "Webhooks", "API keys"],
    aiCapabilities: ["Data enrichment pipelines"],
  },
];

export const Route = createFileRoute("/modules/$moduleId")({
  loader: ({ params }): { mod: ModuleDetail } => {
    const mod = MODULES.find((m) => m.slug === params.moduleId || String(m.n) === params.moduleId);
    if (!mod) throw notFound();
    return { mod };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.mod.title} — Atlas` },
          { name: "description", content: loaderData.mod.tagline },
          { property: "og:title", content: `${loaderData.mod.title} — Atlas` },
          { property: "og:description", content: loaderData.mod.tagline },
        ]
      : [],
  }),
  component: ModulePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="text-sm uppercase tracking-widest text-muted-foreground">Not found</p>
      <h1 className="mt-2 text-4xl font-bold">This module doesn't exist.</h1>
      <Link to="/" className="mt-6 inline-block rounded-full bg-nebula px-6 py-2.5 text-sm font-medium text-primary-foreground glow">
        Back to Atlas
      </Link>
    </div>
  ),
});

function ModulePage() {
  const { mod } = Route.useLoaderData() as { mod: ModuleDetail };
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/50 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nebula glow">
              <Compass className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Atlas</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All modules
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Module M{String(mod.n).padStart(2, "0")}
        </p>
        <h1 className="mt-3 text-4xl font-bold sm:text-6xl">
          <span className="text-gradient">{mod.title}</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{mod.tagline}</p>

        <div className="mt-10 glass rounded-3xl p-8">
          <p className="text-base leading-relaxed">{mod.overview}</p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="glass rounded-3xl p-8">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Core features
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {mod.features.map((f: string) => (
                <li key={f} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> {f}
                </li>
              ))}
            </ul>
          </section>
          <section className="glass rounded-3xl p-8">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-accent" /> AI capabilities
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {mod.aiCapabilities.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> {f}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border p-8" style={{ background: "var(--gradient-cosmic)" }}>
          <div>
            <h3 className="text-xl font-semibold">Ready to try {mod.title}?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Sign up to unlock this module and 29 more.</p>
          </div>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-2 rounded-full bg-nebula px-6 py-3 text-sm font-semibold text-primary-foreground glow"
          >
            Get started <Rocket className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}

export { MODULES };
