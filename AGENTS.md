<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Use `src/lib/modules.ts` as the canonical primary-module registry; render home, dashboard, and module pages from it to prevent numbering drift.
- Keep discovery catalog records separate from institution summaries; missing program facts remain null with provenance, never inferred from university averages.
- Load protected discovery data through authenticated server functions and TanStack Query; persist program bookmarks in owner-scoped tables and comparison selections in the URL.
