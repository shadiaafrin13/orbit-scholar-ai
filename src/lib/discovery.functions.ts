import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { DiscoveryProgram } from "./discovery";

export const loadDiscovery = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [programs, saved] = await Promise.all([
      context.supabase.from("discovery_programs").select("*").order("title"),
      context.supabase.from("saved_programs").select("program_id").eq("user_id", context.userId),
    ]);
    if (programs.error) throw new Error("The program catalog could not be loaded. Please try again.");
    if (saved.error) throw new Error("Your saved programs could not be loaded. Please try again.");
    return { programs: (programs.data ?? []) as unknown as DiscoveryProgram[], savedIds: (saved.data ?? []).map((r) => r.program_id) };
  });

export type CountryInstitution = {
  id: string; name: string; country: string; city: string | null; continent: string | null;
  campus_type: string | null; levels: string[] | null; language: string | null;
  world_rank: number | null; tuition_min_usd: number | null; tuition_max_usd: number | null;
  website: string | null;
};

/** Level 1–2 of the global directory: institution summaries grouped by country in the UI. */
export const loadCountryDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("universities")
      .select("id,name,country,city,continent,campus_type,levels,language,world_rank,tuition_min_usd,tuition_max_usd,website")
      .order("world_rank", { nullsFirst: false });
    if (error) throw new Error("The university directory could not be loaded. Please try again.");
    return { institutions: (data ?? []) as unknown as CountryInstitution[] };
  });

export const saveDiscoveryProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { programId: string; saved: boolean }) => z.object({ programId: z.string().uuid(), saved: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    const result = data.saved
      ? await context.supabase.from("saved_programs").upsert({ user_id: context.userId, program_id: data.programId }, { onConflict: "user_id,program_id" })
      : await context.supabase.from("saved_programs").delete().eq("user_id", context.userId).eq("program_id", data.programId);
    if (result.error) throw new Error("Your saved programs could not be updated.");
    return { saved: data.saved };
  });