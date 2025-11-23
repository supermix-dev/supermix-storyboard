## What Founders Think

This is a Next.js 16 project that now pulls its daily recommendations from Sanity Studio. Editors can curate the latest “Day” document inside Studio, while the marketing site statically renders the freshest data with incremental revalidation.

## Prerequisites

- Node.js 20+
- A Sanity project & dataset (create one at [sanity.io/manage](https://www.sanity.io/manage))
- `sanity` CLI installed globally (`npm install -g sanity`) or run via `npx sanity <command>`

## Environment Variables

Create a `.env.local` file with the following keys:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=your_sanity_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-01-01
```

> These are required for both the marketing site and Sanity Studio to boot. The values are safe to expose in the browser because Studio needs them client-side.

## Development

Run Next.js (marketing site + embedded Studio route):

```bash
npm run dev
```

- Marketing site: [http://localhost:3000](http://localhost:3000)
- Sanity Studio (embedded): [http://localhost:3000/studio](http://localhost:3000/studio)

If you prefer the standalone Studio dev server, you can also run `npx sanity dev` after the env vars are configured.

## Content Model

Sanity stores a `day` document with:

- `date` – calendar date shown to users
- `items` – array of `mediaItem` objects containing `title`, `image` (uploaded thumbnail + required alt text), and `url`

`app/day.tsx` fetches the most recent `day` and renders each media card. The same data also powers a sidebar quick-list so founders can skim all links at a glance. When no documents exist yet, the UI shows a helpful empty state.

> Tip: in Studio you can drag in the YouTube/Vimeo thumbnail or upload a custom image for each media item. Alt text is required so the marketing page remains accessible.

## Deployment Notes

- Ensure the Sanity env vars are also configured in your hosting provider (e.g., Vercel project settings).
- Sanity reads are cached for 30 minutes. Publish a new `day` in Studio to trigger the next ISR revalidation, or re-deploy to force immediate refresh.

## Helpful Commands

| Command         | Description                           |
| --------------- | ------------------------------------- |
| `npm run dev`   | Next.js dev server (site + `/studio`) |
| `npm run build` | Production build                      |
| `npm run start` | Start production server               |
| `npm run lint`  | Run ESLint                            |
