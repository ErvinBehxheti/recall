# Slidekick

Slidekick rewrites any slide deck into short pages students study at their own pace, then quizzes them and sends every wrong answer back to the page that teaches it.

## Run it

You need [Node.js](https://nodejs.org) 24 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Turn on the real AI

1. Make an account at https://console.anthropic.com and create an API key.
2. Copy `.env.example` to a new file called `.env.local`.
3. Paste your key after `ANTHROPIC_API_KEY=`.
4. Restart `npm run dev`.

Now "Upload your slides" works with any PDF or PowerPoint file (up to 20 MB and 60 slides). Google Slides decks: use File, Download, PDF.

The key stays on this laptop. It is only used by the server part of the app and never sent to the browser.

**Cost:** each lesson uses Claude Opus 5.5 and costs roughly $0.20 to $0.50 for a 20-slide deck. $5 of credit is enough for 10 to 25 lessons.

**Speed:** if generating feels slow on stage, set `LESSON_EFFORT=low` in `.env.local`. It is faster with slightly less careful writing.

## Demo mode (no internet needed)

On the home page, click "or try a sample lesson", or just press **D**. A sample lesson loads in about 5 seconds. Every error screen also has a "Try the sample lesson" button.

The two sample lessons (Photosynthesis, Causes of World War I) live in `src/demo/`. Right now they are hand-written placeholders. Once you have a key, replace them with real AI output:

```bash
npm run decks        # prints the sample decks in samples/decks to PDFs in samples/pdf
npm run make-demos   # sends those PDFs to the AI and saves the lessons in src/demo
```

## Use your own class deck as the sample

1. Save the deck as a PDF in `samples/pdf/`, for example `samples/pdf/volcanoes.pdf`.
2. Add `"volcanoes"` to the `SLUGS` list in `scripts/make-demos.mts` and run `npm run make-demos`.
3. In `src/demo/index.ts`, import `./volcanoes.json` and add it to `DEMOS`. Change `DEFAULT_DEMO_SLUG` to `"volcanoes"` if it should load when you press D.

## Rename the product

Change the name and tagline in `src/config/brand.ts`. Everything in the app reads from that file.

## Tests

```bash
npm test           # unit tests
npm run test:e2e   # clicks through the whole demo in a real browser
```

## How it fits together

- `src/app/` pages: upload (`/`), lesson overview, lesson pages, quiz, results, teacher preview, and the `/api/generate` route.
- `src/lib/` logic: lesson format and checks, PowerPoint reading, the AI call, scoring, and the sample class data.
- `src/components/` display pieces shared with the promo video.
- `docs/` the design spec, the build plan and the presentation-day checklist.
