import type { CollectionConfig } from 'payload'

import { isAdminField } from '../access/isAdmin'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'roles'],
  },
  auth: true,
  fields: [
    // Email added by default
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      label: 'Roles',
      defaultValue: ['editor'],
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      /**
       * Both operations are gated, and both matter.
       *
       * `update` stops an editor granting themselves admin from their own profile.
       * `create` closes the same escalation by the back door — Payload lets any
       * authenticated user create a user by default, so without it an editor could
       * make an admin account and sign in as that instead.
       *
       * Deliberately not `required`: a required field with a defaultValue on a
       * populated table is the case that forced scripts/add-image-orientation.sql,
       * since Payload's defaults are application-level and never reach Postgres.
       */
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      admin: {
        description:
          'Admins can create and edit embeds, which hold raw HTML. Editors can place an existing embed on a page but not author a new one.',
      },
    },
  ],
}
