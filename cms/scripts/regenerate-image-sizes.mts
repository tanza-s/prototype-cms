/**
 * Regenerate image sizes for uploads that predate the `imageSizes` config.
 *
 * Payload builds renditions during upload, so adding sizes to a collection leaves
 * every existing document with empty `sizes`. There's no built-in command for this;
 * re-saving each document with its original file re-runs the upload pipeline.
 *
 * Idempotent, and safe to re-run after changing the size list — sharp simply
 * regenerates from the original each time.
 *
 * Run with:
 *   cd cms && set -a && . ./.env && set +a && \
 *     NODE_OPTIONS="--no-deprecation --import=tsx/esm" node scripts/regenerate-image-sizes.mts
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { getPayload } from 'payload'

import config from '../src/payload.config.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const mediaDir = path.resolve(dirname, '../media')

const payload = await getPayload({ config })

const { docs } = await payload.find({ collection: 'media', limit: 1000, pagination: false })

let regenerated = 0
let skipped = 0

for (const doc of docs) {
  if (!doc.filename) {
    console.log(`SKIP  #${doc.id} — no filename on the document`)
    skipped++
    continue
  }

  const filePath = path.join(mediaDir, doc.filename)

  // A missing original is the one thing this script can't work around: the
  // renditions are derived from it, and nothing else holds a copy.
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP  #${doc.id} ${doc.filename} — file not found on disk`)
    skipped++
    continue
  }

  await payload.update({
    collection: 'media',
    id: doc.id,
    data: {},
    filePath,
    overwriteExistingFiles: true,
  })

  const after = await payload.findByID({ collection: 'media', id: doc.id })
  const sizes = Object.entries((after.sizes ?? {}) as Record<string, { width?: number | null }>)
    .filter(([, v]) => v?.width)
    .map(([k, v]) => `${k}:${v.width}w`)

  console.log(`OK    #${doc.id} ${doc.filename} → ${sizes.join(' ') || 'no sizes produced'}`)
  regenerated++
}

console.log(`\n${regenerated} regenerated, ${skipped} skipped.`)
process.exit(skipped > 0 ? 1 : 0)
