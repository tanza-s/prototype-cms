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
      label: 'Event Image',
      admin: {
        description: 'Optional. Events without art still render, in a text-only tile.',
      },
    },
    {
      name: 'imageOrientation',
      type: 'select',
      required: true,
      defaultValue: 'landscape',
      label: 'Image Orientation',
      options: [
        { label: 'Landscape', value: 'landscape' },
        { label: 'Portrait', value: 'portrait' },
      ],
    },
    /**
     * Dates and times are deliberately separate fields.
     *
     * A day-only value has no meaningful time-of-day, and a multi-day event's
     * "viewing hours" apply to every day in the run rather than describing one
     * continuous span — "May 1–13, open 12–3pm" is two dates and one daily time
     * range, which a pair of dayAndTime instants cannot express.
     *
     * Day fields are stored at UTC midnight and must be READ IN UTC. The time
     * fields are wall-clock values stored as an instant and must be read in the
     * site's timezone. See web/src/lib/api.ts, which does both conversions once
     * so nothing downstream has to think about it.
     */
    {
      name: 'startDate',
      type: 'date',
      required: true,
      label: 'Start Date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'MMM d, yyyy',
        },
      },
    },
    {
      name: 'endDate',
      type: 'date',
      label: 'End Date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'MMM d, yyyy',
        },
        description: 'Leave blank for a single-day event.',
      },
      validate: (value: unknown, { data }: { data: Partial<{ startDate: string }> }) => {
        if (!value || !data?.startDate) return true
        // Compare the stored instants directly; both are day-only so the
        // comparison is unambiguous without any timezone conversion.
        return new Date(value as string) >= new Date(data.startDate)
          ? true
          : 'End date cannot be before the start date.'
      },
    },
    {
      name: 'allDay',
      type: 'checkbox',
      defaultValue: false,
      label: 'All day',
      admin: {
        description: 'Runs all day, with no specific start or end time.',
      },
    },
    {
      name: 'startTime',
      type: 'date',
      label: 'Start Time',
      admin: {
        date: {
          pickerAppearance: 'timeOnly',
          displayFormat: 'h:mm a',
        },
        // Hiding these when All day is ticked makes the contradictory
        // "all day, but also 12–3pm" state unrepresentable.
        condition: (data) => !data?.allDay,
        description: 'For a multi-day event, the daily opening time.',
      },
    },
    {
      name: 'endTime',
      type: 'date',
      label: 'End Time',
      admin: {
        date: {
          pickerAppearance: 'timeOnly',
          displayFormat: 'h:mm a',
        },
        condition: (data) => !data?.allDay,
        description: 'For a multi-day event, the daily closing time.',
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
      name: 'bentoSize',
      type: 'select',
      defaultValue: 'auto',
      label: 'Grid Emphasis',
      options: [
        { label: 'Auto', value: 'auto' },
        { label: 'Feature (large tile)', value: 'feature' },
        { label: 'Standard (small tile)', value: 'standard' },
      ],
      admin: {
        description:
          'Auto sizes the tile from the event’s own content. Override only for marquee events.',
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
