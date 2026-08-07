import type { Block } from 'payload'

/**
 * Places an embed from the Embeds collection. The relationship is the access gate:
 * the chooser only offers embeds an admin already created.
 */
export const Embed: Block = {
  slug: 'embed',
  interfaceName: 'EmbedBlock',
  fields: [
    {
      name: 'embed',
      type: 'relationship',
      relationTo: 'embeds',
      required: true,
      label: 'Embed',
      admin: {
        description: 'Choose an embed. Ask an admin if the one you need isn’t listed.',
      },
    },
    {
      name: 'heading',
      type: 'text',
      label: 'Heading',
      admin: {
        description: 'Optional. Shown above the embed on this page only.',
      },
    },
  ],
}
