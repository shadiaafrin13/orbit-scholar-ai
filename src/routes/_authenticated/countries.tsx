import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowUpRight, Map as MapIcon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DiscoveryShell, DiscoveryError } from "@/components/discovery-workspace";
import { countryDirectoryQuery } from "@/lib/discovery-query";
import { canonicalCountryName, countrySlug, slugify } from "@/lib/country";
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
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const grouped = new Map<string, { count: number; continents: Set<string>; cities: Set<string>; hasProfile: boolean }>();
  for (const inst of data.institutions) {
    const name = canonicalCountryName(inst.country);
    const entry = grouped.get(name) ?? { count: 0, continents: new Set<string>(), cities: new Set<string>(), hasProfile: false };
    entry.count += 1;
    if (inst.continent) entry.continents.add(inst.continent);
    if (inst.city) entry.cities.add(inst.city);
    grouped.set(name, entry);
  }
  for (const profile of data.countryProfiles) {
    const entry = grouped.get(profile.country) ?? { count: 0, continents: new Set<string>(), cities: new Set<string>(), hasProfile: false };
    entry.hasProfile = true;
    grouped.set(profile.country, entry);
  }
  const countries = useMemo(() => [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])), [data.institutions, data.countryProfiles]);
  const regions = [...new Set(countries.flatMap(([, info]) => [...info.continents]))].sort();
  const filteredCountries = countries.filter(([country, info]) =>
    (!region || info.continents.has(region)) &&
    `${country} ${[...info.continents].join(" ")} ${[...info.cities].join(" ")}`.toLowerCase().includes(query.toLowerCase()),
  );
  return <DiscoveryShell title="Global Universities by Country" subtitle="Browse institution coverage and reviewed country education guides. Institution summaries, country-level guidance, and program facts remain distinct records.">
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-border py-5">
      <p className="text-sm text-muted-foreground">{filteredCountries.length} of {countries.length} countries · {data.institutions.length} institutions</p>
      <p className="text-xs text-muted-foreground">Country guides are sourced separately from institution summaries.</p>
    </div>
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
        <span className="sr-only">Search countries, regions, or cities</span>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search country, region, or city" className="pl-9" />
      </label>
      <select value={region} onChange={(event) => setRegion(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filter by region">
        <option value="">All regions</option>
        {regions.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filteredCountries.map(([country, info]) => (
        <Link key={country} to="/countries/$countryCode" params={{ countryCode: countrySlug(country) }}
          className="flex flex-col rounded-lg border border-border bg-card p-5 transition hover:border-primary/50">
          <div className="flex items-start justify-between">
            <MapIcon className="h-5 w-5 text-primary" />
            <span className="text-xs font-mono text-muted-foreground">{info.count ? `${info.count} ${info.count === 1 ? "institution" : "institutions"}` : "Institutions not indexed"}</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold hover:text-primary">{country}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{[...info.continents].join(" · ") || "—"}</p>
          <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{[...info.cities].sort().slice(0, 6).join(", ") || "Cities not published"}</p>
          <p className="mt-auto pt-4 text-xs font-medium text-primary">{info.hasProfile ? "Reviewed country guide · " : "Browse directory · "}<ArrowUpRight className="inline h-3.5 w-3.5" /></p>
        </Link>
      ))}
    </div>
    {!filteredCountries.length && <div className="py-16 text-center"><h2 className="text-lg font-semibold">No countries match</h2><p className="mt-2 text-sm text-muted-foreground">Try another search or region.</p></div>}
  </DiscoveryShell>;
}
