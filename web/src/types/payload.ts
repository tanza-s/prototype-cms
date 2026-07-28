// Shapes the Astro site consumes, mapped from the Payload REST API in ../lib/api.ts.
// Not generated — keep in sync with cms/src/collections/Events.ts.

export interface Event {
  id: string
  slug: string
  title: string
  /** Rich text already converted to an HTML string. */
  description: string
  /** Flattened description text, for meta tags. */
  excerpt: string
  image: {
    url: string
    alt: string
  } | null
  startDate: string
  endDate: string
  location: string
  rsvpLink?: string
  published: boolean
}
