// Minimal Lexical -> HTML converter for the Payload richText fields this site reads.
//
// The frontend talks to Payload over REST, so we deliberately avoid depending on
// @payloadcms/richtext-lexical here (it drags the Payload server runtime into the
// Astro build). If the editor grows custom blocks, add cases to renderNode.

/** Lexical text format bitmask. */
const FORMAT = {
  bold: 1,
  italic: 2,
  strikethrough: 4,
  underline: 8,
  code: 16,
  subscript: 32,
  superscript: 64,
} as const

/** Tags applied to a text node, innermost first. */
const FORMAT_TAGS: Array<[number, string]> = [
  [FORMAT.code, 'code'],
  [FORMAT.subscript, 'sub'],
  [FORMAT.superscript, 'sup'],
  [FORMAT.underline, 'u'],
  [FORMAT.strikethrough, 's'],
  [FORMAT.italic, 'em'],
  [FORMAT.bold, 'strong'],
]

const ALIGNMENTS = new Set(['center', 'right', 'justify'])

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Only allow schemes that are safe to put in an href, so CMS content can't
 * smuggle in `javascript:` or a data URL.
 */
function safeHref(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed
  // Relative links and fragments are fine.
  if (/^[/#?]/.test(trimmed)) return trimmed
  return null
}

/** `format` on an element node carries text alignment. */
function alignStyle(node: any): string {
  const format = node?.format
  return typeof format === 'string' && ALIGNMENTS.has(format)
    ? ` style="text-align:${format}"`
    : ''
}

function renderChildren(node: any): string {
  if (!Array.isArray(node?.children)) return ''
  return node.children.map(renderNode).join('')
}

function renderTextNode(node: any): string {
  let html = escapeHtml(typeof node.text === 'string' ? node.text : '')
  const format = typeof node.format === 'number' ? node.format : 0
  for (const [flag, tag] of FORMAT_TAGS) {
    if (format & flag) html = `<${tag}>${html}</${tag}>`
  }
  return html
}

function renderNode(node: any): string {
  if (!node || typeof node !== 'object') return ''

  switch (node.type) {
    case 'text':
      return renderTextNode(node)

    case 'linebreak':
      return '<br />'

    case 'paragraph': {
      const inner = renderChildren(node)
      // Lexical emits an empty paragraph for a blank line; don't render <p></p>.
      return inner ? `<p${alignStyle(node)}>${inner}</p>` : ''
    }

    case 'heading': {
      const tag = /^h[1-6]$/.test(node.tag) ? node.tag : 'h2'
      return `<${tag}${alignStyle(node)}>${renderChildren(node)}</${tag}>`
    }

    case 'quote':
      return `<blockquote${alignStyle(node)}>${renderChildren(node)}</blockquote>`

    case 'list': {
      const tag = node.listType === 'number' ? 'ol' : 'ul'
      const cls = node.listType === 'check' ? ' class="checklist"' : ''
      return `<${tag}${cls}>${renderChildren(node)}</${tag}>`
    }

    case 'listitem': {
      // A nested list arrives as a listitem whose only child is a list.
      if (node.checked !== undefined) {
        const checked = node.checked ? ' checked' : ''
        return `<li><input type="checkbox" disabled${checked} /> ${renderChildren(node)}</li>`
      }
      return `<li>${renderChildren(node)}</li>`
    }

    case 'link':
    case 'autolink': {
      const fields = node.fields ?? {}
      const href = safeHref(fields.url ?? node.url)
      const inner = renderChildren(node)
      if (!href) return inner
      const target = fields.newTab
        ? ' target="_blank" rel="noopener noreferrer"'
        : ''
      return `<a href="${escapeHtml(href)}"${target}>${inner}</a>`
    }

    case 'horizontalrule':
      return '<hr />'

    case 'root':
      return renderChildren(node)

    default:
      // Unknown node: keep whatever text it wraps rather than dropping content.
      return renderChildren(node)
  }
}

/**
 * Convert a Payload lexical richText value to an HTML string.
 * Accepts an already-plain string for convenience.
 */
export function lexicalToHtml(richText: unknown): string {
  if (!richText) return ''
  if (typeof richText === 'string') return richText

  const root = (richText as any).root
  if (!root) return ''
  return renderNode(root)
}

/** Block-level nodes need whitespace after them so their text doesn't run together. */
const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'quote',
  'list',
  'listitem',
  'horizontalrule',
])

/** Plain-text flattening, for meta descriptions and card excerpts. */
export function lexicalToPlainText(richText: unknown): string {
  if (!richText) return ''
  if (typeof richText === 'string') return richText

  const walk = (node: any): string => {
    if (!node || typeof node !== 'object') return ''
    if (node.type === 'text') return typeof node.text === 'string' ? node.text : ''
    if (node.type === 'linebreak') return ' '
    if (!Array.isArray(node.children)) return ''
    const inner = node.children.map(walk).join('')
    return BLOCK_TYPES.has(node.type) ? `${inner} ` : inner
  }

  // Collapse the block separators added above into single spaces.
  return walk((richText as any).root).replace(/\s+/g, ' ').trim()
}

/**
 * Truncate to a max length on a word boundary, adding an ellipsis.
 * Used for meta descriptions, where mid-word cuts read badly.
 */
export function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const clipped = text.slice(0, maxLength - 1)
  const lastSpace = clipped.lastIndexOf(' ')
  return `${(lastSpace > maxLength * 0.5 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`
}
