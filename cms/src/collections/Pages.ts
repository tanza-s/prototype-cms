import type { CollectionConfig } from 'payload'
import type { Access } from 'payload'
import { CallToAction } from '../blocks/CallToAction'
import { Content } from '../blocks/Content'
import { Embed } from '../blocks/Embed'
import { Hero } from '../blocks/Hero'
import { Image } from '../blocks/Image'
import { MediaWithContent } from '../blocks/MediaWithContent'
import { slugField } from '../fields/slug'

const readPublishedOnly: Access = ({ req: { user } }) => {
  if (user) return true
  return { _status: { equals: 'published' } }
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'updatedAt'],
  },
  versions: {
    drafts: true,
    maxPerDoc: 20,
  },
  access: { read: readPublishedOnly },
  fields: [
    {
      name: 'title',
      label: 'Page Title',
      type: 'text',
      required: true,
    },
    slugField({ unique: true }),
    {
      name: 'meta',
      type: 'group',
      label: 'Meta Data',
      fields: [
        {
          name: 'metaTitle',
          type: 'text',
          label: 'Meta Title',
          admin: {
            description:
              'Optional. Overrides the page title in the browser tab and search engine results.',
          },
        },
        {
          name: 'metaDescription',
          type: 'textarea',
          label: 'Meta Description',
          admin: {
            description: 'Optional. Overrides the page description in search engine results.',
          },
        },
      ],
    },
    {
      name: 'layout',
      type: 'blocks',
      label: 'Page Content',
      minRows: 1,
      blocks: [Hero, Content, Image, MediaWithContent, CallToAction, Embed],
      admin: {
        initCollapsed: true, // a long page is unnavigable with every block expanded
        description: 'Add, reorder, and remove blocks to compose the page.',
      },
    },
  ],
}
