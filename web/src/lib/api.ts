import type { BentoOverride, Event, ImageOrientation } from '../types/payload'
import { instantToCalendarDay, instantToClockTime } from './dates'
import { lexicalToHtml, lexicalToPlainText } from './richtext'

const CMS_URL = import.meta.env.PUBLIC_CMS_URL || 'http://localhost:3000'

/** Payload's REST default is 10 docs per page, so paginate explicitly. */
const PAGE_SIZE = 100

/** Generous enough for a cold Payload dev server, short enough to not look hung. */
const REQUEST_TIMEOUT_MS = 30_000

// Helper function to slugify text
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
}

interface MediaResponse {
  id: string | number
  url?: string
  alt?: string
}

interface EventResponse {
  id: string | number
  slug?: string
  title: string
  description: unknown // Lexical rich text object from Payload
  // Populated object at depth >= 1; a bare ID if depth is ever set to 0.
  image?: MediaResponse | string | null
  imageOrientation?: string | null
  startDate: string
  endDate?: string | null
  allDay?: boolean | null
  startTime?: string | null
  endTime?: string | null
  location: string
  rsvpLink?: string
  bentoSize?: string | null
  published: boolean
}

interface PaginatedResponse<T> {
  docs: T[]
  hasNextPage: boolean
  totalDocs: number
}

function mapImage(image: EventResponse['image']): Event['image'] {
  // Unpopulated (string ID) or missing uploads have no URL to render.
  if (!image || typeof image === 'string' || !image.url) return null

  // Payload returns a site-relative URL like /api/media/file/foo.jpg
  const url = /^https?:\/\//i.test(image.url) ? image.url : `${CMS_URL}${image.url}`
  return { url, alt: image.alt ?? '' }
}

/** Events saved before `bentoSize` existed come back null, so fall back to 'auto'. */
function mapBentoSize(value: EventResponse['bentoSize']): BentoOverride {
  return value === 'feature' || value === 'standard' ? value : 'auto'
}

/**
 * Narrow to the two orientations the stylesheet has rules for. Anything else —
 * a null from a row predating the column, or a value added to the CMS select
 * without matching CSS — lands on 'landscape' rather than producing a class
 * like `event__hero--undefined` that silently matches nothing.
 */
function mapImageOrientation(value: EventResponse['imageOrientation']): ImageOrientation {
  return value === 'portrait' ? 'portrait' : 'landscape'
}

/**
 * Resolve the stored schedule into plain day/time strings.
 *
 * Day and time fields get opposite timezone treatment — see the header of
 * ./dates.ts. Doing it here means nothing downstream of this function handles a
 * timezone, or even sees a Date.
 */
function mapSchedule(event: EventResponse) {
  const startDate = instantToCalendarDay(event.startDate)
  const endDate = instantToCalendarDay(event.endDate)
  const allDay = Boolean(event.allDay)

  return {
    // startDate is required in the CMS; the fallback only guards malformed data.
    startDate: startDate ?? '',
    // Collapse an end date equal to the start into null, so "single day" has
    // exactly one representation downstream instead of two.
    endDate: endDate && endDate !== startDate ? endDate : null,
    allDay,
    // An all-day event has no meaningful clock time. The CMS hides the fields
    // rather than clearing them, so stale values can survive a ticked box.
    startTime: allDay ? null : instantToClockTime(event.startTime),
    endTime: allDay ? null : instantToClockTime(event.endTime),
  }
}

function mapEvent(event: EventResponse): Event {
  return {
    id: event.id,
    slug: event.slug || slugify(event.title),
    title: event.title,
    description: lexicalToHtml(event.description),
    excerpt: lexicalToPlainText(event.description),
    image: mapImage(event.image),
    imageOrientation: mapImageOrientation(event.imageOrientation),
    ...mapSchedule(event),
    location: event.location,
    rsvpLink: event.rsvpLink,
    bentoSize: mapBentoSize(event.bentoSize),
    published: event.published,
  }
}

async function fetchPage(page: number): Promise<PaginatedResponse<EventResponse>> {
  const params = new URLSearchParams({
    'where[published][equals]': 'true',
    limit: String(PAGE_SIZE),
    page: String(page),
    depth: '1', // populate the `image` upload
    sort: 'startDate',
  })

  // Without a timeout a stalled CMS hangs the build indefinitely rather than
  // failing — a Payload dev server sitting on an interactive schema-push prompt
  // accepts the connection and simply never answers. fetchEvents already treats
  // a failure as "no events", so timing out degrades instead of hanging.
  const response = await fetch(`${CMS_URL}/api/events?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch events (page ${page}): ${response.status} ${response.statusText}`,
    )
  }

  return response.json()
}

/**
 * Fetch every published event, sorted by start date.
 * Returns [] and logs on failure so a CMS outage doesn't fail the whole build.
 */
export async function fetchEvents(): Promise<Event[]> {
  try {
    const events: Event[] = []
    let page = 1
    let hasNextPage = true

    while (hasNextPage) {
      const data = await fetchPage(page)
      events.push(...data.docs.map(mapEvent))
      hasNextPage = Boolean(data.hasNextPage)
      page += 1
    }

    return events
  } catch (error) {
    console.error('Error fetching events:', error)
    return []
  }
}
