import { createFileRoute, Link } from "@tanstack/react-router";
import { atlasModules } from "@/lib/modules";
import { atlasMeta } from "@/lib/route-meta";
import { DiscoveryShell } from "@/components/discovery-workspace";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/intelligence")({
  head: () => ({ meta: atlasMeta("Shared AI Intelligence", "Access Atlas guidance across degree preparation, academic planning, research, and applications. AI estimates are not official decisions.") }),
  component: Intelligence,
});
function Intelligence() {
  return <DiscoveryShell title="Shared AI Intelligence" subtitle="Connected guidance · estimates, not official decisions."><div className="mt-8 grid gap-4 sm:grid-cols-2">{atlasModules.filter((m) => [3, 4, 5, 9, 11, 12].includes(m.n)).map((m) => <div key={m.n} className="rounded-lg border border-border p-5"><m.icon className="h-5 w-5 text-primary" /><h2 className="mt-3 font-semibold">{m.title}</h2><Button asChild variant="link" className="mt-3 px-0"><Link to={m.to}>Open guidance</Link></Button></div>)}</div></DiscoveryShell>;
}