import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Award, BarChart3, Bookmark, Compass, FlaskConical, Globe, GraduationCap,
  BookOpen, LogOut, Map, Rocket, Sparkles, UserRound,
} from "lucide-react";
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

type Status = {
  name: string | null;
  avatar: string | null;
  hasProfile: boolean;
  pathDone: boolean;
  targetLevel: string | null;
  targets: number;
  taskTotal: number;
  taskDone: number;
  nextTask: { title: string; due_date: string | null } | null;
  saved: number;
};

function Dashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [s, setS] = useState<Status | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: prof }, { data: tasks }, { data: saved }] = await Promise.all([
        supabase.from("profiles").select("full_name,avatar_url,country,field_of_study,path_completed,target_level,target_countries").eq("id", user.id).maybeSingle(),
        supabase.from("tasks").select("title,due_date,completed").eq("user_id", user.id).order("due_date", { ascending: true, nullsFirst: false }),
        supabase.from("saved_items").select("id").eq("user_id", user.id),
      ]);
      const total = tasks?.length ?? 0;
      const done = tasks?.filter((t) => t.completed).length ?? 0;
      const next = tasks?.find((t) => !t.completed) ?? null;
      setS({
        name: prof?.full_name ?? null,
        avatar: prof?.avatar_url ?? null,
        hasProfile: !!(prof?.country || prof?.field_of_study),
        pathDone: !!prof?.path_completed,
        targetLevel: prof?.target_level ?? null,
        targets: prof?.target_countries?.length ?? 0,
        taskTotal: total, taskDone: done,
        nextTask: next ? { title: next.title, due_date: next.due_date } : null,
        saved: saved?.length ?? 0,
      });
    })();
  }, [user.id]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  const initials = (s?.name || user.email || "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

  const modules = [
    { to: "/profile" as const, icon: UserRound, n: "M02", title: "Student Profile", desc: "Identity, academics, tests, targets, achievements.", meta: s?.hasProfile ? "In progress" : "Start here" },
    { to: "/path" as const, icon: Compass, n: "M03", title: "Path Selection", desc: "UG · Masters · PhD · Exchange — personalized roadmap.", meta: s?.pathDone ? "Completed" : "4 questions" },
    { to: "/roadmap" as const, icon: Map, n: "M05", title: "Academic Roadmap", desc: "Tasks, deadlines, and progress in one plan.", meta: s ? `${s.taskDone}/${s.taskTotal} done` : "" },
    { to: "/undergrad" as const, icon: GraduationCap, n: "M06", title: "Undergraduate", desc: "SAT, IELTS, Common App — the UG toolkit.", meta: "Open" },
    { to: "/masters" as const, icon: BookOpen, n: "M07", title: "Master's Admission", desc: "Programs, SOP, funding, professor outreach.", meta: "Open" },
    { to: "/phd" as const, icon: FlaskConical, n: "M08", title: "PhD Admission", desc: "Proposals, advisors, fellowships, interviews.", meta: "Open" },
    { to: "/universities" as const, icon: Globe, n: "M09", title: "Global Universities", desc: "Search, filter, and save universities.", meta: s ? `${s.saved} saved` : "" },
    { to: "/scholarships" as const, icon: Award, n: "M10", title: "Scholarship Hub", desc: "Fulbright, Chevening, DAAD, MEXT & more.", meta: "Live" },
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
            <Link to="/profile" className="hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 hover:bg-secondary sm:inline-flex">
              {s?.avatar ? (
                <img src={s.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-nebula text-[10px] font-semibold text-primary-foreground">{initials}</span>
              )}
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </Link>
            <button onClick={signOut}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-border glass px-4 py-1.5 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span className="text-muted-foreground">Welcome back{s?.name ? `, ${s.name.split(" ")[0]}` : ""}</span>
        </div>
        <h1 className="mt-6 text-4xl font-bold sm:text-5xl">Your <span className="text-gradient">Atlas</span>.</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Modules 1–10 are live. Everything reads from your profile.</p>

        {/* Snapshot */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={UserRound} label="Profile" value={s?.hasProfile ? "Complete" : "Draft"} to="/profile" />
          <Stat icon={Compass} label="Path" value={s?.targetLevel || (s?.pathDone ? "Set" : "Not set")} to="/path" />
          <Stat icon={Map} label="Tasks" value={s ? `${s.taskDone}/${s.taskTotal}` : "—"} to="/roadmap" />
          <Stat icon={Bookmark} label="Saved" value={String(s?.saved ?? 0)} to="/universities" />
        </div>

        {s?.nextTask && (
          <div className="mt-6 flex items-center justify-between gap-4 glass rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Next up</p>
                <p className="text-sm font-medium">{s.nextTask.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {s.nextTask.due_date && <span>Due {new Date(s.nextTask.due_date).toLocaleDateString()}</span>}
              <Link to="/roadmap" className="rounded-full bg-nebula px-3 py-1.5 font-medium text-primary-foreground glow">Open roadmap</Link>
            </div>
          </div>
        )}

        <h2 className="mt-12 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Active modules</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((c) => (
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
              {c.meta && (
                <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary">
                  {c.meta} <Rocket className="h-3.5 w-3.5" />
                </div>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, to }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; to: "/profile" | "/path" | "/roadmap" | "/universities" }) {
  return (
    <Link to={to} className="glass rounded-2xl p-4 transition hover:border-primary/50 border border-border block">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="mt-3 text-xl font-semibold">{value}</p>
    </Link>
  );
}
