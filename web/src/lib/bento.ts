// Bento layout for the events grid: tile size is derived from each event's own
// content rather than assigned.
//
// Two properties the rest of the site depends on:
//   1. Stability — variation comes from a hash of the slug, never Math.random(),
//      so identical content always produces an identical grid across rebuilds.
//   2. Order — events read in date order, top-to-bottom. `grid-auto-flow: dense`
//      would fill holes by reordering, which an events list can't afford, so sizes
//      are chosen to fit the space instead of the space being rearranged.

import type { Event } from '../types/payload'
import { todayIso } from './dates'

export type BentoSize = 'large' | 'tall' | 'wide' | 'compact'

export interface BentoItem {
  event: Event
  size: BentoSize
  past: boolean
  /** Palette custom property for the card's left accent bar. */
  accent: string
}

/** Column/row footprint of each size at the 4-column desktop breakpoint. */
export const SPAN: Record<BentoSize, { col: number; row: number }> = {
  large: { col: 2, row: 2 },
  tall: { col: 1, row: 2 },
  wide: { col: 2, row: 1 },
  compact: { col: 1, row: 1 },
}

/** The widest breakpoint's column count; the packer solves for this grid. */
const COLS = 4

/** Titles longer than this wrap to multiple lines and want vertical room. */
const LONG_TITLE = 34

/** At most one `large` tile per this many events, so the grid isn't top-heavy. */
const LARGE_EVERY = 8

/** A third identical tile in a row reads as a pattern, so cap runs at this. */
const MAX_RUN = 2

const ACCENTS = [
  '--color-teal',
  '--color-yellow',
  '--color-lime',
  '--color-pink',
  '--color-orange',
  '--color-purple',
]

/**
 * FNV-1a, 32-bit. Spreads similar slugs (`mfa-writing`, `mfa-design`) far apart,
 * which matters because neighbouring events often have near-identical titles.
 */
function hash(value: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** How much space this event has earned, from signals an editor already fills in. */
function weightFor(event: Event, rank: number, past: boolean): number {
  if (past) return 0
  if (event.bentoSize === 'feature') return 6
  if (event.bentoSize === 'standard') return 0

  let weight = 0
  if (event.image) weight += 2 // only a tall tile has room to show art
  if (event.endDate) weight += 2 // a multi-day run's "Apr 8 – May 2" needs width
  if (event.title.length > LONG_TITLE) weight += 1 // a wrapping headline needs height
  if (rank < 3) weight += 1 // the soonest events lead the page
  return weight
}

/**
 * Sizes to try, best first; the packer takes the first that fits. `compact` ends
 * every list because it fits anywhere — that's what guarantees termination.
 */
function preferencesFor(weight: number, seed: number): BentoSize[] {
  const leansWide = seed % 2 === 0
  if (weight >= 5) return ['large', 'tall', 'wide', 'compact']
  // Always offer the other orientation before giving up on a double tile: ['wide',
  // 'compact'] alone drops an event to 1x1 whenever the row has no horizontal room,
  // even when a tall tile would have fitted beside it.
  //
  // Threshold 2, not 1, so the +1 recency nudge is never enough on its own.
  if (weight >= 2) {
    return leansWide ? ['wide', 'tall', 'compact'] : ['tall', 'wide', 'compact']
  }
  return ['compact']
}

/** Occupancy map over a COLS-wide grid; rows are created on demand. */
class Occupancy {
  private rows: boolean[][] = []

  private row(r: number): boolean[] {
    while (this.rows.length <= r) this.rows.push(new Array(COLS).fill(false))
    return this.rows[r]!
  }

  /** Row-major scan for the first unfilled cell. */
  firstFree(): { r: number; c: number } {
    for (let r = 0; ; r++) {
      const row = this.row(r)
      for (let c = 0; c < COLS; c++) {
        if (!row[c]) return { r, c }
      }
    }
  }

  fits(r: number, c: number, size: BentoSize): boolean {
    const { col, row } = SPAN[size]
    if (c + col > COLS) return false
    for (let dr = 0; dr < row; dr++) {
      for (let dc = 0; dc < col; dc++) {
        if (this.row(r + dr)[c + dc]) return false
      }
    }
    return true
  }

  place(r: number, c: number, size: BentoSize): void {
    const { col, row } = SPAN[size]
    for (let dr = 0; dr < row; dr++) {
      for (let dc = 0; dc < col; dc++) {
        this.row(r + dr)[c + dc] = true
      }
    }
  }
}

/**
 * Assign a size to every event and pack them into a 4-column grid.
 *
 * Each event goes at the first free cell, taking the first size from its preference
 * list that fits. A placement never skips a cell, so no holes are created — which is
 * what lets plain (non-dense) auto-flow in CSS reproduce this layout exactly.
 *
 * In a static build "past" is frozen at build time and only moves on rebuild.
 */
export function assignBentoLayout(events: Event[], now: Date = new Date()): BentoItem[] {
  const today = todayIso(now)
  // A multi-day event is only past once its final day has been and gone; a
  // single-day event has no end date, so it falls back to its start.
  const isPast = (event: Event) => (event.endDate ?? event.startDate) < today

  const sorted = [...events].sort((a, b) => {
    // Past events sink to the end; within each group, soonest first.
    const pastDelta = Number(isPast(a)) - Number(isPast(b))
    if (pastDelta !== 0) return pastDelta
    const byDate = a.startDate.localeCompare(b.startDate)
    if (byDate !== 0) return byDate
    // Same-day events read in start-time order; all-day ones lead, since they're
    // already under way by the time a timed event starts.
    return (a.startTime ?? '').localeCompare(b.startTime ?? '')
  })

  const grid = new Occupancy()
  const items: BentoItem[] = []
  let upcoming = 0
  let larges = 0
  let run = 0

  for (const event of sorted) {
    const past = isPast(event)
    const seed = hash(event.slug)
    const weight = weightFor(event, past ? Infinity : upcoming++, past)

    let options = preferencesFor(weight, seed)

    // Ration the 2x2 tiles rather than letting the first few strong events take them all.
    if (larges >= Math.max(1, Math.ceil(items.length / LARGE_EVERY))) {
      options = options.filter((size) => size !== 'large')
    }
    // Break up a run of identical tiles, but never at the cost of dropping to nothing.
    const previous = items[items.length - 1]?.size
    if (run >= MAX_RUN && options.length > 1 && options[0] === previous) {
      options = options.slice(1)
    }

    const { r, c } = grid.firstFree()
    // `compact` is always in the list and always fits a free cell, so this resolves.
    const size = options.find((option) => grid.fits(r, c, option)) ?? 'compact'
    grid.place(r, c, size)

    if (size === 'large') larges++
    run = size === previous ? run + 1 : 1
    items.push({ event, size, past, accent: ACCENTS[seed % ACCENTS.length]! })
  }

  return items
}
