import type { BentoOverride, Event, ImageOrientation } from '../types/payload'
import { instantToCalendarDay, instantToClockTime } from './dates'
import { lexicalToHtml, lexicalToPlainText } from './richtext'
import { fetchAll, mapImage, slugify, type MediaResponse } from './cms'

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

/**
 * Fetch every published event, sorted by start date.
 * Returns [] and logs on failure so a CMS outage doesn't fail the whole build.
 */
export async function fetchEvents(): Promise<Event[]> {
  const docs = await fetchAll<EventResponse>('events', {
    'where[published][equals]': 'true',
    depth: '1', // populate the `image` upload
    sort: 'startDate',
  })

  return docs.map(mapEvent)
}
