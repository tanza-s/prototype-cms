import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'

/**
 * Reusable third-party embeds — mailing list signups, forms, players.
 *
 * The one place in the CMS holding HTML that reaches a visitor unescaped:
 *
 * - Astro renders these with set:html at BUILD time, so a <script> here lands in the
 *   static HTML and executes on page load. That is the point, and also the risk.
 * - Authoring is admin-only; editors place embeds through the Embed block's chooser.
 * - That limits who can cause a problem, not the damage if one occurs. Treat adding
 *   an embed as a deploy, not as content editing.
 */
export const Embeds: CollectionConfig = {
  slug: 'embeds',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'description', 'updatedAt'],
    description: 'Raw HTML from a third party. Only admins can create or edit these.',
  },
  access: {
    /**
     * Public, and it must stay that way: the Astro build fetches anonymously, and
     * Payload OMITS documents and fields denied at read rather than erroring. Locking
     * this down would silently render empty embeds on the live site.
     */
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Title',
      admin: {
        description: 'What editors will see in the chooser. Name it for where it goes.',
      },
    },
    {
      name: 'description',
      type: 'text',
      label: 'Description',
      admin: {
        description: 'Optional note for editors — what this is, and where it belongs.',
      },
    },
    {
      name: 'html',
      type: 'code',
      required: true,
      label: 'Embed HTML',
      admin: {
        language: 'html',
        description:
          'Paste the provider’s embed code. This runs on the live site exactly as written, including any <script> tags — check the source before saving.',
      },
    },
  ],
}
