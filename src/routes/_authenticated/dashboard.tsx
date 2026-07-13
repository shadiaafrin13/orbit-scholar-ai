import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Compass, LogOut, Sparkles, UserRound, Rocket, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Atlas" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<{ name: string | null; path: boolean; hasProfile: boolean }>({ name: null, path: false, hasProfile: false });

  useEffect(() => {
    supabase.from("profiles").select("full_name,country,field_of_study,path_completed")
      .eq("id", user.id).maybeSingle().then(({ data }) => {
        if (data) setStatus({
          name: data.full_name,
          path: !!data.path_completed,
          hasProfile: !!(data.country || data.field_of_study),
        });
      });
  }, [user.id]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  const active = [
    { to: "/profile" as const, icon: UserRound, title: "AI Student Profile", desc: "Academics, tests, interests — powers every module.", status: status.hasProfile ? "In progress" : "Start here", n: "M02" },
    { to: "/path" as const, icon: Compass, title: "Path Selection", desc: "Personalized academic roadmap in 4 steps.", status: status.path ? "Completed" : "4 questions", n: "M03" },
  ];

  const upcoming = [
    { t: "Global Universities", n: "M09" }, { t: "Scholarship Hub", n: "M10" },
    { t: "AI Mentor", n: "M26" }, { t: "SOP & Essay AI", n: "M13" },
    { t: "CV Builder", n: "M14" }, { t: "Admission Predictor", n: "M28" },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nebula glow">
              <Compass className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">Atlas</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{user.email}</span>
            <button onClick={signOut}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-border glass px-4 py-1.5 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span className="text-muted-foreground">Welcome back{status.name ? `, ${status.name.split(" ")[0]}` : ""}</span>
        </div>
        <h1 className="mt-6 text-4xl font-bold sm:text-5xl">
          Your <span className="text-gradient">Atlas</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Modules 1–3 are live. Start with your profile, then let the wizard map your path.
        </p>

        <h2 className="mt-12 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Active modules</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {active.map((c) => (
            <Link key={c.to} to={c.to}
              className="glass group relative overflow-hidden rounded-2xl p-6 transition hover:border-primary/50 border border-border">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
                  <c.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-mono text-xs text-muted-foreground">{c.n}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary">
                {c.status} <Rocket className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>

        <h2 className="mt-12 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Coming next</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((c) => (
            <div key={c.n} className="glass rounded-2xl p-5 opacity-70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" /> {c.t}
                </div>
                <span className="font-mono text-xs text-muted-foreground">{c.n}</span>
              </div>
              <span className="mt-2 inline-block text-xs text-muted-foreground">Coming soon</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
