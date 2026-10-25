import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight, Map } from "lucide-react";
import { DiscoveryShell, DiscoveryError } from "@/components/discovery-workspace";
import { countryDirectoryQuery } from "@/lib/discovery-query";
import { slugify } from "@/lib/country";
import { atlasMeta } from "@/lib/route-meta";

export const Route = createFileRoute("/_authenticated/countries")({
  loader: ({ context }) => context.queryClient.ensureQueryData(countryDirectoryQuery(context.user.id)),
  head: () => ({
    meta: [
      ...atlasMeta("Global Universities by Country", "Browse the world's universities grouped by country — start broad, then narrow to institutions, campuses, and programs."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Countries,
  errorComponent: DiscoveryError,
  notFoundComponent: () => <p>Country directory not found.</p>,
  pendingComponent: () => <p className="p-10">Loading countries…</p>,
});

function Countries() {
  const { data } = useSuspenseQuery(countryDirectoryQuery(Route.useRouteContext().user.id));
  const grouped = new Map<string, { count: number; continents: Set<string>; cities: Set<string> }>();
  for (const inst of data.institutions) {
    const entry = grouped.get(inst.country) ?? { count: 0, continents: new Set<string>(), cities: new Set<string>() };
    entry.count += 1;
    if (inst.continent) entry.continents.add(inst.continent);
    if (inst.city) entry.cities.add(inst.city);
    grouped.set(inst.country, entry);
  }
  const countries = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return <DiscoveryShell title="Global Universities by Country" subtitle="Level 1 of the university directory: every country with institution coverage. Institution summaries are directory records — individual program facts stay unverified until reviewed on official pages.">
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-border py-5">
      <p className="text-sm text-muted-foreground">{countries.length} countries · {data.institutions.length} institutions</p>
      <p className="text-xs text-muted-foreground">Sorted A–Z</p>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {countries.map(([country, info]) => (
        <Link key={country} to="/countries/$countryCode" params={{ countryCode: slugify(country) }}
          className="flex flex-col rounded-lg border border-border bg-card p-5 transition hover:border-primary/50">
          <div className="flex items-start justify-between">
            <Map className="h-5 w-5 text-primary" />
            <span className="text-xs font-mono text-muted-foreground">{info.count} {info.count === 1 ? "institution" : "institutions"}</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold hover:text-primary">{country}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{[...info.continents].join(" · ") || "—"}</p>
          <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{[...info.cities].sort().slice(0, 6).join(", ") || "Cities not published"}</p>
          <p className="mt-auto pt-4 text-xs font-medium text-primary">Browse institutions <ArrowUpRight className="inline h-3.5 w-3.5" /></p>
        </Link>
      ))}
    </div>
    {!countries.length && <div className="py-16 text-center"><h2 className="text-lg font-semibold">No countries yet</h2><p className="mt-2 text-sm text-muted-foreground">The institution directory is empty right now.</p></div>}
  </DiscoveryShell>;
}
