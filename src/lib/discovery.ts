export type ProgramFact = {
  value: string | number | null;
  source_url?: string;
  source_type?: "official" | "third_party";
  checked_at?: string;
  academic_year?: string;
  intake?: string;
  verification?: "not_verified" | "reviewed_official";
  missing_reason?: "not_verified" | "not_published";
};
export type DiscoveryProgram = {
  id: string; title: string; institution: string; country: string;
  degree_level: string; subject: string | null; official_url: string;
  identity_checked_at: string | null; identity_verification: string;
  facts: Record<string, ProgramFact>;
};
export const factFields = [
  ["award", "Award"], ["duration", "Duration"], ["language", "Teaching language"],
  ["mode", "Study mode"], ["campus", "Campus"], ["department", "Department"],
  ["intake", "Intake"], ["deadline", "Application deadline"], ["tuition", "Tuition & currency / period"],
  ["funding", "Funding"], ["prerequisites", "Academic prerequisites"],
  ["language_tests", "Language tests"], ["documents", "Required documents"],
  ["curriculum", "Curriculum & research"], ["ai_rules", "Document & AI-assistance rules"],
] as const;
export function factText(fact?: ProgramFact): string {
  if (fact?.value !== null && fact?.value !== undefined && fact.value !== "") return String(fact.value);
  if (fact?.missing_reason === "not_published" && fact.verification === "reviewed_official" && fact.source_type === "official" && fact.source_url && fact.checked_at) return "Not published";
  return "Not verified";
}
export function compareSelection(current: string[], id: string) {
  return current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
}
export function parseCompareIds(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return [...new Set(value.split(",").filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))];
}