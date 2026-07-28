// Shared event date formatting.
//
// Payload stores dates as UTC ISO strings. A static build would otherwise format
// them in whatever timezone the build machine happens to run in, so pin the
// college's timezone explicitly.

const TIME_ZONE = import.meta.env.PUBLIC_EVENT_TIME_ZONE || 'America/Los_Angeles'

const dayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const shortDayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const weekdayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const timeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
})

/** Stable YYYY-MM-DD in TIME_ZONE, for same-day comparisons. */
const isoDayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function parse(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function format(formatter: Intl.DateTimeFormat, value: string): string {
  const date = parse(value)
  return date ? formatter.format(date) : ''
}

export function formatDay(value: string): string {
  return format(dayFormat, value)
}

export function formatShortDay(value: string): string {
  return format(shortDayFormat, value)
}

export function formatWeekday(value: string): string {
  return format(weekdayFormat, value)
}

export function formatTime(value: string): string {
  return format(timeFormat, value)
}

export function isSameDay(start: string, end: string): boolean {
  const a = parse(start)
  const b = parse(end)
  if (!a || !b) return false
  return isoDayFormat.format(a) === isoDayFormat.format(b)
}

/** `/events/[slug]` heading: "Saturday, May 15, 2027 · 10:00 AM – 2:00 PM" */
export function formatEventRangeLong(start: string, end: string): string {
  if (!end) return formatWeekday(start)
  if (isSameDay(start, end)) {
    return `${formatWeekday(start)} · ${formatTime(start)} – ${formatTime(end)}`
  }
  return `${formatWeekday(start)}, ${formatTime(start)} – ${formatWeekday(end)}, ${formatTime(end)}`
}

/** Card metadata: "May 15, 2027 · 10:00 AM – 2:00 PM" */
export function formatEventRangeShort(start: string, end: string): string {
  if (!end) return formatShortDay(start)
  if (isSameDay(start, end)) {
    return `${formatShortDay(start)} · ${formatTime(start)} – ${formatTime(end)}`
  }
  return `${formatShortDay(start)} – ${formatShortDay(end)}`
}

/** Machine-readable value for <time datetime="…">. */
export function toDateTimeAttr(value: string): string {
  const date = parse(value)
  return date ? date.toISOString() : ''
}
