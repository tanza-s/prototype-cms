// Anti-corruption layer for the Pages collection: turns Payload's stored block rows
// into the rendered shapes in ../types/payload.ts.
//
// Everything a component would otherwise have to think about is resolved here — rich
// text becomes HTML, uploads become absolute URLs, per-block alt overrides collapse
// into `image.alt`, and every select is narrowed to a value the stylesheets know.
//
// Keep in sync with cms/src/collections/Pages.ts and cms/src/blocks/.

import type {
  CallToActionBlock,
  CallToActionStyle,
  ContentBlock,
  ContentWidth,
  EmbedBlock,
  HeroBlock,
  HeroStyle,
  ImageBlock,
  ImageSize,
  MediaAlignment,
  MediaWithContentBlock,
  Page,
  PageBlock,
  PageLink,
} from '../types/payload'
import { fetchAll, mapImage, slugify, type MediaResponse } from './cms'
import { lexicalToHtml, lexicalToPlainText, safeHref, truncateAtWord } from './richtext'

/** Long enough to be useful in search results, short enough not to be truncated. */
const META_DESCRIPTION_MAX = 160

/** A relation as it arrives: populated at depth >= 1, a bare ID otherwise. */
type UploadResponse = MediaResponse | number | string | null | undefined

interface LinkResponse {
  label?: string | null
  url?: string | null
}

interface HeroResponse {
  blockType: 'hero'
  eyebrow?: string | null
  heading?: string | null
  intro?: unknown
  backgroundImage?: UploadResponse
  style?: string | null
}

interface ContentResponse {
  blockType: 'content'
  content?: unknown
  style?: string | null
}

interface ImageResponse {
  blockType: 'image'
  image?: UploadResponse
  altText?: string | null
  caption?: string | null
  linkUrl?: string | null
  size?: string | null
}

interface MediaWithContentResponse {
  blockType: 'mediaWithContent'
  media?: UploadResponse
  altText?: string | null
  caption?: string | null
  linkUrl?: string | null
  content?: unknown
  callToAction?: LinkResponse[] | null
  imageAlignment?: string | null
}

interface CallToActionResponse {
  blockType: 'callToAction'
  title?: string | null
  description?: string | null
  label?: string | null
  url?: string | null
  image?: UploadResponse
  style?: string | null
}

interface EmbedResponse {
  blockType: 'embed'
  /** Populated at depth >= 1; a bare ID otherwise. */
  embed?: { title?: string | null; html?: string | null } | number | string | null
  heading?: string | null
}

type BlockResponse =
  | HeroResponse
  | ContentResponse
  | ImageResponse
  | MediaWithContentResponse
  | CallToActionResponse
  | EmbedResponse

interface PageResponse {
  id: string | number
  slug?: string | null
  title: string
  meta?: {
    metaTitle?: string | null
    metaDescription?: string | null
  } | null
  layout?: BlockResponse[] | null
}

/**
 * Narrow a CMS select to a value the stylesheets actually have rules for.
 *
 * One generic rather than five near-identical mapX functions. The arrays below are
 * the single place each union's runtime values live, so an option added in the CMS
 * without matching CSS lands on the fallback instead of emitting a dead class like
 * `hero--undefined`. Same defensive intent as mapImageOrientation in ./api.ts.
 */
function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

const HERO_STYLES: readonly HeroStyle[] = ['left', 'center', 'full']
const CONTENT_WIDTHS: readonly ContentWidth[] = ['narrow', 'wide', 'full']
const IMAGE_SIZES: readonly ImageSize[] = ['contained', 'wide', 'full']
const MEDIA_ALIGNMENTS: readonly MediaAlignment[] = ['left', 'right']
const CTA_STYLES: readonly CallToActionStyle[] = ['basic', 'featured', 'image']

/**
 * Collapse absent, null, and whitespace-only strings into one representation, so a
 * component can test `caption` rather than `caption && caption.trim()`.
 */
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/**
 * Drop half-filled rows: a link with no label or no usable destination can't be
 * rendered. safeHref rejects anything that isn't http(s)/mailto/tel or a relative
 * path, so an editor can't put `javascript:` into an href — the same check the links
 * inside rich text already get.
 */
function mapLinks(links: LinkResponse[] | null | undefined): PageLink[] {
  if (!Array.isArray(links)) return []

  return links.reduce<PageLink[]>((acc, link) => {
    const label = text(link?.label)
    const url = safeHref(link?.url)
    if (label && url) acc.push({ label, url })
    return acc
  }, [])
}

/**
 * Returns null for a block that can't be rendered, and the caller drops it.
 *
 * Two cases reach that: an unrecognised `blockType` — a block added in the CMS before
 * its component exists should degrade quietly rather than throw mid-build — and an
 * image block whose upload didn't resolve, which has nothing left to show. A media
 * block that loses its image still has its copy, so that one survives.
 */
function mapBlock(block: BlockResponse): PageBlock | null {
  switch (block.blockType) {
    case 'hero': {
      const hero: HeroBlock = {
        blockType: 'hero',
        eyebrow: text(block.eyebrow),
        heading: text(block.heading) ?? '',
        intro: lexicalToHtml(block.intro),
        backgroundImage: mapImage(block.backgroundImage),
        style: oneOf(block.style, HERO_STYLES, 'left'),
      }
      return hero
    }

    case 'content': {
      const content: ContentBlock = {
        blockType: 'content',
        content: lexicalToHtml(block.content),
        style: oneOf(block.style, CONTENT_WIDTHS, 'narrow'),
      }
      return content
    }

    case 'image': {
      const image = mapImage(block.image, block.altText)
      if (!image) return null

      const imageBlock: ImageBlock = {
        blockType: 'image',
        image,
        caption: text(block.caption),
        linkUrl: safeHref(block.linkUrl),
        size: oneOf(block.size, IMAGE_SIZES, 'contained'),
      }
      return imageBlock
    }

    case 'mediaWithContent': {
      const mediaBlock: MediaWithContentBlock = {
        blockType: 'mediaWithContent',
        media: mapImage(block.media, block.altText),
        caption: text(block.caption),
        linkUrl: safeHref(block.linkUrl),
        content: lexicalToHtml(block.content),
        callToAction: mapLinks(block.callToAction),
        imageAlignment: oneOf(block.imageAlignment, MEDIA_ALIGNMENTS, 'left'),
      }
      return mediaBlock
    }

    case 'callToAction': {
      const cta: CallToActionBlock = {
        blockType: 'callToAction',
        title: text(block.title),
        description: text(block.description),
        label: text(block.label) ?? '',
        url: safeHref(block.url) ?? '',
        image: mapImage(block.image),
        style: oneOf(block.style, CTA_STYLES, 'basic'),
      }
      return cta
    }

    case 'embed': {
      // Unpopulated (a bare ID) or deleted since the page was saved. Either way
      // there's no HTML to render, so drop the block rather than emit an empty region.
      const source = block.embed
      if (!source || typeof source !== 'object') return null

      const html = text(source.html)
      if (!html) return null

      const embed: EmbedBlock = {
        blockType: 'embed',
        title: text(source.title) ?? '',
        heading: text(block.heading),
        // NOT sanitised, and deliberately so — this is the one path where CMS content
        // reaches the page verbatim. cms/src/collections/Embeds.ts restricts authoring
        // to admins to compensate.
        html,
      }
      return embed
    }

    default:
      return null
  }
}

/**
 * Fall back to the page's own copy when an editor left the meta description blank.
 *
 * Walks the layout in order and takes the first block carrying prose, so the summary
 * comes from the top of the page rather than wherever the first `content` block
 * happens to sit.
 */
function deriveDescription(layout: BlockResponse[]): string {
  for (const block of layout) {
    let flattened = ''

    switch (block.blockType) {
      case 'hero':
        flattened = lexicalToPlainText(block.intro)
        break
      case 'content':
      case 'mediaWithContent':
        flattened = lexicalToPlainText(block.content)
        break
      case 'callToAction':
        // Already plain text — it's a textarea, not rich text.
        flattened = text(block.description) ?? ''
        break
    }

    if (flattened) return truncateAtWord(flattened, META_DESCRIPTION_MAX)
  }

  return ''
}

function mapPage(page: PageResponse): Page {
  const layout = Array.isArray(page.layout) ? page.layout : []

  return {
    id: page.id,
    // The CMS hook fills this on save; the fallback only guards rows that predate it.
    slug: text(page.slug) ?? slugify(page.title),
    title: page.title,
    // Resolved here so nothing downstream branches on empty meta.
    meta: {
      title: text(page.meta?.metaTitle) ?? page.title,
      description: text(page.meta?.metaDescription) ?? deriveDescription(layout),
    },
    layout: layout.map(mapBlock).filter((block): block is PageBlock => block !== null),
  }
}

/**
 * Fetch every published page. Returns [] and logs on failure — see ./cms.ts.
 *
 * The `_status` filter is belt-and-braces: readPublishedOnly in the CMS collection is
 * the real guard, but stating it here means the query still says what it means if
 * access control is ever loosened.
 */
export async function fetchPages(): Promise<Page[]> {
  const docs = await fetchAll<PageResponse>('pages', {
    'where[_status][equals]': 'published',
    depth: '1', // populate the uploads inside blocks
    sort: 'slug',
  })

  return docs.map(mapPage)
}
