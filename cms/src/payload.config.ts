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
     * Uploads go to GCS in any environment naming a bucket, local disk otherwise.
     * The deploy target is Cloud Run, whose filesystem is ephemeral and per-instance,
     * so without this uploads vanish on redeploy and 404 across instances.
     *
     * Switching the gate does NOT change the Postgres schema, so local and Cloud SQL
     * can't drift. `alwaysInsertFields` is a no-op today but becomes the default in
     * Payload v4; setting it now means that upgrade can't quietly add a column.
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
