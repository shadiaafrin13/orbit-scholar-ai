# Country education profiles and directory completion

## What will change
- Surface existing, source-backed country education facts on each country page, with official source links, checked dates, academic-year context, and explicit unknown states.
- Include countries with a reviewed profile in the global directory, add country search and region filtering, and link each country to its profile and institutions.
- Normalize the existing UK/United Kingdom naming mismatch without breaking previously shared country links.
- Keep institution summaries and program-level facts separate; do not fill missing facts from averages or estimates.

## Technical approach
- Add an authenticated, validated read function for country profiles and cache it with TanStack Query.
- Use a small, typed fact-label registry and render profile groups with provenance; distinguish an absent profile from missing individual facts and fetch errors.
- Update the existing country directory UI and keep its university list and filters intact.
- Add focused tests for country-name normalization and fact display trust rules; run them and verify signed-in country pages in the preview.
- Update the roadmap only for the completed country-profile milestone; leave broader directory coverage and unrelated hub upgrades open.
