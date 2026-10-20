export function atlasMeta(title: string, description: string) {
  return [
    { title: `${title} — Atlas` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Atlas` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}