-- Backfill for the events date/time split.
--
-- Before this change, start_date and end_date were `dayAndTime` instants that
-- bundled a calendar day and a clock time together. They are now day-only
-- fields, with the clock time living in the new start_time / end_time columns.
--
-- The conversion CANNOT be done by truncating the timestamp. Game Arts' end was
-- stored 2026-08-17T03:00:00Z, which is August *16* in Pacific time — a naive
-- truncation would silently move the event a day later. Every day value here is
-- therefore resolved through America/Los_Angeles first.
--
-- The clock times need no conversion at all: the original instants already read
-- back as the editor's intended wall-clock time when formatted in the site
-- timezone, which is exactly what web/src/lib/dates.ts does.
--
-- Idempotent: the WHERE clause skips rows already carrying a time, so re-running
-- is safe. Run once against each environment:
--   psql "$DATABASE_URL" -f cms/scripts/split-event-datetimes.sql

BEGIN;

UPDATE events
SET
  -- Preserve the original instants as the time-of-day values.
  start_time = start_date,
  end_time = end_date,

  -- Re-anchor the day fields to UTC midnight of the Pacific calendar day.
  start_date = ((start_date AT TIME ZONE 'America/Los_Angeles')::date)::timestamp
    AT TIME ZONE 'UTC',

  -- A single-day event is represented by a null end date, so the front end has
  -- one representation of "single day" rather than two.
  end_date = CASE
    WHEN end_date IS NULL THEN NULL
    WHEN (end_date AT TIME ZONE 'America/Los_Angeles')::date
       = (start_date AT TIME ZONE 'America/Los_Angeles')::date THEN NULL
    ELSE ((end_date AT TIME ZONE 'America/Los_Angeles')::date)::timestamp
      AT TIME ZONE 'UTC'
  END
WHERE start_time IS NULL
  AND end_time IS NULL;

COMMIT;
