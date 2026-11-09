export function slugify(country: string): string {
  return country.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function canonicalCountryName(country: string): string {
  const normalized = country.trim().toLowerCase().replace(/[.]/g, "").replace(/\s+/g, " ");
  return normalized === "uk" || normalized === "united kingdom" ? "United Kingdom" : country.trim();
}

export function countrySlug(country: string): string {
  return slugify(canonicalCountryName(country));
}

export function countrySlugMatches(country: string, routeSlug: string): boolean {
  return countrySlug(country) === countrySlug(routeSlug) || slugify(country) === routeSlug;
}

export type CountryEducationFact = {
  value: string | number | boolean | null;
  source_url?: string;
  source_type?: "official" | "third_party";
  checked_at?: string;
  academic_year?: string;
  missing_reason?: "not_verified" | "not_published";
};

export type CountryEducationFacts = Record<string, CountryEducationFact>;

export const countryFactGroups = [
  { title: "Education system", fields: [["qualification", "Qualifications"], ["calendar", "Academic calendar"], ["intakes", "Typical intakes"], ["language", "Languages"]] },
  { title: "Admissions", fields: [["application_process", "Application process"], ["recognition", "Recognition & accreditation"]] },
  { title: "Study costs", fields: [["tuition", "Tuition guidance"]] },
  { title: "Visa & work", fields: [["visa", "Student visa"], ["work", "Work guidance"]] },
] as const;

export function readCountryEducationFacts(value: unknown): CountryEducationFacts {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const facts: CountryEducationFacts = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) continue;
    const record = raw as Record<string, unknown>;
    const factValue = record.value;
    const safeValue = typeof factValue === "string" || typeof factValue === "number" || typeof factValue === "boolean" ? factValue : null;
    const sourceUrl = typeof record.source_url === "string" ? record.source_url : undefined;
    const validSourceUrl = sourceUrl && /^https:\/\//i.test(sourceUrl) ? sourceUrl : undefined;
    facts[key] = {
      value: safeValue,
      ...(validSourceUrl ? { source_url: validSourceUrl } : {}),
      ...(record.source_type === "official" || record.source_type === "third_party" ? { source_type: record.source_type } : {}),
      ...(typeof record.checked_at === "string" ? { checked_at: record.checked_at } : {}),
      ...(typeof record.academic_year === "string" ? { academic_year: record.academic_year } : {}),
      ...(record.missing_reason === "not_verified" || record.missing_reason === "not_published" ? { missing_reason: record.missing_reason } : {}),
    };
  }
  return facts;
}

export function countryFactText(fact?: CountryEducationFact): string {
  if (fact?.value !== null && fact?.value !== undefined && fact.value !== "") return String(fact.value);
  const checked = fact?.checked_at && !Number.isNaN(Date.parse(fact.checked_at));
  if (fact?.missing_reason === "not_published" && fact.source_type === "official" && fact.source_url && checked) return "Not published";
  return "Not verified";
}

export function countryFactLabel(key: string): string {
  for (const group of countryFactGroups) {
    const field = group.fields.find(([fieldKey]) => fieldKey === key);
    if (field) return field[1];
  }
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
