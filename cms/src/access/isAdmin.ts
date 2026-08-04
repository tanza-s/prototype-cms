import type { Access, FieldAccess } from 'payload'

/**
 * Two functions for one idea, because Payload types collection access and field
 * access separately — and field access is boolean-only, so it can't return the
 * `Where` constraint that collection access can.
 *
 * Both fail closed: a user with no roles is not an admin. That's what makes the
 * first admin a chicken-and-egg problem, solved once by scripts/seed-admin-role.sql
 * rather than by weakening the check here.
 */
function hasAdminRole(user: unknown): boolean {
  const roles = (user as { roles?: unknown } | null)?.roles
  return Array.isArray(roles) && roles.includes('admin')
}

export const isAdmin: Access = ({ req: { user } }) => hasAdminRole(user)

export const isAdminField: FieldAccess = ({ req: { user } }) => hasAdminRole(user)
