# Quick Reference

## Start Development

```bash
# Terminal 1: CMS
cd cms && pnpm dev

# Terminal 2: Web
cd web && pnpm dev
```

Visit:
- CMS Admin: `http://localhost:3000/admin`
- Homepage: `http://localhost:4321`

## Create an Event

1. Go to `http://localhost:3000/admin`
2. Click **Events** sidebar
3. Click **Create**
4. Fill all fields and check "Published"
5. Click **Save & Publish**
6. Homepage will update automatically

## Environment Files

### `.env` (CMS)

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cca_commencement
PAYLOAD_SECRET=your-secret-key
```

### `.env` (Web)

```
PUBLIC_CMS_URL=http://localhost:3000
```

## Useful Files

| Path | Purpose |
|------|---------|
| `cms/src/payload.config.ts` | CMS configuration |
| `cms/src/collections/Events.ts` | Events schema |
| `web/src/lib/api.ts` | API fetch functions |
| `web/src/components/EventCard.astro` | Event display component |
| `web/src/pages/index.astro` | Homepage |

## Database

Start PostgreSQL with Docker:
```bash
docker-compose up -d
```

Stop it:
```bash
docker-compose down
```

## TypeScript Types

After changing the Events schema, regenerate types:
```bash
cd cms
pnpm generate:types
```

This updates `cms/src/payload-types.ts` for IDE autocomplete.
