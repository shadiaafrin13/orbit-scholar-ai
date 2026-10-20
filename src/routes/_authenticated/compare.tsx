import { createFileRoute, Link, type SearchSchemaInput } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiscoveryShell, DiscoveryError, FactEvidence } from "@/components/discovery-workspace";
import { discoveryQuery } from "@/lib/discovery-query";
import { factFields, parseCompareIds } from "@/lib/discovery";
import { atlasMeta } from "@/lib/route-meta";

export const Route = createFileRoute("/_authenticated/compare")({
  validateSearch: (s: { ids?: string } & SearchSchemaInput) => ({ ids: parseCompareIds(s.ids).join(",") }),
  loader: ({ context }) => context.queryClient.ensureQueryData(discoveryQuery(context.user.id)),
  head: () => ({ meta: atlasMeta("Compare Programs", "Compare exact program candidates side by side, including sources and unverified academic, financial, and application facts.") }),
  component: Compare,
  errorComponent: DiscoveryError,
  notFoundComponent: () => <p>Comparison not found.</p>,
});

function Compare() {
  const { user } = Route.useRouteContext();
  const { data } = useSuspenseQuery(discoveryQuery(user.id));
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const ids = parseCompareIds(search.ids);
  const items = ids.flatMap((id) => { const p = data.programs.find((p) => p.id === id); return p ? [p] : []; });
  return <DiscoveryShell title="Compare Programs" subtitle="Exact program candidates side by side. Unknown requirements are not waivers; unknown tuition is not zero.">
    {items.length ? <>
      <div className="mt-7 flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{items.length} programs · application cycles not verified</p><Button asChild variant="outline"><Link to="/programs" search={{ ids: search.ids }}>Add programs</Link></Button></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead><tr><th className="min-w-40 border-b border-border px-3 py-4">Program</th>{items.map((p) => <th key={p.id} className="min-w-64 max-w-80 border-b border-border px-3 py-4 align-top"><div className="flex items-start justify-between gap-2"><Link to="/programs/$programId" params={{ programId: p.id }} className="hover:text-primary">{p.title}</Link><Button variant="ghost" size="icon" aria-label={`Remove ${p.title}`} onClick={() => navigate({ search: { ids: ids.filter((id) => id !== p.id).join(",") } })}><X /></Button></div><p className="mt-2 font-normal text-muted-foreground">{p.institution} · {p.country}</p></th>)}</tr></thead><tbody>
        <tr><th className="border-b border-border px-3 py-4 font-medium">Identity evidence</th>{items.map((p) => <td key={p.id} className="border-b border-border px-3 py-4"><p>{p.identity_verification === "reviewed_official" ? "Reviewed official" : "Not verified"}</p><a className="mt-1 inline-block text-primary underline" href={p.official_url} target="_blank" rel="noopener noreferrer">Institution page</a></td>)}</tr>
        {factFields.map(([key, label]) => <tr key={key}><th className="border-b border-border px-3 py-4 align-top font-medium">{label}</th>{items.map((p) => <td key={p.id} className="border-b border-border px-3 py-4 align-top"><FactEvidence fact={p.facts[key]} /></td>)}</tr>)}
      </tbody></table></div>
    </> : <div className="py-20 text-center"><h2 className="text-lg font-semibold">No programs selected</h2><Button asChild className="mt-5"><Link to="/programs">Browse programs</Link></Button></div>}
    {ids.length > items.length && <p role="status" className="mt-4 text-sm text-muted-foreground">Some selected programs are no longer in the catalog.</p>}
  </DiscoveryShell>;
}