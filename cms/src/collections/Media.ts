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
     * Widths taken from what the site actually renders, not round numbers:
     *
     * -  400  cards and the small bento tiles
     * -  768  the mobile breakpoint, and a half-width column on tablet
     * - 1200  a contained (900px) or wide (1400px) block on a retina display
     * - 1800  a full-bleed hero on a large display
     *
     * Height is deliberately omitted. Supplying both dimensions makes sharp crop to
     * fit; width alone scales and preserves the aspect ratio, which is what all of
     * these placements want.
     *
     * `withoutEnlargement: true` makes an image smaller than the target reuse the
     * original instead of being upscaled. Leaving it undefined — the default —
     * returns null for that size instead, which would put holes in the srcset.
     *
     * Everything is re-encoded to webp because the source material is mixed: the
     * uploads on disk today range from an 8KB webp to a 6.9MB jpeg, and that jpeg is
     * currently served at full size to every visitor.
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
