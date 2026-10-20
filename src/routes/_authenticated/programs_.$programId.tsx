import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiscoveryShell, DiscoveryError, FactEvidence, ProgramIdentity, SaveProgram } from "@/components/discovery-workspace";
import { discoveryQuery } from "@/lib/discovery-query";
import { factFields } from "@/lib/discovery";
import { atlasMeta } from "@/lib/route-meta";

export const Route = createFileRoute("/_authenticated/programs_/$programId")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(discoveryQuery(context.user.id));
    if (!data.programs.some((p) => p.id === params.programId)) throw notFound();
    return { title: data.programs.find((p) => p.id === params.programId)?.title };
  },
  head: ({ loaderData }) => ({ meta: atlasMeta(loaderData?.title ?? "Program details", "Review program identity, academic requirements, application cycles, and source evidence without treating unknown facts as confirmed.") }),
  component: ProgramDetail,
  errorComponent: DiscoveryError,
  notFoundComponent: () => <div className="p-10"><h1>Program not found</h1><Link to="/programs">Return to programs</Link></div>,
});

function ProgramDetail() {
  const { user } = Route.useRouteContext();
  const { programId } = Route.useParams();
  const { data } = useSuspenseQuery(discoveryQuery(user.id));
  const p = data.programs.find((p) => p.id === programId);
  if (!p) return null;
  return <DiscoveryShell title={p.title} subtitle={`${p.institution} · ${p.country} · ${p.degree_level}`}>
    <div className="mt-5 flex flex-wrap gap-3"><SaveProgram programId={p.id} saved={data.savedIds.includes(p.id)} userId={user.id} /><Button asChild variant="outline" size="sm"><Link to="/compare" search={{ ids: p.id }}><Scale />Compare program</Link></Button></div>
    <ProgramIdentity program={p} />
    <section className="mt-10"><h2 className="text-xl font-semibold">Program facts & source evidence</h2><dl className="mt-4 grid gap-x-8 sm:grid-cols-2">{factFields.map(([key, label]) => <div key={key} className="border-b border-border py-5"><dt className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{label}</dt><dd><FactEvidence fact={p.facts[key]} /></dd></div>)}</dl></section>
    <section className="mt-10 border-t border-border pt-6"><h2 className="text-xl font-semibold">Decision evidence</h2><dl className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{[["Eligibility evidence", "Needs confirmation — no reviewed requirements"], ["Profile fit", "Not assessed — planning estimate only"], ["Financial feasibility", "Unknown — costs and applicable funding unverified"], ["Data confidence", "Incomplete — program fact review pending"]].map(([label, text]) => <div key={label}><dt className="text-sm font-semibold">{label}</dt><dd className="mt-2 text-sm text-muted-foreground">{text}</dd></div>)}</dl><p className="mt-5 text-xs text-muted-foreground">These indicators are separate. None is an admission probability or an official eligibility decision.</p></section>
  </DiscoveryShell>;
}