-- Grant the 'admin' role to users who predate the roles field.
--
-- Users.roles is a hasMany select, which Postgres stores as a side table
-- (users_roles), not a column on users. Accounts created before the field existed
-- therefore have no rows there at all — and isAdmin fails closed, treating "no roles"
-- as least privilege. That is correct behaviour, but it means nobody can grant the
-- first admin through the admin panel: editing the roles field requires already
-- being an admin. This script breaks that cycle, once.
--
-- Payload's `defaultValue: ['editor']` does not help here. Defaults are applied by
-- the application when a document is created, so they never become a Postgres DEFAULT
-- and never backfill existing rows. Same reasoning as add-image-orientation.sql.
--
-- Idempotent: re-running adds nothing, because of the NOT EXISTS guard.
--
-- Run with:
--   psql "$DATABASE_URL" -f cms/scripts/seed-admin-role.sql

INSERT INTO users_roles ("order", parent_id, value)
SELECT 1, u.id, 'admin'::enum_users_roles
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM users_roles r WHERE r.parent_id = u.id
);

-- Confirm the result.
SELECT u.id, u.email, r.value AS role
FROM users u
LEFT JOIN users_roles r ON r.parent_id = u.id
ORDER BY u.id;
