// Shared Payload REST plumbing: where the CMS lives, how to page through a
// collection, and how to turn an upload into something renderable.
//
// Collection-specific response shapes and mappers live next to their consumer
// (./api.ts for events, ./pages.ts for pages). This file knows nothing about
// either — it only knows how to talk to Payload.

import type { MediaImage } from '../types/payload'

export const CMS_URL = import.meta.env.PUBLIC_CMS_URL || 'http://localhost:3000'

/** Payload's REST default is 10 docs per page, so paginate explicitly. */
const PAGE_SIZE = 100

/** Generous enough for a cold Payload dev server, short enough to not look hung. */
export const REQUEST_TIMEOUT_MS = 30_000

/**
 * Runaway guard. At PAGE_SIZE=100 this is 10,000 docs — far past anything this site
 * will hold, but it means a misbehaving `hasNextPage` can't spin the build forever.
 */
const MAX_PAGES = 100

/**
 * Mirror of the CMS-side helper in cms/src/fields/slug.ts. Both mappers fall back to
 * deriving a slug from the title for documents saved before the field or its hook
 * existed, so the two implementations must stay identical.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
}

/** One generated rendition, as it appears under a media document's `sizes`. */
interface MediaSizeResponse {
  url?: string | null
  width?: number | null
  height?: number | null
}

/** An upload as Payload returns it once populated (depth >= 1). */
export interface MediaResponse {
  id: string | number
  url?: string
  alt?: string
  width?: number | null
  height?: number | null
  /** Keyed by the size names in cms/src/collections/Media.ts. */
  sizes?: Record<string, MediaSizeResponse | null | undefined> | null
}

interface PaginatedResponse<T> {
  docs: T[]
  hasNextPage: boolean
  totalDocs: number
}

/**
 * Resolve a populated upload into an absolute URL plus alt text.
 *
 * Returns null when the relation is unpopulated (a bare ID, which is a number under
 * the Postgres adapter and a string under Mongo), missing, or points at a document
 * that no longer has a file — a deleted media doc leaves a dangling reference that
 * `required: true` in the CMS does nothing to prevent.
 *
 * `altOverride` is for blocks that let an editor re-caption a shared image per
 * context; resolving it here means components only ever read `image.alt`.
 */
export function mapImage(
  image: MediaResponse | number | string | null | undefined,
  altOverride?: string | null,
): MediaImage | null {
  if (!image || typeof image !== 'object' || !image.url) return null

  const renditions = collectRenditions(image.sizes)

  return {
    // Prefer a mid-size rendition over the original. Every existing `<img src>` on
    // the site therefore gets the smaller file for free, and a browser that ignores
    // srcset never falls back to a multi-megabyte original.
    url: pickDefault(renditions) ?? absoluteUrl(image.url),
    alt: altOverride?.trim() || image.alt || '',
    srcset: renditions.map(({ url, width }) => `${url} ${width}w`).join(', '),
    // From the ORIGINAL, not the rendition: these exist to fix the aspect ratio so
    // the layout doesn't shift while the image loads, and the ratio is the same
    // whichever rendition the browser picks.
    width: image.width ?? null,
    height: image.height ?? null,
  }
}

function absoluteUrl(url: string): string {
  // Payload returns a site-relative URL like /api/media/file/foo.jpg
  return /^https?:\/\//i.test(url) ? url : `${CMS_URL}${url}`
}

/**
 * Renditions sorted narrowest-first, one per width.
 *
 * Deduplication is required, not tidiness: `withoutEnlargement: true` makes every
 * size larger than the original return the original's width, so a 640px upload
 * yields medium and large both at 640w. Repeating a width in a srcset gives the
 * browser two indistinguishable candidates for the same slot.
 */
function collectRenditions(
  sizes: MediaResponse['sizes'],
): Array<{ url: string; width: number }> {
  const byWidth = new Map<number, string>()

  for (const size of Object.values(sizes ?? {})) {
    if (!size?.url || !size.width) continue
    if (!byWidth.has(size.width)) byWidth.set(size.width, absoluteUrl(size.url))
  }

  return [...byWidth.entries()]
    .sort(([a], [b]) => a - b)
    .map(([width, url]) => ({ url, width }))
}

/**
 * The `src` fallback: the narrowest rendition at least 1200px wide, or the widest
 * available when the original was smaller than that. Wide enough for a full-width
 * block on a normal display, and never the unoptimised original.
 */
function pickDefault(renditions: Array<{ url: string; width: number }>): string | null {
  if (!renditions.length) return null
  const preferred = renditions.find(({ width }) => width >= 1200)
  return (preferred ?? renditions[renditions.length - 1]).url
}

/**
 * One page of paginated *results* — not a document from the Pages collection.
 * Private; callers use fetchAll, which drives the pagination for them.
 */
async function fetchResultPage<T>(
  collection: string,
  params: Record<string, string>,
  page: number,
): Promise<PaginatedResponse<T>> {
  // `page` goes last so a caller's params can tune `limit` but can never fight the
  // pagination loop below.
  const query = new URLSearchParams({
    limit: String(PAGE_SIZE),
    ...params,
    page: String(page),
  })

  // Without a timeout a stalled CMS hangs the build indefinitely rather than
  // failing — a Payload dev server sitting on an interactive schema-push prompt
  // accepts the connection and simply never answers. fetchAll already treats a
  // failure as "no documents", so timing out degrades instead of hanging.
  const response = await fetch(`${CMS_URL}/api/${collection}?${query}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${collection} (page ${page}): ${response.status} ${response.statusText}`,
    )
  }

  return response.json()
}

/**
 * Fetch every document in a collection, following pagination to the end.
 *
 * Returns [] and logs on failure so a CMS outage doesn't fail the whole build. That
 * is all-or-nothing on purpose: a partial list would render as a complete one, and a
 * page quietly missing half its content is harder to notice than a page missing all
 * of it.
 */
export async function fetchAll<T>(
  collection: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  try {
    const docs: T[] = []
    let page = 1
    let hasNextPage = true

    while (hasNextPage) {
      if (page > MAX_PAGES) {
        throw new Error(`Refusing to fetch more than ${MAX_PAGES} pages of ${collection}`)
      }
      const data = await fetchResultPage<T>(collection, params, page)
      docs.push(...data.docs)
      hasNextPage = Boolean(data.hasNextPage)
      page += 1
    }

    return docs
  } catch (error) {
    console.error(`Error fetching ${collection}:`, error)
    return []
  }
}
