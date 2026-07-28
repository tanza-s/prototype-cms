import type { Event } from '../types/payload'
import { lexicalToHtml, lexicalToPlainText } from './richtext'

const CMS_URL = import.meta.env.PUBLIC_CMS_URL || 'http://localhost:3000'

/** Payload's REST default is 10 docs per page, so paginate explicitly. */
const PAGE_SIZE = 100

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
  id: string
  url?: string
  alt?: string
}

interface EventResponse {
  id: string
  slug?: string
  title: string
  description: unknown // Lexical rich text object from Payload
  // Populated object at depth >= 1; a bare ID if depth is ever set to 0.
  image?: MediaResponse | string | null
  startDate: string
  endDate: string
  location: string
  rsvpLink?: string
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

function mapEvent(event: EventResponse): Event {
  return {
    id: event.id,
    slug: event.slug || slugify(event.title),
    title: event.title,
    description: lexicalToHtml(event.description),
    excerpt: lexicalToPlainText(event.description),
    image: mapImage(event.image),
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    rsvpLink: event.rsvpLink,
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

  const response = await fetch(`${CMS_URL}/api/events?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
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
