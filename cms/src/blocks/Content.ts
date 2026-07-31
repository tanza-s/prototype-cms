import type { Block } from 'payload'

export const Content: Block = {
  slug: 'content',
  interfaceName: 'ContentBlock',
  fields: [
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'style',
      type: 'select',
      defaultValue: 'narrow',
      options: [
        { label: 'Narrow', value: 'narrow' },
        { label: 'Wide', value: 'wide' },
        { label: 'Full Bleed', value: 'full' },
      ],
      required: true,
    },
  ],
}
