import type { TextField } from 'payload'

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
}

interface SlugFieldOptions {
  /** Field the slug derives from when the editor leaves it blank. */
  sourceField?: string
  /**
   * Adds a unique index. New collections only — adding one to a populated table
   * fails if any duplicates already exist, which needs a SQL backfill first
   * (see cms/scripts/ for the house pattern).
   */
  unique?: boolean
}

/**
 * A slug that auto-derives from another field on save but stays editor-overridable.
 *
 * Deliberately NOT `required`. Field validation runs BEFORE `beforeChange` field
 * hooks, so `required: true` would reject a blank slug for being empty before the
 * hook ever gets the chance to fill it in — the auto-generation would only work if
 * the editor typed something, which defeats the point. The source field is required
 * instead, so the hook always has something to derive from.
 */
export function slugField({
  sourceField = 'title',
  unique = false,
}: SlugFieldOptions = {}): TextField {
  return {
    name: 'slug',
    type: 'text',
    label: 'URL Slug',
    unique,
    index: true,
    admin: {
      placeholder: `auto-generated from ${sourceField}`,
      description: `Leave blank to auto-generate from the ${sourceField}.`,
    },
    hooks: {
      beforeChange: [
        ({ data, originalDoc, value }) => {
          if (typeof value === 'string' && value.trim()) return slugify(value)

          // Currently, the slug for an empty document will be auto-generated from the source field,
          // on every save. This is friendly for editors who are changing page titles, but will result in broken
          // links if the slug is used in a URL. If we want to lock the slug after the first save, we can
          // check if the originalDoc exists and has a slug, and only auto-generate if it doesn't.
          // if (originalDoc?.slug) return originalDoc.slug

          // `data` holds the incoming payload, which on a partial update may not
          // carry the source field at all; fall back to the stored document so a
          // PATCH that touches one unrelated field can't blank the slug.
          const source = data?.[sourceField] ?? originalDoc?.[sourceField]
          if (typeof source === 'string' && source.trim()) return slugify(source)

          return value
        },
      ],
    },
  }
}
