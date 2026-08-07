// Shared event date/time handling.
//
// Days and times need OPPOSITE timezone treatment, which is the one thing to know
// here:
//
//   * A calendar day is not an instant. Payload stores it at midnight, and reading
//     `2027-05-01T00:00:00Z` in Pacific time yields April 30. Days are read and
//     formatted in UTC, always.
//   * A clock time IS an instant, recording what the editor typed, so it's read in
//     the college's timezone.
//
// instantToCalendarDay / instantToClockTime apply those rules once at the API
// boundary; everything after is plain 'YYYY-MM-DD' and 'HH:MM' with no timezone
// semantics left.

const TIME_ZONE = import.meta.env.PUBLIC_EVENT_TIME_ZONE || 'America/Los_Angeles'

export interface EventSchedule {
  /** 'YYYY-MM-DD' */
  startDate: string
  /** 'YYYY-MM-DD', or null for a single-day event. */
  endDate: string | null
  allDay: boolean
  /** 'HH:MM' 24-hour, or null. */
  startTime: string | null
  endTime: string | null
}

// ---------------------------------------------------------------- boundary

/** Day formatter in the college's timezone, used by todayIso(). */
const isoDayInZone = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** 24-hour 'HH:MM' in the college's timezone. */
const clockTimeInZone = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function parseInstant(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Stored day-only timestamp → 'YYYY-MM-DD'. Read in UTC; see the file header. */
export function instantToCalendarDay(value: string | null | undefined): string | null {
  const date = parseInstant(value)
  return date ? date.toISOString().slice(0, 10) : null
}

/** Stored time-only timestamp → 'HH:MM'. Read in the site timezone. */
export function instantToClockTime(value: string | null | undefined): string | null {
  const date = parseInstant(value)
  return date ? clockTimeInZone.format(date) : null
}

/** Today as 'YYYY-MM-DD' in the college's timezone — the site's "now". */
export function todayIso(now: Date = new Date()): string {
  return isoDayInZone.format(now)
}

// ---------------------------------------------------------------- display

/**
 * 'YYYY-MM-DD' → a Date pinned to UTC noon. Noon, not midnight, so even an
 * accidental local-time read lands on the right day in any timezone.
 */
function dayToDate(day: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) return null
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12))
}

function parseClock(time: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return { hour, minute }
}

const dayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const shortDayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const weekdayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

/** Single day, long month: "May 1, 2027". */
export function formatDay(day: string): string {
  const date = dayToDate(day)
  return date ? dayFormat.format(date) : ''
}

/** Single day, short month: "Aug 1, 2026" — matches the range formatting. */
export function formatShortDay(day: string): string {
  const date = dayToDate(day)
  return date ? shortDayFormat.format(date) : ''
}

/** Single day with weekday, e.g. "Saturday, May 1, 2027". */
export function formatWeekday(day: string): string {
  const date = dayToDate(day)
  return date ? weekdayFormat.format(date) : ''
}

/**
 * Day range. `formatRange` collapses shared parts on its own, giving
 * "May 1 – 13, 2027" or "Dec 28, 2026 – Jan 3, 2027" as appropriate.
 */
function formatDayRange(start: string, end: string, long: boolean): string {
  const a = dayToDate(start)
  const b = dayToDate(end)
  if (!a || !b) return ''
  const formatter = long ? dayFormat : shortDayFormat
  // ICU wraps its en dash in U+2009 thin spaces. The time ranges built below use
  // ordinary spaces, so without this a single label would carry two different
  // dash spacings — "May 1 – 13, 2027 · Daily 12 – 3 PM" with mismatched gaps.
  return formatter.formatRange(a, b).replace(/\u2009/g, ' ')
}

/** "12 PM", "12:30 PM" — the ":00" is dropped on the hour. */
export function formatTime(time: string): string {
  const parsed = parseClock(time)
  if (!parsed) return ''
  const { hour, minute } = parsed
  const meridiem = hour < 12 ? 'AM' : 'PM'
  const display = hour % 12 === 0 ? 12 : hour % 12
  // Non-breaking space: in a narrow bento tile the label otherwise wraps between
  // the hour and its meridiem, leaving a stranded "PM" on its own line.
  return minute === 0
    ? `${display}\u00A0${meridiem}`
    : `${display}:${String(minute).padStart(2, '0')}\u00A0${meridiem}`
}

/** "12 – 3 PM" when both sides share a meridiem, else "11 AM – 1 PM". */
function formatTimeRange(start: string, end: string | null): string {
  if (!end) return formatTime(start)

  const a = parseClock(start)
  const b = parseClock(end)
  if (!a || !b) return formatTime(start)

  const sameMeridiem = a.hour < 12 === b.hour < 12
  if (!sameMeridiem) return `${formatTime(start)} – ${formatTime(end)}`

  // Drop the leading meridiem: "12 – 3 PM" rather than "12 PM – 3 PM".
  // Matches the non-breaking space formatTime emits, not a plain one.
  return `${formatTime(start).replace(/\u00A0(AM|PM)$/, '')} – ${formatTime(end)}`
}

/** The time half of the label, or '' when there's nothing to say. */
function formatTimePart(event: EventSchedule, multiDay: boolean): string {
  if (event.allDay) return 'All day'
  if (!event.startTime) return ''

  const range = formatTimeRange(event.startTime, event.endTime)
  // On a multi-day run the hours repeat each day; without "Daily" the label
  // reads as one continuous span from the first morning to the last afternoon.
  if (multiDay) return `Daily ${range}`
  return event.endTime ? range : `From ${range}`
}

/**
 * The date and time halves of the label, kept apart: the detail page stacks them,
 * the cards join them with a middot.
 *
 * `long` switches to the fuller detail-page wording ("Saturday, May 1, 2027" vs
 * "May 1, 2027"). `time` is '' when the event says nothing about its hours.
 */
export function formatEventScheduleParts(
  event: EventSchedule,
  long = false,
): { date: string; time: string } {
  const multiDay = Boolean(event.endDate && event.endDate !== event.startDate)

  // Short month in the compact form, so single-day and multi-day cards in the same
  // grid don't spell the month two different ways.
  const date =
    multiDay ? formatDayRange(event.startDate, event.endDate!, long)
    : long ? formatWeekday(event.startDate)
    : formatShortDay(event.startDate)

  return { date, time: formatTimePart(event, multiDay) }
}

/** Single-line form used by the event cards: "Aug 1, 2026 · 10 AM – 3 PM". */
export function formatEventSchedule(event: EventSchedule, long = false): string {
  const { date, time } = formatEventScheduleParts(event, long)
  return time ? `${date} · ${time}` : date
}

/**
 * Value for `<time datetime="…">`. A bare date when there's no start time, and
 * a local date-time when there is — both valid HTML datetime values.
 */
export function toDateTimeAttr(event: EventSchedule): string {
  if (event.allDay || !event.startTime) return event.startDate
  return `${event.startDate}T${event.startTime}`
}
