import type { Access, FieldAccess } from 'payload'

/**
 * Two functions for one idea: Payload types collection and field access separately,
 * and field access is boolean-only.
 *
 * Both fail closed, which makes the first admin a chicken-and-egg problem — solved
 * by scripts/seed-admin-role.sql, not by weakening the check here.
 */
function hasAdminRole(user: unknown): boolean {
  const roles = (user as { roles?: unknown } | null)?.roles
  return Array.isArray(roles) && roles.includes('admin')
}

export const isAdmin: Access = ({ req: { user } }) => hasAdminRole(user)

export const isAdminField: FieldAccess = ({ req: { user } }) => hasAdminRole(user)
