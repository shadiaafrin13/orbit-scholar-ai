import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Compass, LogOut, Sparkles, Rocket } from "lucide-react";
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

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

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
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-border glass px-4 py-1.5 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span className="text-muted-foreground">Your Atlas is ready to be built</span>
        </div>
        <h1 className="mt-6 text-4xl font-bold sm:text-5xl">
          Welcome to <span className="text-gradient">Atlas</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          You're signed in. The 30 modules — profile, universities, scholarships, research, SOPs,
          CVs, AI mentor — are next. Tell us which one to build first.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { t: "Complete your AI profile", d: "Academics, tests, ECAs, research interests." },
            { t: "Find universities", d: "Global search with AI admission odds." },
            { t: "Match scholarships", d: "Fulbright, Chevening, DAAD, and 100+ more." },
            { t: "Talk to your AI mentor", d: "Ask anything about your academic path." },
            { t: "Build your SOP", d: "Drafted and reviewed by AI." },
            { t: "Track your deadlines", d: "One calendar for every application." },
          ].map((c) => (
            <div key={c.t} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Rocket className="h-4 w-4 text-primary" /> {c.t}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
              <span className="mt-3 inline-block text-xs text-muted-foreground">Coming soon</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
