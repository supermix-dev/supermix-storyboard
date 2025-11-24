## Supermix Storyboard

This is a Next.js 16 project for creating and managing video storyboards with Supermix.

## Prerequisites

- Node.js 20+

## Development

Run Next.js dev server:

```bash
npm run dev
```

- Marketing site: [http://localhost:3000](http://localhost:3000)

## Content Model

The project displays daily content with:

- `date` – calendar date shown to users
- `items` – array of `mediaItem` objects containing `title`, `image`, and `url`

The `Day` component renders each media card. When no data exists, the UI shows an empty state.

## Helpful Commands

| Command         | Description             |
| --------------- | ----------------------- |
| `npm run dev`   | Next.js dev server      |
| `npm run build` | Production build        |
| `npm run start` | Start production server |
| `npm run lint`  | Run ESLint              |

## AI SDK Setup (Server Action)

This project now ships with the [Vercel AI SDK](https://ai-sdk.dev/docs/introduction#ai-sdk) wired up via a Next.js server action (`app/actions/generate-text.ts`) that calls OpenAI.

1. Create a `.env.local` file with your OpenAI credentials:

   ```bash
   OPENAI_API_KEY=sk-...
   ```

2. Start the dev server (`npm run dev`) and open `http://localhost:3000`. The demo prompt UI on the main page calls the server action, which runs `generateText` with the `gpt-4o-mini` model and shows the model response plus token usage metadata.

You can also import and call `generateTextAction` from any other client component or server module for additional AI-powered flows. The helper handles model selection and enforces that a prompt is provided.

The transcript panel on the homepage includes a **Split into Storyboards** button that exercises `generateObject` via `app/actions/storyboards.ts`. It feeds the transcript to the AI SDK’s structured data helper and returns a typed array of storyboard objects (title, summary, optional timecodes, beats) for quick visualization inside the UI or for reuse elsewhere.
