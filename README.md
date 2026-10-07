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

Now "Upload slides" on a class page works with any PDF or PowerPoint file (up to 20 MB and 60 slides). Google Slides decks: use File, Download, PDF.

The key stays on this laptop. It is only used by the server part of the app and never sent to the browser.

**Cost:** each lesson uses Claude Opus 5.5 and costs roughly $0.20 to $0.50 for a 20-slide deck. $5 of credit is enough for 10 to 25 lessons.

**Speed:** if generating feels slow on stage, set `LESSON_EFFORT=low` in `.env.local`. It is faster with slightly less careful writing.

## Accounts and demo data

Slidekick has two kinds of account.

- **Teachers** sign up with an email and password, create a class for one of the five subjects (Biology, Chemistry, Math, Albanian, English) and get a six character class code. They upload slides, check the AI's pages and quiz, edit anything, and publish. Their results page shows where the class got stuck.
- **Students** sign up with their first name and a password. We add a number to make a login name such as `Mira#4821`. They enter the class code, read the lesson and take the quiz. The answers never reach the browser until a student has answered that question. Only each student's first attempt counts for the teacher; retries are practice.

Everything is stored in one file, `data/slidekick.db`. Delete it to start over.

For a demo with no setup, run:

```bash
npm run seed
```

It creates a teacher (`teacher@demo.test`, password `demo-teacher-1`), an 8A Biology class with a published Photosynthesis lesson, and 12 students with realistic results (password `demo-student-1`; the script prints their login names and the class code). Log in as the teacher to see the results page, or as any student to take the quiz.

The two sample lessons in `src/demo/` are used by the seed script and the home page. Once you have an API key you can replace them with real AI output with `npm run decks` and `npm run make-demos`.

```bash
npm run decks        # prints the sample decks in samples/decks to PDFs in samples/pdf
npm run make-demos   # sends those PDFs to the AI and saves the lessons in src/demo
```

## Use your own class deck as the sample

1. Save the deck as a PDF in `samples/pdf/`, for example `samples/pdf/volcanoes.pdf`.
2. Add `"volcanoes"` to the `SLUGS` list in `scripts/make-demos.mts` and run `npm run make-demos`.
3. In `src/demo/index.ts`, import `./volcanoes.json` and add it to `DEMOS`. Change `DEFAULT_DEMO_SLUG` to `"volcanoes"` if it should be the lesson the seed script and the home page use.

## Rename the product

Change the name and tagline in `src/config/brand.ts`. Everything in the app reads from that file.

## Tests

`npm test` runs the unit tests. `npm run test:e2e` runs the browser tests; stop `npm run dev` first. They use their own database (`data/e2e.db`) and a fake AI, so they never touch your data or spend credit.

## How it fits together

- `src/app/` pages: the home page, login and sign-up, `teacher/` (classes, lesson review, results), `learn/` (subjects, lesson pages, quiz, results), and the JSON routes under `api/`.
- `src/server/` the database (`node:sqlite`) and every rule about who may see what: accounts, classes, lessons, the private quiz and the teacher results.
- `src/lib/` shared logic: lesson format and checks, PowerPoint reading, the AI call, scoring and the class report.
- `src/components/` display pieces shared with the promo video.
- `docs/` the design specs, the build plans and the presentation-day checklist.
