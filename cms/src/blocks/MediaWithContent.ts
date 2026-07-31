import type { Block } from 'payload'

export const MediaWithContent: Block = {
  slug: 'mediaWithContent',
  interfaceName: 'MediaWithContentBlock',
  fields: [
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'altText',
      type: 'text',
      admin: {
        description:
          'Optional. Overrides the alt text from the uploaded media. If left blank, the media’s alt text will be used.',
      },
    },
    {
      name: 'caption',
      type: 'text',
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'callToAction',
      type: 'array',
      maxRows: 3,
      fields: [
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
        },
      ],
    },
    {
      name: 'imageAlignment',
      type: 'select',
      defaultValue: 'left',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Right', value: 'right' },
      ],
      required: true,
      admin: {
        description:
          'Sets which side the image sits relative to content in desktop and tablet breakpoints.',
      },
    },
  ],
}
