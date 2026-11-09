import { ExternalLink } from "lucide-react";
import { countryFactGroups, countryFactLabel, countryFactText, type CountryEducationFacts } from "@/lib/country";

type CountryEducationProfileResult = {
  country: string;
  profile: CountryEducationFacts | null;
  error: boolean;
};

function formatCheckedDate(value?: string): string | null {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function CountryEducationProfile({ result }: { result: CountryEducationProfileResult }) {
  if (result.error) {
    return <section id="country-profile" className="mt-8 border-y border-border py-6" aria-labelledby="country-profile-title">
      <h2 id="country-profile-title" className="text-xl font-semibold">Country education profile</h2>
      <p role="alert" className="mt-3 text-sm text-muted-foreground">The country profile could not be loaded. The university directory is still available below.</p>
    </section>;
  }

  if (!result.profile) {
    return <section id="country-profile" className="mt-8 border-y border-border py-6" aria-labelledby="country-profile-title">
      <h2 id="country-profile-title" className="text-xl font-semibold">Country education profile</h2>
      <p className="mt-3 text-sm text-muted-foreground">A reviewed education-system profile is not available for {result.country} yet.</p>
    </section>;
  }

  const knownKeys = new Set(countryFactGroups.flatMap((group) => group.fields.map(([key]) => key)));
  const extraFacts = Object.entries(result.profile).filter(([key]) => !knownKeys.has(key));
  const groups = [...countryFactGroups.map((group) => ({ ...group, facts: group.fields.map(([key, label]) => ({ key, label, fact: result.profile?.[key] })) }))];
  if (extraFacts.length) {
    groups.push({ title: "Additional guidance", facts: extraFacts.map(([key, fact]) => ({ key, label: countryFactLabel(key), fact })) });
  }

  return <section id="country-profile" className="mt-8 border-y border-border py-7" aria-labelledby="country-profile-title">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase text-primary">Country guide</p>
        <h2 id="country-profile-title" className="mt-2 text-xl font-semibold">Education system & practical guidance</h2>
      </div>
      <p className="text-xs text-muted-foreground">Country-level context only; individual universities and programs may differ.</p>
    </div>
    <div className="mt-5 grid gap-7 md:grid-cols-2">
      {groups.map((group) => <section key={group.title} aria-label={group.title}>
        <h3 className="text-sm font-semibold">{group.title}</h3>
        <dl className="mt-2 divide-y divide-border">
          {group.facts.map(({ key, label, fact }) => {
            const checkedDate = formatCheckedDate(fact?.checked_at);
            return <div key={key} className="py-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-sm">{countryFactText(fact)}</dd>
              {fact?.source_url && <a href={fact.source_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline">
                <ExternalLink className="h-3 w-3" />{fact.source_type === "official" ? "Official source" : "Third-party source"}
              </a>}
              {checkedDate && <p className="mt-1 text-xs text-muted-foreground">Checked {checkedDate}</p>}
              {fact?.academic_year && <p className="mt-1 text-xs text-muted-foreground">Applies to {fact.academic_year}</p>}
            </div>;
          })}
        </dl>
        {group.title === "Visa & work" && <p className="mt-3 text-xs text-muted-foreground">Visa and work information is general guidance, not immigration or legal advice and not a guarantee of approval. Confirm current rules with the official government source.</p>}
      </section>)}
    </div>
  </section>;
}