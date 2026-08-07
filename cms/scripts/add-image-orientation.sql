-- Adds events.image_orientation for the required `imageOrientation` select.
--
-- Why this can't be left to Payload's dev push:
--
-- Payload's `defaultValue: 'landscape'` is an APPLICATION-level default — it is
-- applied when Payload itself creates a document, and is never emitted as a
-- Postgres DEFAULT clause. `required: true`, on the other hand, does emit
-- NOT NULL. So the generated DDL is `ADD COLUMN … NOT NULL` with no default,
-- against a table that already has rows. Postgres has nothing to put in those
-- rows, so drizzle-kit stops with a data-loss warning rather than guessing.
--
-- The column is therefore added in the standard three steps: create it nullable
-- so the existing rows stay legal, backfill them with the value Payload would
-- have used, and only then apply the constraint.
--
-- Note there is deliberately NO Postgres DEFAULT at the end. That matches the
-- shape Payload's generated schema expects, so the next push is a no-op. Adding
-- the column WITH a default would work too, but push would then want to
-- DROP DEFAULT and prompt all over again.
--
-- Idempotent — safe to re-run. Run once per environment:
--   psql "$DATABASE_URL" -f cms/scripts/add-image-orientation.sql

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_events_image_orientation') THEN
    CREATE TYPE enum_events_image_orientation AS ENUM ('landscape', 'portrait');
  END IF;
END
$$;

-- 1. Nullable, so the rows that already exist don't violate anything.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS image_orientation enum_events_image_orientation;

-- 2. Backfill. 'landscape' matches the field's defaultValue in
--    cms/src/collections/Events.ts, so existing events keep their current look.
UPDATE events SET image_orientation = 'landscape' WHERE image_orientation IS NULL;

-- 3. Now that every row has a value, the constraint can be applied.
ALTER TABLE events ALTER COLUMN image_orientation SET NOT NULL;

COMMIT;
