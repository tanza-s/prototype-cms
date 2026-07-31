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

/** An upload as Payload returns it once populated (depth >= 1). */
export interface MediaResponse {
  id: string | number
  url?: string
  alt?: string
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

  // Payload returns a site-relative URL like /api/media/file/foo.jpg
  const url = /^https?:\/\//i.test(image.url) ? image.url : `${CMS_URL}${image.url}`
  return { url, alt: altOverride?.trim() || image.alt || '' }
}

async function fetchPage<T>(
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
      const data = await fetchPage<T>(collection, params, page)
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
