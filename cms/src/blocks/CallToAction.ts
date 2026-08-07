import type { Block } from 'payload'

export const CallToAction: Block = {
  slug: 'callToAction',
  interfaceName: 'CallToActionBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'label',
      type: 'text',
      label: 'Link Text',
      required: true,
    },
    {
      name: 'url',
      type: 'text',
      label: 'Link URL',
      required: true,
      admin: {
        description:
          'Use https:// for external links, and relative paths for internal links (e.g., /about).',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: false,
    },
    {
      name: 'style',
      type: 'select',
      defaultValue: 'basic',
      options: [
        { label: 'Basic', value: 'basic' },
        { label: 'Featured', value: 'featured' },
        { label: 'With Image', value: 'image' },
      ],
      required: true,
    },
  ],
}
