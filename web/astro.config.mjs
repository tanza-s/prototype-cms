// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// `astro dev` runs in server mode, `astro build` in static mode. This is what keeps a
// newly created CMS document from 404ing until the dev server is restarted, and it
// only works because of two Astro rules that have to be read together:
//
//  1. A route with no `export const prerender` inherits `output !== 'server'`. So the
//     dynamic routes are on demand in dev (looked up live, per request, against the
//     CMS) and prerendered by the build (`getStaticPaths`, one fetch, static HTML).
//  2. `prerender` is read off the raw source with a regex that matches ONLY the
//     literals `true` and `false` (core/routing/prerender.js). `import.meta.env.PROD`
//     does not work and does not warn — it silently falls back to rule 1's default.
//
// So the dynamic routes must NOT declare `prerender`; declaring it pins them to one
// mode and brings the 404s back. The adapter is a dev-only dependency of server mode
// and is never part of a build — `astro build` still emits a plain static site to
// `dist/`, so the deploy is unchanged.
// https://astro.build/config
const isDev = process.argv.includes('dev');

export default defineConfig({
  output: isDev ? 'server' : 'static',
  ...(isDev ? { adapter: node({ mode: 'standalone' }) } : {}),
});
