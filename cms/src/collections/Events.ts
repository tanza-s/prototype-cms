import type { CollectionConfig } from 'payload'

// Helper function to slugify text
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
}

/**
 * IMPORTANT: When adding hooks to this collection:
 * - Use `beforeChange` for field auto-generation (runs once on save)
 * - AVOID `beforeValidate` for recursive operations - it runs during validation
 *   and can cause infinite loops / stack overflow errors
 * - Keep hook logic simple and non-recursive
 * - Field-level hooks must return the FIELD VALUE. Only collection-level hooks
 *   return the whole `data` object; returning `data` from a field hook writes
 *   the entire document into that one field.
 */
export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'startDate', 'endDate', 'location'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Event Title',
    },
    {
      name: 'slug',
      type: 'text',
      label: 'URL Slug',
      admin: {
        placeholder: 'auto-generated from title',
        description: 'Leave blank to auto-generate from title',
      },
      hooks: {
        beforeChange: [
          ({ data, value }) => {
            // Normalize an editor-supplied slug, otherwise derive one from the title.
            if (typeof value === 'string' && value.trim()) return slugify(value)
            if (data?.title) return slugify(data.title)
            return value
          },
        ],
      },
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
      label: 'Description',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Event Image',
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      label: 'Start Date & Time',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'endDate',
      type: 'date',
      required: true,
      label: 'End Date & Time',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'location',
      type: 'text',
      required: true,
      label: 'Event Location',
    },
    {
      name: 'rsvpLink',
      type: 'text',
      label: 'RSVP Link',
      admin: {
        placeholder: 'https://example.com/rsvp',
      },
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
      label: 'Published',
      admin: {
        description: 'Check to make this event visible on the site',
      },
    },
  ],
}
