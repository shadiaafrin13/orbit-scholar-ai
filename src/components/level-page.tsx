import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Award, ExternalLink, Globe, ListChecks, Plus, Sparkles } from "lucide-react";

type Props = {
  level: "UG" | "Masters" | "PhD";
  icon: React.ComponentType<{ className?: string }>;
  heading: string;
  subtitle: string;
  checklist: string[];
};

type Univ = { id: string; name: string; country: string | null; world_rank: number | null };
type Sch = { id: string; name: string; provider: string | null; deadline: string | null; fully_funded: boolean };

export function LevelPage({ level, icon: Icon, heading, subtitle, checklist }: Props) {
  const [profile, setProfile] = useState<{ target_countries: string[] | null; user_id: string } | null>(null);
  const [univs, setUnivs] = useState<Univ[]>([]);
  const [schs, setSchs] = useState<Sch[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: prof }, { data: universities }, { data: scholarships }] = await Promise.all([
        supabase.from("profiles").select("target_countries").eq("id", u.user.id).maybeSingle(),
        supabase.from("universities").select("id,name,country,world_rank").contains("levels", [level]).order("world_rank", { nullsFirst: false }).limit(6),
        supabase.from("scholarships").select("id,name,provider,deadline,fully_funded").ilike("level", `%${level}%`).order("deadline", { ascending: true, nullsFirst: false }).limit(6),
      ]);
      setProfile({ target_countries: prof?.target_countries ?? [], user_id: u.user.id });
      setUnivs((universities as Univ[]) ?? []);
      setSchs((scholarships as Sch[]) ?? []);
    })();
  }, [level]);

  async function addAllToRoadmap() {
    if (!profile) return;
    const rows = checklist.map((title) => ({ user_id: profile.user_id, title, category: "Application", priority: "normal" }));
    const { error } = await supabase.from("tasks").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} tasks added to your roadmap`);
  }

  const targetCountries = profile?.target_countries ?? [];
  const matched = targetCountries.length ? univs.filter((u) => u.country && targetCountries.includes(u.country)) : univs;

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nebula glow">
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold"><span className="text-gradient">{heading}</span></h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {targetCountries.length > 0 && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border glass px-3 py-1 text-xs">
          <Sparkles className="h-3 w-3 text-accent" /> Tailored for: {targetCountries.join(", ")}
        </p>
      )}

      <section className="mt-8 glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><ListChecks className="h-4 w-4 text-primary" /> Application checklist</h2>
          <button onClick={addAllToRoadmap}
            className="inline-flex items-center gap-1.5 rounded-full bg-nebula px-4 py-1.5 text-xs font-semibold text-primary-foreground glow">
            <Plus className="h-3.5 w-3.5" /> Add all to roadmap
          </button>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {checklist.map((c) => (
            <li key={c} className="rounded-xl border border-border bg-background/40 px-4 py-2.5 text-sm">{c}</li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Globe className="h-4 w-4 text-primary" /> Matched universities</h2>
            <Link to="/universities" className="text-xs text-primary hover:underline">Browse all →</Link>
          </div>
          <ul className="mt-4 space-y-2">
            {matched.length === 0 && <li className="text-sm text-muted-foreground">Add target countries in your profile to get matches.</li>}
            {matched.map((u) => (
              <li key={u.id} className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-4 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.country}{u.world_rank ? ` · #${u.world_rank}` : ""}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Award className="h-4 w-4 text-primary" /> Scholarships for {level}</h2>
            <Link to="/scholarships" className="text-xs text-primary hover:underline">Browse all →</Link>
          </div>
          <ul className="mt-4 space-y-2">
            {schs.map((x) => (
              <li key={x.id} className="rounded-xl border border-border bg-background/40 px-4 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{x.name}</p>
                  {x.fully_funded && <ExternalLink className="h-3 w-3 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">{x.provider}{x.deadline ? ` · Deadline ${new Date(x.deadline).toLocaleDateString()}` : ""}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
