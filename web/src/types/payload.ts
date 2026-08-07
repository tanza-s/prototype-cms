// Shapes the Astro site consumes, mapped from the Payload REST API in ../lib/api.ts
// (events) and ../lib/pages.ts (pages).
//
// Not generated — keep in sync with cms/src/collections/ and cms/src/blocks/.
// These are the RENDERED shapes, not the stored ones: rich text is already an HTML
// string, uploads are already resolved to absolute URLs, and unions are already
// narrowed to the values the stylesheets actually have rules for.

/** A resolved upload, ready to render. */
export interface MediaImage {
  /** Absolute. A mid-size rendition when one exists, else the original. */
  url: string
  alt: string
  /**
   * `srcset` candidates, narrowest first, one per width. Empty string for an upload
   * with no renditions (anything predating the imageSizes config, or a non-image).
   */
  srcset: string
  /**
   * The ORIGINAL's dimensions, so `width`/`height` attributes fix the aspect ratio
   * and the page doesn't reflow as images load. Null when Payload didn't probe them.
   */
  width: number | null
  height: number | null
}

export interface Event {
  /** Number under the Postgres adapter; string under Mongo. */
  id: string | number
  slug: string
  title: string
  /** HTML. */
  description: string
  /** Flattened description text, for meta tags. */
  excerpt: string
  image: MediaImage | null
  imageOrientation: ImageOrientation
  /** Calendar day, 'YYYY-MM-DD'. Not an instant — timezones are resolved in ../lib/api.ts. */
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
  endTime: string | null
  location: string
  rsvpLink?: string
  /** Editorial override for the bento grid; 'auto' defers to ../lib/bento.ts. */
  bentoSize: BentoOverride
  published: boolean
}

export type BentoOverride = 'auto' | 'feature' | 'standard'

export type ImageOrientation = 'landscape' | 'portrait'

/** A flexible-content page. `layout` is the editor's block sequence, in order. */
export interface Page {
  id: string | number
  slug: string
  title: string
  /** Already resolved — ../lib/pages.ts supplies the fallbacks. */
  meta: {
    title: string
    description: string
  }
  layout: PageBlock[]
}

/**
 * Discriminated on `blockType`, which is the CMS block's slug and the exact key the
 * REST API sends, so BlockRenderer's component map can be indexed by it directly.
 */
export type PageBlock =
  | HeroBlock
  | ContentBlock
  | ImageBlock
  | MediaWithContentBlock
  | CallToActionBlock
  | EmbedBlock
  | GalleryBlock

export interface PageLink {
  label: string
  url: string
}

export type HeroStyle = 'left' | 'center' | 'full'

export interface HeroBlock {
  blockType: 'hero'
  eyebrow: string | null
  heading: string
  /** HTML, or '' when blank. */
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
  /** Non-null: ../lib/pages.ts drops the whole block when the upload doesn't resolve. */
  image: MediaImage
  caption: string | null
  /** Wraps the image in a link. Already scheme-checked by safeHref. */
  linkUrl: string | null
  size: ImageSize
}

export type MediaAlignment = 'left' | 'right'

export interface MediaWithContentBlock {
  blockType: 'mediaWithContent'
  /** Nullable, unlike ImageBlock's: this block still has its copy to show. */
  media: MediaImage | null
  caption: string | null
  /** Wraps the media in a link. Distinct from `callToAction` below. */
  linkUrl: string | null
  /** HTML. Required in the CMS, so never ''. */
  content: string
  /** Empty array when the editor added no links — never null. */
  callToAction: PageLink[]
  imageAlignment: MediaAlignment
}

/**
 * Raw third-party HTML, rendered unescaped. The ONLY block whose content isn't run
 * through the sanitising path in ../lib/richtext.ts — see cms/src/collections/Embeds.ts
 * for why, and for the admin-only authoring that compensates.
 */
export interface EmbedBlock {
  blockType: 'embed'
  /** The embed's own name, from the Embeds collection. Used to label the region. */
  title: string
  heading: string | null
  /** Provider HTML, verbatim. Never '' — ../lib/pages.ts drops the block instead. */
  html: string
}

export type CallToActionStyle = 'basic' | 'featured' | 'image'

export interface CallToActionBlock {
  blockType: 'callToAction'
  title: string | null
  description: string | null
  label: string
  url: string
  image: MediaImage | null
  style: CallToActionStyle
}

export type GalleryColumns = '2' | '3' | '4'

export type GalleryTileShape = 'landscape' | 'square' | 'portrait' | 'natural'

export interface GalleryImage {
  image: MediaImage
  /** HTML, or '' when blank. */
  caption: string
}

export interface GalleryBlock {
  blockType: 'gallery'
  title: string | null
  /** HTML, or '' when blank. */
  description: string
  /** Never empty — ../lib/pages.ts drops unresolvable rows, then the block if none survive. */
  images: GalleryImage[]
  columns: GalleryColumns
  tileShape: GalleryTileShape
  featureFirst: boolean
  enableSlideshow: boolean
  showCaptionsInGrid: boolean
}
