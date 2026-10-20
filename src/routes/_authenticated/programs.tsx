import { createFileRoute, Link, type SearchSchemaInput } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search, Scale, X, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiscoveryShell, DiscoveryError, SaveProgram } from "@/components/discovery-workspace";
import { discoveryQuery } from "@/lib/discovery-query";
import { atlasMeta } from "@/lib/route-meta";
import { compareSelection, parseCompareIds } from "@/lib/discovery";

export const Route = createFileRoute("/_authenticated/programs")({
  validateSearch: (s: { q?: string; country?: string; level?: string; saved?: boolean | string; ids?: string } & SearchSchemaInput) => ({ q: typeof s.q === "string" ? s.q : "", country: typeof s.country === "string" ? s.country : "", level: typeof s.level === "string" ? s.level : "", saved: s.saved === true || s.saved === "true", ids: parseCompareIds(s.ids).join(",") }),
  loader: ({ context }) => context.queryClient.ensureQueryData(discoveryQuery(context.user.id)),
  head: () => ({ meta: atlasMeta("Global University & Program Hub", "Discover individual study programs, inspect source evidence, save candidates, and compare academic options.") }),
  component: Programs,
  errorComponent: DiscoveryError,
  notFoundComponent: () => <p>Program catalog not found.</p>,
  pendingComponent: () => <p className="p-10">Loading programs…</p>,
});

function Programs() {
  const { user } = Route.useRouteContext();
  const { data } = useSuspenseQuery(discoveryQuery(user.id));
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const ids = parseCompareIds(search.ids);
  const countries = [...new Set(data.programs.map((p) => p.country))].sort();
  const levels = [...new Set(data.programs.map((p) => p.degree_level))].sort();
  const filtered = data.programs.filter((p) => (!search.country || p.country === search.country) && (!search.level || p.degree_level === search.level) && (!search.saved || data.savedIds.includes(p.id)) && `${p.title} ${p.institution} ${p.country} ${p.subject ?? ""}`.toLowerCase().includes(search.q.toLowerCase()));
  function update(patch: Partial<typeof search>) { navigate({ search: (old) => ({ ...old, ...patch }), replace: true }); }
  return <DiscoveryShell title="Global University & Program Hub" subtitle="Curated program candidates. Identity, requirements, fees, and application cycles stay unverified until reviewed against official sources.">
    <div className="mt-7 flex flex-wrap gap-3 border-y border-border py-5">
      <label className="relative min-w-0 flex-1 basis-72"><span className="sr-only">Search programs</span><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm" placeholder="Program, institution, or subject" value={search.q} onChange={(e) => update({ q: e.target.value })} /></label>
      <select aria-label="Country" className="h-10 max-w-full rounded-md border border-input bg-background px-3 text-sm" value={search.country} onChange={(e) => update({ country: e.target.value })}><option value="">All countries</option>{countries.map((c) => <option key={c}>{c}</option>)}</select>
      <select aria-label="Degree level" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={search.level} onChange={(e) => update({ level: e.target.value })}><option value="">All levels</option>{levels.map((l) => <option key={l}>{l}</option>)}</select>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={search.saved} onChange={(e) => update({ saved: e.target.checked })} />Saved only</label>
      <Button variant="ghost" onClick={() => update({ q: "", country: "", level: "", saved: false })}><X />Reset</Button>
    </div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{filtered.length} of {data.programs.length} program candidates</p><Button asChild variant="outline"><Link to="/compare" search={{ ids: search.ids }}><Scale />Compare ({ids.length})</Link></Button></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filtered.map((p) => <article key={p.id} className="flex flex-col rounded-lg border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">{p.country} · {p.degree_level}</p>
        <Link to="/programs/$programId" params={{ programId: p.id }} className="mt-3 break-words text-lg font-semibold hover:text-primary">{p.title}</Link>
        <p className="mt-1 text-sm text-muted-foreground">{p.institution}</p>
        <p className="mt-4 text-xs font-medium text-primary">{p.identity_verification === "reviewed_official" ? "Identity reviewed · see fact evidence" : "Identity not verified"}</p>
        <dl className="my-4 grid grid-cols-2 gap-3 border-y border-border py-3 text-xs"><div><dt className="text-muted-foreground">Tuition</dt><dd>Not verified</dd></div><div><dt className="text-muted-foreground">Deadline</dt><dd>Not verified</dd></div></dl>
        <div className="mt-auto flex flex-wrap items-center gap-2"><SaveProgram programId={p.id} saved={data.savedIds.includes(p.id)} userId={user.id} /><Button size="sm" variant={ids.includes(p.id) ? "secondary" : "outline"} aria-pressed={ids.includes(p.id)} onClick={() => update({ ids: compareSelection(ids, p.id).join(",") })}><Scale />Compare</Button><Button asChild size="icon" variant="ghost"><Link to="/programs/$programId" params={{ programId: p.id }} aria-label={`Open ${p.title}`}><ArrowUpRight /></Link></Button></div>
      </article>)}
    </div>
    {!filtered.length && <div className="py-16 text-center"><h2 className="text-lg font-semibold">No programs found</h2><p className="mt-2 text-sm text-muted-foreground">{search.saved ? "No saved programs match these filters." : "No catalog candidates match these filters."}</p><Button className="mt-4" variant="outline" onClick={() => update({ q: "", country: "", level: "", saved: false })}>Clear filters</Button></div>}
  </DiscoveryShell>;
}