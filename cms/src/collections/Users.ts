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
       * Both operations are gated: `update` stops an editor granting themselves
       * admin, `create` stops them making an admin account and signing in as that.
       *
       * Deliberately not `required` — Payload's defaults are application-level and
       * never reach Postgres, so a required field with a defaultValue on a populated
       * table needs a SQL backfill (see cms/scripts/).
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
