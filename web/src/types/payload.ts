// Shapes the Astro site consumes, mapped from the Payload REST API in ../lib/api.ts.
// Not generated — keep in sync with cms/src/collections/Events.ts.

export interface Event {
  /** Number under the Postgres adapter; string under Mongo. */
  id: string | number
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
  /** Drives the per-orientation hero layout on the event detail page. */
  imageOrientation: ImageOrientation
  /**
   * Calendar day, 'YYYY-MM-DD'. Not an instant — ../lib/api.ts resolves the
   * stored timestamp to a day once, so nothing downstream handles timezones.
   */
  startDate: string
  /** 'YYYY-MM-DD', or null for a single-day event. */
  endDate: string | null
  /** Runs all day; `startTime`/`endTime` are null when this is set. */
  allDay: boolean
  /**
   * Wall-clock time in the site timezone, 'HH:MM' (24-hour), or null.
   * On a multi-day event this is the *daily* opening time, not a one-off start.
   */
  startTime: string | null
  /** Daily closing time, 'HH:MM', or null. */
  endTime: string | null
  location: string
  rsvpLink?: string
  /**
   * Editorial override for the bento grid. 'auto' lets ../lib/bento.ts size the
   * tile from the event's own content; the others pin it to a band.
   */
  bentoSize: BentoOverride
  published: boolean
}

export type BentoOverride = 'auto' | 'feature' | 'standard'

export type ImageOrientation = 'landscape' | 'portrait'
