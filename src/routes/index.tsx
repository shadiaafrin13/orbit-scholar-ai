import { createFileRoute, Link } from "@tanstack/react-router";
import {
  GraduationCap, Sparkles, Globe, Award, FlaskConical, FileText,
  BookOpen, User, Users, Briefcase, Plane, Wallet, MessageSquare,
  Bell, BarChart3, Shield, Zap, Rocket, Map, Compass, Trophy,
  Send, Calendar, Newspaper, Brain, Building2, Languages, Presentation,
  Network,
} from "lucide-react";
import type { ComponentType } from "react";

export const Route = createFileRoute("/")({
  component: Landing,
});

type Module = { n: number; slug: string; title: string; desc: string; icon: ComponentType<{ className?: string }> };

const modules: Module[] = [
  { n: 1, title: "Authentication & Roles", desc: "Students, parents, counselors, professors, universities — one identity.", icon: Shield },
  { n: 2, title: "AI Student Profile", desc: "Academics, tests, ECAs, publications — scored by AI.", icon: User },
  { n: 3, title: "Path Selection", desc: "UG, Master's, PhD, Postdoc, Exchange, Research — personalized roadmaps.", icon: Compass },
  { n: 4, title: "AI Dashboard", desc: "Daily tasks, deadlines, recommendations, and your AI mentor.", icon: BarChart3 },
  { n: 5, title: "Academic Roadmap", desc: "Year, semester, GPA, and habit planners in one place.", icon: Map },
  { n: 6, title: "Undergraduate Abroad", desc: "SAT, ACT, IELTS, Common App, UC — the full UG toolkit.", icon: GraduationCap },
  { n: 7, title: "Master's Admission", desc: "Programs, SOP, CV, funding, and professor outreach.", icon: BookOpen },
  { n: 8, title: "PhD Admission", desc: "Research proposals, professor finder, fellowships, interview prep.", icon: FlaskConical },
  { n: 9, title: "Global Universities", desc: "28+ countries. Rankings, fees, requirements, AI admission odds.", icon: Globe },
  { n: 10, title: "Scholarship Hub", desc: "Fulbright, Chevening, DAAD, MEXT — matched to your profile.", icon: Award },
  { n: 11, title: "Research & Innovation", desc: "Labs, RA/TA roles, journals, conferences, grants.", icon: Brain },
  { n: 12, title: "Publication Hub", desc: "Tracker, DOI, ORCID & Scholar sync, citation counts.", icon: FileText },
  { n: 13, title: "SOP & Essay AI", desc: "SOPs, personal statements, motivation letters — reviewed by AI.", icon: Sparkles },
  { n: 14, title: "CV & Resume Builder", desc: "Academic CV, Europass, ATS-ready — with AI review.", icon: FileText },
  { n: 15, title: "Recommendation Letters", desc: "Request, remind, and draft with AI assistance.", icon: Send },
  { n: 16, title: "ECA Hub", desc: "Olympiads, MUN, hackathons, sports — tracked with impact scores.", icon: Trophy },
  { n: 17, title: "Student Portfolio", desc: "Projects, awards, GitHub, LinkedIn, ORCID — shareable.", icon: Presentation },
  { n: 18, title: "Internships & Careers", desc: "Remote jobs, grad programs, salary insights, AI interview coach.", icon: Briefcase },
  { n: 19, title: "Exchange Programs", desc: "Erasmus+, Global UGRAD, Campus Asia, summer schools.", icon: Plane },
  { n: 20, title: "Test Prep", desc: "IELTS, TOEFL, SAT, GRE, GMAT, JLPT — AI speaking & writing.", icon: Languages },
  { n: 21, title: "Visa & Immigration", desc: "Country guides, financials, interview prep, arrival.", icon: Plane },
  { n: 22, title: "Financial Planning", desc: "Tuition, living cost, scholarships, loans, currency.", icon: Wallet },
  { n: 23, title: "Community", desc: "Country groups, alumni, mentors, study partners, Q&A.", icon: Users },
  { n: 24, title: "Events Hub", desc: "Webinars, university fairs, conferences, career fairs.", icon: Calendar },
  { n: 25, title: "News & Updates", desc: "Scholarships, rankings, visa updates, funding calls.", icon: Newspaper },
  { n: 26, title: "AI Mentor", desc: "Ask anything. Get matched. Get admitted.", icon: MessageSquare },
  { n: 27, title: "Notification Center", desc: "Deadlines, scholarships, professor openings — never miss one.", icon: Bell },
  { n: 28, title: "AI Scores & Analytics", desc: "Admission, scholarship, research match, portfolio — all quantified.", icon: BarChart3 },
  { n: 29, title: "Admin Panel", desc: "Manage users, universities, scholarships, content, and AI prompts.", icon: Building2 },
  { n: 30, title: "APIs & Integrations", desc: "Scholar, ORCID, GitHub, LinkedIn, Calendar, Stripe, and more.", icon: Network },
];

const stats = [
  { k: "30", v: "Integrated modules" },
  { k: "28+", v: "Countries covered" },
  { k: "15+", v: "AI systems" },
  { k: "1", v: "Unified profile" },
];

const pillars = [
  { icon: Rocket, title: "Admission Intelligence", body: "AI predicts your admission odds across universities and scholarships based on live requirements." },
  { icon: Brain, title: "Research Copilot", body: "Match professors, journals, and conferences. Generate topics, review abstracts, close research gaps." },
  { icon: Zap, title: "One Profile, Every Path", body: "From high school to postdoc. Every module reads from — and improves — your Atlas profile." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-28 sm:pt-32">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full opacity-40 blur-3xl bg-nebula" />
        </div>
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border glass px-4 py-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="text-muted-foreground">The world's most comprehensive AI academic platform</span>
          </div>
          <h1 className="text-5xl font-bold leading-[1.05] sm:text-7xl">
            Your entire academic future,{" "}
            <span className="text-gradient">orchestrated by AI.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Atlas unifies study abroad, scholarships, research, publications, and career development
            into one intelligent profile — with 30 modules and an AI mentor that knows your journey.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-full bg-nebula px-7 py-3.5 text-sm font-semibold text-primary-foreground glow transition hover:scale-[1.02]"
            >
              Start with Atlas <Rocket className="h-4 w-4" />
            </Link>
            <a
              href="#modules"
              className="inline-flex items-center gap-2 rounded-full border border-border glass px-7 py-3.5 text-sm font-medium hover:bg-secondary"
            >
              Explore 30 modules
            </a>
          </div>

          <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.v} className="glass rounded-2xl p-4 text-center">
                <dt className="text-3xl font-bold text-gradient">{s.k}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Pillars */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((p) => (
              <div key={p.title} className="glass rounded-3xl p-8">
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-nebula glow">
                  <p.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="text-sm uppercase tracking-widest text-accent">The platform</p>
            <h2 className="mt-2 text-4xl font-bold sm:text-5xl">30 modules. One Atlas.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Every module talks to every other. Your SOP knows your CV. Your dashboard knows your deadlines.
              Your AI mentor knows you.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <article
                key={m.n}
                className="group relative overflow-hidden rounded-2xl border border-border glass p-6 transition hover:border-primary/50"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                    <m.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">M{String(m.n).padStart(2, "0")}</span>
                </div>
                <h3 className="text-base font-semibold">{m.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{m.desc}</p>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0 transition group-hover:opacity-100 bg-nebula" />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Countries strip */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="mb-6 text-center text-xs uppercase tracking-widest text-muted-foreground">
            Universities and scholarships across 28+ countries
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["USA","UK","Canada","Australia","Germany","Japan","South Korea","Singapore","Netherlands","Sweden","Finland","Denmark","Ireland","Switzerland","France","Italy","Spain","China","New Zealand","UAE","Turkey","Norway","Belgium","Austria","Poland","Portugal","Hungary","Malaysia"].map((c) => (
              <span key={c} className="rounded-full border border-border glass px-3 py-1 text-xs text-muted-foreground">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border p-10 text-center glass" style={{ background: "var(--gradient-cosmic)" }}>
          <h2 className="text-3xl font-bold sm:text-5xl">Ready to map your future?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Create your Atlas profile in minutes. Let AI take it from there.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-nebula px-8 py-3.5 text-sm font-semibold text-primary-foreground glow"
          >
            Create free account <Rocket className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nebula glow">
            <Compass className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Atlas</span>
        </Link>
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="#modules" className="hover:text-foreground">Modules</a>
          <a href="#modules" className="hover:text-foreground">Scholarships</a>
          <a href="#modules" className="hover:text-foreground">Research</a>
          <a href="#modules" className="hover:text-foreground">AI Mentor</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth" search={{ mode: "login" }} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-full bg-nebula px-4 py-2 text-sm font-medium text-primary-foreground glow"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} Atlas — AI for global students.</p>
        <p>Study Abroad · Scholarships · Research · Publications · Careers</p>
      </div>
    </footer>
  );
}
