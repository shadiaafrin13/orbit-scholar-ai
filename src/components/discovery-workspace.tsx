import { Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, Globe, Loader2, Map as MapIcon, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveDiscoveryProgram } from "@/lib/discovery.functions";
import { discoveryQuery } from "@/lib/discovery-query";
import { factText, type DiscoveryProgram, type ProgramFact } from "@/lib/discovery";
import { toast } from "sonner";

export function DiscoveryShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-20 border-b border-border bg-background/95">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><ArrowLeft />Atlas</Link></Button>
        <nav aria-label="Discovery" className="flex flex-wrap gap-1">
          <Button asChild variant="ghost" size="sm"><Link to="/programs"><Globe />Programs</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/countries"><MapIcon />Countries</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/universities">Universities</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/compare"><Scale />Compare</Link></Button>
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-5 py-9">
      <p className="text-xs font-medium uppercase text-primary">M02 · Global discovery</p>
      <h1 className="mt-3 text-3xl font-bold">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
      {children}
    </main>
  </div>;
}

export function DiscoveryError({ error }: { error: unknown }) {
  const router = useRouter();
  return <div role="alert" className="mx-auto max-w-xl space-y-4 px-5 py-20"><h1 className="text-xl font-semibold">Discovery is unavailable</h1><p>{error instanceof Error ? error.message : "Please try again."}</p><Button onClick={() => router.invalidate()}>Try again</Button></div>;
}

export function SaveProgram({ programId, saved, userId }: { programId: string; saved: boolean; userId: string }) {
  const [pending, setPending] = useState(false);
  const fn = useServerFn(saveDiscoveryProgram);
  const cache = useQueryClient();
  async function save() {
    setPending(true);
    try {
      await fn({ data: { programId, saved: !saved } });
      await cache.invalidateQueries({ queryKey: discoveryQuery(userId).queryKey });
      toast.success(saved ? "Program removed from saved" : "Program saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save program"); }
    finally { setPending(false); }
  }
  return <Button variant={saved ? "secondary" : "outline"} size="sm" onClick={save} disabled={pending} aria-pressed={saved}>
    {pending ? <Loader2 className="animate-spin" /> : saved ? <BookmarkCheck /> : <Bookmark />}{saved ? "Saved" : "Save"}
  </Button>;
}

export function FactEvidence({ fact }: { fact?: ProgramFact }) {
  return <div>
    <p className="whitespace-pre-wrap break-words text-sm">{factText(fact)}</p>
    {fact?.value != null && <p className="mt-1 text-xs text-muted-foreground">{fact.verification === "reviewed_official" && fact.source_type === "official" ? "Reviewed official source" : "Not verified"}</p>}
    {fact?.source_url && <a href={fact.source_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline"><ExternalLink className="h-3 w-3" />{fact.source_type === "official" ? "Official source" : "Third-party source"}</a>}
    {fact?.checked_at && <p className="mt-1 text-xs text-muted-foreground">Checked {new Date(fact.checked_at).toLocaleDateString("en-GB", { timeZone: "UTC" })}</p>}
    {(fact?.academic_year || fact?.intake) && <p className="text-xs text-muted-foreground">{[fact.academic_year, fact.intake].filter(Boolean).join(" · ")}</p>}
  </div>;
}

export function ProgramIdentity({ program }: { program: DiscoveryProgram }) {
  return <div className="mt-6 border-l-2 border-primary pl-4">
    <p className="text-sm font-medium">{program.identity_verification === "reviewed_official" ? "Identity reviewed against official source" : "Program candidate · identity not verified"}</p>
    <a href={program.official_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm text-primary underline">Institution program page<ExternalLink className="h-3.5 w-3.5" /></a>
    <p className="mt-1 text-xs text-muted-foreground">{program.identity_checked_at ? `Checked ${new Date(program.identity_checked_at).toLocaleDateString("en-GB", { timeZone: "UTC" })}` : "Official-page review pending"}</p>
  </div>;
}