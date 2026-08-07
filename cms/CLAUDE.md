# Claude Code

This project uses the Payload CMS skill at `.claude/skills/payload/`.
Start with `.claude/skills/payload/SKILL.md` for a quick reference, then see
`.claude/skills/payload/reference/` for detailed docs.

## Node version

`cms/` accepts Node 18, but `web/` requires >=22.12 — see `.nvmrc` at the repo root.
Use the pinned version for both so the two halves don't need different shells.

## Schema changes

Adding a block or field creates Postgres tables, and Payload prompts interactively to
push the schema. **Answer that prompt before running an Astro build** — a dev server
sitting on it accepts connections and never answers, so the web build times out and
renders pages with content silently missing.

Payload's `defaultValue` is application-level and never reaches Postgres, so a
`required` field with a default on an already-populated table needs a SQL backfill.
See `scripts/` for the house pattern (`add-image-orientation.sql`,
`split-event-datetimes.sql`).

Run `pnpm generate:types` after any schema change. Note that
`web/src/types/payload.ts` is **hand-written**, not generated — it holds the rendered
shapes and has to be updated alongside.

## Blocks

A block defined here is only half the work; the frontend needs four more changes.
The checklist is at the top of `web/src/components/blocks/BlockRenderer.astro`.

## Comments

Comments are for things that will silently re-break if a future editor doesn't know
them — the schema-push and `defaultValue` traps above, the admin-only authoring that
compensates for the unsanitised `Embeds` collection, the UTC-vs-timezone split on
event dates.

Not for design rationale, change history, or restating what the code says. JSDoc on
exports gets one line, not a paragraph.

## Known issue

`pnpm lint` currently fails with `Cannot find package '@eslint/eslintrc'` — the
package isn't installed but `eslint.config.mjs` imports it.
