import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DiscoveryShell, DiscoveryError } from "@/components/discovery-workspace";
import { countryDirectoryQuery } from "@/lib/discovery-query";
import { slugify } from "@/lib/country";
import { atlasMeta } from "@/lib/route-meta";

export const Route = createFileRoute("/_authenticated/countries_/$countryCode")({
  loader: ({ context }) => context.queryClient.ensureQueryData(countryDirectoryQuery(context.user.id)),
  head: () => ({
    meta: [
      ...atlasMeta("Universities in this country", "Institution summaries for one country — cities, world rankings, tuition ranges, and teaching language. Program facts stay unverified until reviewed on official pages."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CountryPage,
  errorComponent: DiscoveryError,
  notFoundComponent: () => <p>Country not found.</p>,
  pendingComponent: () => <p className="p-10">Loading country…</p>,
});

function CountryPage() {
  const { countryCode } = Route.useParams();
  const { data } = useSuspenseQuery(countryDirectoryQuery(Route.useRouteContext().user.id));
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [campusType, setCampusType] = useState("");
  const [level, setLevel] = useState("");

  const country = data.institutions.find((i) => slugify(i.country) === countryCode)?.country;
  const cityOptions = useMemo(
    () => [...new Set(data.institutions.filter((i) => slugify(i.country) === countryCode).map((i) => i.city).filter((c): c is string => !!c))].sort(),
    [data.institutions, countryCode],
  );
  const typeOptions = useMemo(
    () => [...new Set(data.institutions.filter((i) => slugify(i.country) === countryCode).map((i) => i.campus_type).filter((t): t is string => !!t))].sort(),
    [data.institutions, countryCode],
  );
  const levelOptions = useMemo(() => {
    const all = new Set<string>();
    for (const i of data.institutions) if (slugify(i.country) === countryCode) for (const l of i.levels ?? []) all.add(l);
    return [...all].sort();
  }, [data.institutions, countryCode]);

  const filtered = data.institutions.filter((i) => {
    if (slugify(i.country) !== countryCode) return false;
    if (city && i.city !== city) return false;
    if (campusType && i.campus_type !== campusType) return false;
    if (level && !(i.levels ?? []).includes(level)) return false;
    if (query && !(i.name.toLowerCase().includes(query.toLowerCase()) || (i.city ?? "").toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  });

  if (!country) {
    return <DiscoveryShell title="Country not found" subtitle="No institution directory records match this country page.">
      <Button asChild variant="outline" className="mt-6"><Link to="/countries"><ArrowLeft />All countries</Link></Button>
    </DiscoveryShell>;
  }

  return <DiscoveryShell title={country} subtitle="Level 2 of the university directory: institution summaries. Rankings and tuition ranges are directory context — open an institution or program for source evidence before deciding anything.">
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-border py-5">
      <p className="text-sm text-muted-foreground">{filtered.length === data.institutions.filter((i) => slugify(i.country) === countryCode).length
        ? `${filtered.length} ${filtered.length === 1 ? "institution" : "institutions"}`
        : `${filtered.length} of ${data.institutions.filter((i) => slugify(i.country) === countryCode).length} institutions`}</p>
      <Button asChild variant="outline" size="sm"><Link to="/countries"><ArrowLeft />All countries</Link></Button>
    </div>

    <div className="mt-5 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search institutions…" className="pl-9" />
      </div>
      {cityOptions.length > 0 && (
        <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm" aria-label="Filter by city">
          <option value="">All cities</option>
          {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      {typeOptions.length > 0 && (
        <select value={campusType} onChange={(e) => setCampusType(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm" aria-label="Filter by institution type">
          <option value="">All types</option>
          {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      )}
      {levelOptions.length > 0 && (
        <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm" aria-label="Filter by degree level">
          <option value="">All levels</option>
          {levelOptions.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      )}
      {(query || city || campusType || level) && (
        <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setCity(""); setCampusType(""); setLevel(""); }}>Clear</Button>
      )}
    </div>

    <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filtered.map((inst) => {
        const programCount = data.programCounts?.[inst.id] ?? 0;
        return (
        <article key={inst.id} className="flex flex-col rounded-lg border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">{[inst.city, inst.campus_type].filter(Boolean).join(" · ") || country}</p>
          <Link to="/universities/$id" params={{ id: inst.id }} className="mt-3 break-words text-lg font-semibold hover:text-primary">{inst.name}</Link>
          <dl className="my-4 grid grid-cols-2 gap-3 border-y border-border py-3 text-xs">
            <div><dt className="text-muted-foreground">World rank</dt><dd>{inst.world_rank != null ? `#${inst.world_rank}` : "Not published"}</dd></div>
            <div><dt className="text-muted-foreground">Tuition (USD)</dt><dd>{inst.tuition_min_usd != null || inst.tuition_max_usd != null ? `${inst.tuition_min_usd ?? "?"}–${inst.tuition_max_usd ?? "?"}` : "Not published"}</dd></div>
            <div><dt className="text-muted-foreground">Levels</dt><dd>{inst.levels?.join(", ") || "Not published"}</dd></div>
            <div><dt className="text-muted-foreground">Programs indexed</dt><dd>{programCount > 0 ? programCount : "Catalog pending"}</dd></div>
          </dl>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/universities/$id" params={{ id: inst.id }}>View university<ArrowUpRight /></Link></Button>
            {inst.website && <Button asChild size="sm" variant="ghost"><a href={inst.website} target="_blank" rel="noopener noreferrer">Website<ExternalLink /></a></Button>}
          </div>
        </article>
        );
      })}
    </div>
    {!filtered.length && <div className="py-16 text-center"><h2 className="text-lg font-semibold">No institutions match these filters</h2><p className="mt-2 text-sm text-muted-foreground">Try clearing a filter to widen the search.</p></div>}
  </DiscoveryShell>;
}
