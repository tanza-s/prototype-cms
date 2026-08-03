import type { Block } from 'payload'

export const Image: Block = {
  slug: 'image',
  interfaceName: 'ImageBlock',
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'altText',
      type: 'text',
      admin: {
        description:
          'Optional. Overrides the alt text from the uploaded image. If left blank, the image’s alt text will be used.',
      },
    },
    {
      name: 'caption',
      type: 'text',
    },
    {
      name: 'linkUrl',
      type: 'text',
      label: 'Link URL',
      admin: {
        placeholder: 'https://example.com or /about',
        description:
          'Optional. Makes the image clickable. When set, the alt text becomes the link’s name, so write it to say where the link goes rather than what the picture shows.',
      },
    },
    {
      name: 'size',
      type: 'select',
      defaultValue: 'contained',
      options: [
        { label: 'Contained', value: 'contained' },
        { label: 'Wide', value: 'wide' },
        { label: 'Full Bleed', value: 'full' },
      ],
      required: true,
    },
  ],
}
