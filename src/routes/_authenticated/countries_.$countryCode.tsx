import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const institutions = data.institutions.filter((i) => slugify(i.country) === countryCode);
  if (!institutions.length) {
    return <DiscoveryShell title="Country not found" subtitle="No institution directory records match this country page.">
      <Button asChild variant="outline" className="mt-6"><Link to="/countries"><ArrowLeft />All countries</Link></Button>
    </DiscoveryShell>;
  }
  const country = institutions[0].country;
  const cities = [...new Set(institutions.map((i) => i.city).filter((c): c is string => !!c))].sort();
  return <DiscoveryShell title={country} subtitle="Level 2 of the university directory: institution summaries. Rankings and tuition ranges are directory context — open an institution or program for source evidence before deciding anything.">
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-border py-5">
      <p className="text-sm text-muted-foreground">{institutions.length} {institutions.length === 1 ? "institution" : "institutions"}{cities.length ? ` · ${cities.slice(0, 8).join(", ")}` : ""}</p>
      <Button asChild variant="outline" size="sm"><Link to="/countries"><ArrowLeft />All countries</Link></Button>
    </div>
    <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {institutions.map((inst) => (
        <article key={inst.id} className="flex flex-col rounded-lg border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">{[inst.city, inst.campus_type].filter(Boolean).join(" · ") || country}</p>
          <Link to="/universities/$id" params={{ id: inst.id }} className="mt-3 break-words text-lg font-semibold hover:text-primary">{inst.name}</Link>
          <dl className="my-4 grid grid-cols-2 gap-3 border-y border-border py-3 text-xs">
            <div><dt className="text-muted-foreground">World rank</dt><dd>{inst.world_rank != null ? `#${inst.world_rank}` : "Not published"}</dd></div>
            <div><dt className="text-muted-foreground">Tuition (USD)</dt><dd>{inst.tuition_min_usd != null || inst.tuition_max_usd != null ? `${inst.tuition_min_usd ?? "?"}–${inst.tuition_max_usd ?? "?"}` : "Not published"}</dd></div>
            <div><dt className="text-muted-foreground">Levels</dt><dd>{inst.levels?.join(", ") || "Not published"}</dd></div>
            <div><dt className="text-muted-foreground">Language</dt><dd>{inst.language || "Not published"}</dd></div>
          </dl>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/universities/$id" params={{ id: inst.id }}>Details<ArrowUpRight /></Link></Button>
            {inst.website && <Button asChild size="sm" variant="ghost"><a href={inst.website} target="_blank" rel="noopener noreferrer">Website<ExternalLink /></a></Button>}
          </div>
        </article>
      ))}
    </div>
  </DiscoveryShell>;
}
