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

- Keep manuscript extraction deterministic and lossless: structure and format extracted words without rewriting them, because uploaded text is the author's work.
- Keep authenticated book social mutations in client-safe `*.functions.ts` modules and enforce ownership with server auth middleware, because route UI is not a security boundary.
