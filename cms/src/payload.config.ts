import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { gcsStorage } from '@payloadcms/storage-gcs'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Events } from './collections/Events'
import { Pages } from './collections/Pages'
import { Embeds } from './collections/Embeds'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Events, Pages, Embeds],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [
    /**
     * Uploads go to Google Cloud Storage in any environment that names a bucket,
     * and to local disk (cms/media/) otherwise.
     *
     * The gate matters because the deploy target is Cloud Run, whose filesystem is
     * ephemeral and per-instance: without this, uploads would disappear on every
     * redeploy, and an image uploaded to one instance would 404 on another. Every
     * block in the Pages collection depends on uploads, so that failure would be
     * obvious in production and invisible locally.
     *
     * Verified in 3.86.0 that switching the gate does NOT change the Postgres schema:
     * the media table is identical either way, so local and Cloud SQL can't drift.
     * `alwaysInsertFields` is set as forward-compatibility only — it is a no-op today
     * (when disabled, gcsStorage returns the config before the flag is ever read; when
     * enabled, the field-insertion path ignores it), but it becomes the default in
     * Payload v4, and setting it now means that upgrade can't quietly add a column.
     */
    gcsStorage({
      enabled: Boolean(process.env.GCS_BUCKET),
      alwaysInsertFields: true,
      bucket: process.env.GCS_BUCKET || '',
      collections: { media: true },
      options: {
        // Omitting `keyFilename` is deliberate: on Cloud Run the service account is
        // ambient, so Application Default Credentials pick it up with no secret to
        // manage. Set GOOGLE_APPLICATION_CREDENTIALS locally to test against a real
        // bucket.
        projectId: process.env.GCP_PROJECT_ID,
      },
    }),
  ],
})
