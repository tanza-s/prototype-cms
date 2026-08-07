import type { Block } from 'payload'

export const Gallery: Block = {
  slug: 'gallery',
  interfaceName: 'GalleryBlock',
  labels: {
    singular: 'Gallery',
    plural: 'Galleries',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'Optional. A title for the gallery block.',
      },
    },
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'Optional. Sits between the title and the grid.',
      },
    },
    {
      name: 'images',
      type: 'array',
      minRows: 1,
      maxRows: 30,
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
            description: 'Optional. Overrides the alt text from the uploaded image.',
          },
        },
        {
          name: 'caption',
          type: 'richText',
          admin: {
            description: 'Optional. A caption for the image.',
          },
        },
      ],
    },
    {
      name: 'columns',
      type: 'select',
      options: [
        { label: '2 Columns', value: '2' },
        { label: '3 Columns', value: '3' },
        { label: '4 Columns', value: '4' },
      ],
      defaultValue: '3',
      required: true,
      admin: {
        description: 'Select the number of columns for the gallery grid.',
      },
    },
    {
      name: 'tileShape',
      type: 'select',
      options: [
        { label: 'Landscape (4:3)', value: 'landscape' },
        { label: 'Square (1:1)', value: 'square' },
        { label: 'Portrait (3:4)', value: 'portrait' },
        { label: 'Natural (uncropped)', value: 'natural' },
      ],
      defaultValue: 'landscape',
      required: true,
      admin: {
        description:
          'Select the shape of the tiles in the gallery grid. All options except ' +
          'Natural will center-crop images to the selected aspect ratio. Natural will ' +
          'display images in their original aspect ratio, which may result in uneven rows.',
      },
    },
    {
      name: 'featureFirst',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'If checked, the first image will be featured and span multiple columns.',
      },
    },
    {
      name: 'enableSlideshow',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'If checked, clicking an image will open a slideshow modal. Uncheck for a ' +
          'static grid that is not clickable.',
      },
    },
    {
      name: 'showCaptionsInGrid',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'If checked, captions will be displayed below each image in the grid. If ' +
          'unchecked, captions will only be visible in the slideshow modal.',
      },
    },
  ],
}
