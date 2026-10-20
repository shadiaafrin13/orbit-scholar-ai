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