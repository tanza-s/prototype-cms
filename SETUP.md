# 2027 CCA Commencement Site - Setup Guide

This is a prototype for the 2027 CCA Commencement site, built with **Payload CMS** (backend) and **Astro** (frontend).

## Project Structure

```
cms/                 # Payload CMS admin and API
web/                 # Astro frontend
```

## Prerequisites

- Node.js 22.12.0 or higher
- pnpm (or npm/yarn)
- PostgreSQL database (local or Docker)

## Setup Instructions

### 1. Install Dependencies

From the root directory:

```bash
pnpm install
```

### 2. Set Up the CMS Database

#### Option A: Using Docker (Recommended)

```bash
docker-compose up -d
```

This will start PostgreSQL in the background.

#### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database:
   ```bash
   createdb cca_commencement
   ```

### 3. Configure Environment Variables

#### CMS (.env in `cms/` directory)

```bash
cd cms
cp .env.example .env
```

Edit `.env` and add:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cca_commencement
PAYLOAD_SECRET=your-secret-key-here-change-this
```

#### Web (.env in `web/` directory)

```bash
cd ../web
```

The `.env` is already configured with:

```
PUBLIC_CMS_URL=http://localhost:3000
```

### 4. Start the Development Servers

#### Terminal 1: Start the CMS

```bash
cd cms
pnpm dev
```

Visit `http://localhost:3000` to:
- Create your first admin user
- Access the admin dashboard at `/admin`
- View the API at `/api/events`

#### Terminal 2: Start the Web Frontend

```bash
cd web
pnpm dev
```

Visit `http://localhost:4321` to see the homepage with events.

## Creating Events

1. Navigate to `http://localhost:3000/admin`
2. Login with your admin credentials
3. Click on **Events** in the sidebar
4. Click **Create** to add a new event
5. Fill in the required fields:
   - **Title**: Event name
   - **Description**: Rich text description
   - **Image**: Upload or select from media library
   - **Start Date & Time**: When the event begins
   - **End Date & Time**: When the event ends
   - **Location**: Event location
   - **RSVP Link** (optional): Link to RSVP
   - **Published**: Check to display on the site
6. Click **Save & Publish**

Events will appear on the homepage once published, sorted by start date.

## Project Features

- ✅ **Events Collection**: Full event management with dates, locations, and RSVPs
- ✅ **Media Library**: Upload and manage images
- ✅ **Admin Dashboard**: User-friendly CMS interface
- ✅ **REST API**: Access events via `/api/events`
- ✅ **Responsive Design**: Works on mobile, tablet, and desktop
- ✅ **Rich Text Editor**: Powerful content editing with Lexical

## Available Scripts

### CMS

```bash
cd cms
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm lint             # Run ESLint
pnpm test:int         # Run integration tests
pnpm test:e2e         # Run E2E tests
pnpm generate:types   # Generate TypeScript types
```

### Web

```bash
cd web
pnpm dev              # Start Astro dev server
pnpm build            # Build for production
pnpm preview          # Preview production build
```

## Deployment

When ready to deploy:

1. **CMS**: Deploy to Vercel, Netlify, or your hosting provider
2. **Web**: Deploy Astro to Vercel, Netlify, Cloudflare Pages, etc.

Update `PUBLIC_CMS_URL` in the web app's `.env` to point to your production CMS URL.

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env` matches your setup
- Run `docker-compose logs` if using Docker

### CMS Not Loading

- Clear `.next` cache: `rm -rf cms/.next`
- Reinstall dependencies: `cd cms && pnpm install`
- Try `pnpm devsafe` instead of `pnpm dev`

### Events Not Showing on Frontend

- Ensure events are published in the CMS
- Check browser console for API errors
- Verify `PUBLIC_CMS_URL` is correct in web `.env`

## References

- [Payload CMS Documentation](https://payloadcms.com/docs)
- [Astro Documentation](https://docs.astro.build)
- [2026 Commencement Site](https://2026.cca.edu/thesis/) (design reference)

## Next Steps

- [ ] Add event filtering/search
- [ ] Create individual event detail pages
- [ ] Add event calendar view
- [ ] Implement event registration workflow
- [ ] Add testimonials or speakers section
- [ ] SEO optimization
