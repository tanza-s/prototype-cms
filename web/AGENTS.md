## Node version

This project needs Node **>=22.12** (`cms/` accepts 18, so a shell whose default
`node` is 18 runs the CMS fine and fails here). `.nvmrc` at the repo root pins the
version — run `nvm use` before any `astro` command.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

Typecheck with `npx astro check` (no `scripts` entry for it).

### Dev-server gotchas

- **A newly created page or event 404s until the dev server is restarted.** Astro
  caches the `getStaticPaths()` route *list* for the server's lifetime. Edits to an
  existing document appear on refresh — the component body refetches — but a new
  route has nothing to refetch into. Fixing this properly needs an adapter.
- **A Payload dev server sitting on an interactive schema-push prompt hangs the
  build.** It accepts the connection and never answers; `lib/cms.ts` times out at 30s
  and degrades to "no documents", so the symptom is a page silently missing content.
  Answer the prompt in the CMS terminal first.

## Scoped styles: the `:global()` rule

Astro appends a scope attribute to every selector in a component's `<style>` block
(`.foo` → `.foo[data-astro-cid-abc]`) and stamps it only on elements **that component
renders itself**. Anything rendered by a *child* component carries the child's scope,
so the parent's rule matches nothing — no error, no warning, just dead CSS.

This has caused four separate bugs here, each of which looked correct on review:
`MediaWithContent` styling a `<Figure>`, `Hero` styling a class handed to `<Prose>`,
and `CallToAction` / `Gallery` styling SVGs imported as components.

Passing the class via `class:list` does not help — the class lands correctly; it's the
scope attribute that's missing.

When styling anything a child renders, either:

- use `:global(.name)` — safe here because class names are BEM-namespaced; or
- restyle a wrapper the parent owns (MediaWithContent orders `__body` to `-1` rather
  than the media to `2`); or
- have the child consume a custom property — those cross scope boundaries cleanly, as
  `Figure.astro` does with `var(--figure-radius)`.

The same applies to `set:html` content: injected HTML carries no scope attribute at
all, so `.caption p` never matches and `.caption :global(p)` is required.

## Adding a block

The checklist lives at the top of `src/components/blocks/BlockRenderer.astro`. Note
that `COMPONENTS` is typed `Record<PageBlock['blockType'], any>`: the key type catches
a *missing* block at compile time, but the `any` values mean a **wrong import** —
`import Gallery from './Image.astro'` — typechecks cleanly and fails at runtime.

## Comments

Comments are for things that will silently re-break if a future editor doesn't know
them: the scoping traps above, the UTC-vs-timezone rule in `lib/dates.ts`, the
`withoutEnlargement` srcset dedupe in `lib/cms.ts`, the unsanitised `Embed` path, WCAG
contrast constraints, and `sizes` attribute math.

Not for design rationale, change history, abandoned approaches, aesthetic
justification, or restating what the code says — git and the docs track those. JSDoc
on exports gets one line, not a paragraph.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
