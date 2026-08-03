// Shapes the Astro site consumes, mapped from the Payload REST API in ../lib/api.ts
// (events) and ../lib/pages.ts (pages).
//
// Not generated — keep in sync with cms/src/collections/ and cms/src/blocks/.
// These are the RENDERED shapes, not the stored ones: rich text is already an HTML
// string, uploads are already resolved to absolute URLs, and unions are already
// narrowed to the values the stylesheets actually have rules for.

/** A resolved upload. `url` is absolute; `alt` is never null, only empty. */
export interface MediaImage {
  url: string
  alt: string
}

export interface Event {
  /** Number under the Postgres adapter; string under Mongo. */
  id: string | number
  slug: string
  title: string
  /** Rich text already converted to an HTML string. */
  description: string
  /** Flattened description text, for meta tags. */
  excerpt: string
  image: MediaImage | null
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

/**
 * A flexible-content page. `layout` is the editor's chosen block sequence, in order.
 *
 * Drafts never reach here: cms/src/collections/Pages.ts constrains anonymous reads to
 * `_status: published`, and ../lib/pages.ts asks for the same thing explicitly.
 */
export interface Page {
  id: string | number
  slug: string
  title: string
  /**
   * Already resolved — ../lib/pages.ts falls back to the page title and to flattened
   * body text, so nothing downstream has to branch on empty meta.
   */
  meta: {
    title: string
    description: string
  }
  layout: PageBlock[]
}

/**
 * Discriminated on `blockType`, which is the CMS block's slug and the exact key the
 * REST API sends. Keeping the name means the renderer's component map can be indexed
 * by it directly, with no translation step to keep in sync.
 */
export type PageBlock =
  | HeroBlock
  | ContentBlock
  | ImageBlock
  | MediaWithContentBlock
  | CallToActionBlock

/** A labelled link. Mirrors the label/url pair used by both link-bearing blocks. */
export interface PageLink {
  label: string
  url: string
}

export type HeroStyle = 'left' | 'center' | 'full'

export interface HeroBlock {
  blockType: 'hero'
  eyebrow: string | null
  heading: string
  /** HTML, or '' when the editor left it blank. */
  intro: string
  backgroundImage: MediaImage | null
  style: HeroStyle
}

export type ContentWidth = 'narrow' | 'wide' | 'full'

export interface ContentBlock {
  blockType: 'content'
  /** HTML. Required in the CMS, so never ''. */
  content: string
  style: ContentWidth
}

export type ImageSize = 'contained' | 'wide' | 'full'

export interface ImageBlock {
  blockType: 'image'
  /**
   * Non-null: an image block with no resolvable image has nothing left to render, so
   * ../lib/pages.ts drops the whole block rather than emit an empty figure. The CMS
   * marks it required, but a deleted media doc still leaves a dangling reference.
   */
  image: MediaImage
  caption: string | null
  /**
   * Wraps the image in a link when set. Already scheme-checked by safeHref, so an
   * editor can't smuggle `javascript:` into an href.
   */
  linkUrl: string | null
  size: ImageSize
}

export type MediaAlignment = 'left' | 'right'

export interface MediaWithContentBlock {
  blockType: 'mediaWithContent'
  /**
   * Nullable, unlike ImageBlock's, for the same dangling-reference reason: this block
   * still has its required rich text to show, so a missing image degrades to a
   * single-column layout instead of dropping the copy with it.
   */
  media: MediaImage | null
  caption: string | null
  /** Wraps the media in a link when set. Distinct from `callToAction` below. */
  linkUrl: string | null
  /** HTML. Required in the CMS, so never ''. */
  content: string
  /** Empty array when the editor added no links — never null. */
  callToAction: PageLink[]
  /** Which side the media sits on above the mobile breakpoint. */
  imageAlignment: MediaAlignment
}

export type CallToActionStyle = 'basic' | 'featured' | 'image'

export interface CallToActionBlock {
  blockType: 'callToAction'
  title: string | null
  description: string
  label: string
  url: string
  image: MediaImage | null
  style: CallToActionStyle
}
