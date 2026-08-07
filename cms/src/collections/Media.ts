import type { CollectionConfig } from 'payload'

/** Every size is re-encoded to webp; quality 80 is the usual visually-lossless point. */
const WEBP = { format: 'webp', options: { quality: 80 } } as const

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    /**
     * Widths taken from what the site actually renders:
     *
     * -  400  cards and the small bento tiles
     * -  768  the mobile breakpoint, and a half-width column on tablet
     * - 1200  a contained (900px) or wide (1400px) block on a retina display
     * - 1800  a full-bleed hero on a large display
     *
     * Height is omitted on purpose — supplying both makes sharp crop to fit, where
     * width alone scales and preserves the aspect ratio.
     *
     * `withoutEnlargement: true` makes an undersized image reuse the original.
     * Leaving it undefined returns null for that size, putting holes in the srcset.
     */
    imageSizes: [
      { name: 'thumbnail', width: 400, withoutEnlargement: true, formatOptions: WEBP },
      { name: 'small', width: 768, withoutEnlargement: true, formatOptions: WEBP },
      { name: 'medium', width: 1200, withoutEnlargement: true, formatOptions: WEBP },
      { name: 'large', width: 1800, withoutEnlargement: true, formatOptions: WEBP },
    ],
    // Without this the admin list view loads full-size originals as its thumbnails.
    adminThumbnail: 'thumbnail',
  },
}
