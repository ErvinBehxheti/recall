# Slidekick: Design Spec

- **Date:** 2026-10-04
- **Status:** Design approved section by section in brainstorming; spec written for review
- **Working name:** Slidekick (one config value, renameable at any time)

---

## 1. Goal and context

A 14-year-old student's idea, presented by two students at a competition, in English.

**The product:** a teacher uploads lesson slides. AI turns them into a short, self-paced lesson made of pages (one idea per page), then a quiz. Every wrong answer links back to the exact page that teaches it.

**Deliverables**
1. A working MVP web app that runs on the presenting laptop.
2. A ~70 second promo video with motion graphics that shows the real product.
3. Two stage screens (opening and closing stills), a pitch script outline, a README and a presentation-day checklist.

**The pitch slot:** 4 minutes maximum. Target 3:00 to 3:15 total: ~50s live talk, ~70s video, ~60s live talk, plus buffer.

**Success criteria**
- A judge understands what it does within ~20 seconds of the video starting.
- The video shows the real product, not mockups.
- The live app works with real AI, and falls back to demo mode instantly if the venue internet fails.
- Nothing in the app, video or pitch reads as AI-generated "slop" (see section 9).

## 2. Scope

**In scope**
- Upload PDF or PPTX, generate a lesson with real AI, study it page by page, take the quiz, see results, review missed pages, retry missed questions.
- Demo mode with pre-generated sample lessons.
- A teacher dashboard preview driven by seeded sample class data, clearly labeled as a preview.
- Read-aloud using the browser's built-in speech.
- A Remotion promo video and stage screens built from the app's own components.

**Out of scope (v2 if they win)**
- Accounts, saving lessons, multiple real students, class codes and QR joining, editing generated pages, languages other than English, deployment to the internet.

## 3. User flow

All in one browser window. Routes use normal browser history so Back works as expected.

| # | Route | Screen | Details |
|---|---|---|---|
| 1 | `/` | **Upload** | Hero copy (section 10), one primary button "Upload your slides" plus drag-and-drop over the whole hero, a text link "or try a sample lesson". Doubt-reducers under the button. Hidden key `D` loads the default sample lesson instantly. |
| 2 | `/` (generating state) | **Generating** | Skeleton placeholders of the lesson (title bar, page rows) fill in while status lines advance: "Reading 18 slides", "Finding the key ideas", "Writing your quiz". Real AI: as long as the call takes (typically 20 to 60s, hard timeout 120s). Demo mode: a scripted 5s version. |
| 3 | `/lesson` | **Lesson overview** | Lesson title, a stats line "≈ 12 min · 8 pages · 6 questions", the list of page titles as a numbered path, button "Start lesson". |
| 4 | `/lesson/[n]` | **Lesson page** | One concept per screen, typeset like a book page (section 9). Next/back buttons, arrow keys and swipe. Read-aloud button. Progress bar at the top. After the last page: a "Quiz unlocked" screen with button "Start quiz". |
| 5 | `/quiz` | **Quiz** | One multiple-choice question at a time, 4 options, keys 1 to 4. On answer: correct turns green, a wrong pick turns brick red and the correct one green, a one-line explanation appears, button "Next question". |
| 6 | `/results` | **Results** | Score counts up (e.g. 5/6), one-sentence verdict. List of missed questions, each with "Review this page" which opens that lesson page in review mode with a "Back to results" button. Button "Retry missed questions" (quiz restricted to missed ones). Link "Teacher view". |
| 7 | `/teacher` | **Teacher dashboard (preview)** | Badge "Preview · sample class data". One data-written insight sentence first, then topic mastery bars, then "Students who need help". Built from the current lesson's real pages plus a seeded fake class. |

**Reading-time estimate** is computed by the app, not the AI: `ceil(totalLessonWords / 120 + questionCount * 0.5)` minutes. 120 words per minute is a deliberate study pace for a 14-year-old.

## 4. Architecture

One Next.js project (App Router, TypeScript) with a `remotion/` folder inside it. The video imports the app's components directly.

```
Browser                               Server (Next.js route handler)     Claude API
upload PDF/PPTX ──► POST /api/generate ──► PDF  → base64 document block
                                           PPTX → slide + notes text (JSZip)
                                           ──► structured-output request ──► lesson JSON
               ◄── validated Lesson     ◄── zod validation, 1 retry if invalid
Lesson in React context + sessionStorage ─► pages ─► quiz ─► results ─► teacher preview
```

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS v4 + Motion (`motion/react`) for app animation; Remotion v4 for video; Vitest for unit tests; Playwright for one end-to-end test; `@anthropic-ai/sdk` + `zod` for AI; `jszip` for PPTX; `pdf-lib` to count PDF pages.

**Commands:** `npm run dev` (app), `npm run video` (Remotion Studio), `npm run render` (promo MP4), `npm run render:stills` (stage screens), `npm test`, `npm run test:e2e`, `npm run make-demos` (regenerate sample lessons with the real AI).

**Directory layout**
```
src/
  app/                    routes: page.tsx (upload), lesson/, lesson/[n]/, quiz/, results/, teacher/, api/generate/route.ts
  components/             PURE display components shared with the video (no fetching, no timers, no app state)
  app-components/         app-only wrappers: animation, keyboard, routing, state
  lib/
    lesson-schema.ts      zod schema + types (single source of truth)
    generate-lesson.ts    prompt, Claude call, validation, retry
    extract-pptx.ts       PPTX → per-slide text
    sample-class.ts       seeded fake class results from a Lesson
    scoring.ts            quiz scoring, missed questions, card lookup
    estimate.ts           reading-time estimate
    lesson-store.tsx      React context + sessionStorage persistence
    speech.ts             read-aloud wrapper around speechSynthesis
  config/brand.ts         product name, tagline (rename here)
  demo/                   sample lesson JSON files + slide thumbnail PNGs
remotion/
  Root.tsx                compositions: Promo, StageOpen, StageClose
  scenes/                 one file per storyboard beat
  timing.ts               all beat start frames and durations in one place
samples/decks/            source sample decks (HTML) → built to PDF + PNG thumbnails
docs/                     this spec, plan, pitch script, presentation-day checklist
```

**Shared component rule.** Components in `src/components/` take everything as props, including animation progress where needed (e.g. `highlightProgress: number` from 0 to 1). The app drives those props with Motion; the video drives them with Remotion's `useCurrentFrame()`, `interpolate()` and `spring()`. Fonts come from CSS variables (`--font-serif`, `--font-sans`) set by `next/font` in the app and `@remotion/google-fonts` in the video. Tailwind runs in both (Remotion via `@remotion/tailwind-v4`).

## 5. Lesson data model

`src/lib/lesson-schema.ts`, zod, single source of truth:

```ts
Lesson {
  title: string                 // e.g. "Photosynthesis"
  subject: string               // e.g. "Biology"
  cards: Card[]                 // 4 to 15; the AI decides based on content
  quiz: Question[]              // 5 to 10; the AI decides based on lesson size
}
Card {
  id: string                    // "c1", "c2", ... unique
  title: string                 // short, max ~8 words
  explanation: string           // 2 to 4 plain sentences
  keyPoints: string[]           // 2 to 4 short points
  rememberThis: string          // one sentence, gets the highlighter swipe
}
Question {
  id: string                    // "q1", ...
  question: string
  options: [string, string, string, string]
  correctIndex: 0 | 1 | 2 | 3
  explanation: string           // one line: why the right answer is right
  cardId: string                // MUST match a Card.id; powers "Review this page"
}
```

Validation beyond the schema (`validateLesson`): card and question counts within range, ids unique, every `cardId` exists, options are distinct, no em dashes (replaced with a comma or colon by a sanitizer before validation), no emojis (stripped). Counts are enforced in code and prompt, not in the JSON schema, to keep the structured-output schema simple.

## 6. AI generation

- **Model:** `claude-opus-5-5`. Effort `medium` (the model default), configurable via `LESSON_EFFORT` env var so it can be dropped to `low` if generation is too slow on stage. Thinking is always on for this model; the param is omitted.
- **Output:** structured output (`output_config.format` with a JSON schema generated from the zod schema), then `validateLesson`. On invalid output or `stop_reason: "max_tokens"`, retry once; then fail with a friendly error.
- **Refusals:** server-side fallback enabled (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). If the final `stop_reason` is still `"refusal"`, return the `refused` error.
- **Input:** PDF sent as a base64 `document` block before the instruction text. PPTX: extract text per slide (`<a:t>` runs from `ppt/slides/slideN.xml`, ordered by N) plus speaker notes (`ppt/notesSlides`), sent as text labeled "Slide 1:", "Slide 2:" and so on.
- **Limits:** max file size 20 MB; max 60 slides/pages (PDF pages counted with `pdf-lib`, PPTX by slide files). PPTX with no extractable text returns `empty`.
- **Timeout:** one 120s deadline for the whole request, shared by the first attempt and the retry (the retry only starts if at least 45s remain). Enforced with `AbortController`. SDK `maxRetries` stays at 2 for 429/5xx/connection errors inside that deadline.
- **Key:** `ANTHROPIC_API_KEY` in `.env.local`, read only on the server. If missing, `/api/generate` returns `no_key` immediately.
- **Prompt rules** (system prompt):
  - Audience: students around 14 years old. Plain words, short sentences.
  - Cover every important idea in the slides; do not invent facts not supported by the slides.
  - One idea per card. Order cards so each builds on the previous.
  - Choose card count (4 to 15) and question count (5 to 10) to fit the amount of content.
  - Every question tests one card and names it in `cardId`. Wrong options must be plausible, not silly.
  - Banned writing patterns: em dashes, emojis, "it's not X, it's Y" constructions, filler intros like "In this lesson we will".
- **Cost:** roughly $0.20 to $0.50 per lesson for a ~20-slide PDF at Opus 5.5 rates ($4 / $20 per million input/output tokens). Measured during the first real runs and noted in the README.

**API contract:** `POST /api/generate`, `multipart/form-data` with field `file`. Success: `200 { lesson: Lesson, slideCount: number }`. Failure: `4xx/5xx { error: { code, message } }` with `code` one of `no_key | bad_type | too_big | too_many_slides | empty | timeout | ai_unavailable | invalid_output | refused`.

## 7. Demo mode and sample lessons

- Two sample decks authored as HTML slides in `samples/decks/` (Photosynthesis; Causes of World War I), built by `scripts/build-sample-decks` into a PDF (real AI input) and PNG thumbnails (used in the generating screen and the video).
- `npm run make-demos` sends each sample PDF through the real generator and saves `src/demo/<slug>.json`.
- **Until an API key is available**, `src/demo/*.json` holds hand-authored lessons that follow the same schema and rules, marked `"source": "placeholder"`. They are replaced by real AI output with `npm run make-demos` once the key is set. The video and pitch use the real AI versions.
- Demo mode entry points: "or try a sample lesson" link (opens a small chooser between the two samples), and the `D` key (default sample: Photosynthesis). Every error state offers "Try the sample lesson".
- If the students bring a real deck from their own class (with the teacher's OK), it becomes the default sample and the video lesson.

## 8. Teacher dashboard preview

`sample-class.ts` builds results deterministically from a Lesson:
- Seed = hash of the lesson title plus card ids, so the same lesson always yields the same dashboard (live demo and video match).
- 26 students with first names from a fixed diverse list.
- Each student has a per-card mastery from a seeded RNG, with one "weak" card (a seeded pick among cards 2 to n, never the first) pulled down so the insight is meaningful. The video's wrong answer is chosen from a question on this same card, so the twist and the teacher insight point at the same page.
- Output: class average, per-card mastery percent, the weakest card, and the 3 to 5 students with the lowest averages.

Screen content, in order:
1. Insight sentence written from data: "**{count} of {classSize} students struggled with {weak card title}.**" followed by the action "Re-teach page {n}." A student "struggled" when their mastery of that card is below 60%. Variant when the weakest card averages 60% or more: "The class is solid on every topic. Lowest: {title} at {p}%."
2. Topic mastery: one row per card: page number, title, bar, percent. 3 to 4 columns, no table borders.
3. Students who need help: name, average, weakest topic.
4. Badge "Preview · sample class data" next to the page title.

## 9. Visual design system

Direction: **the study desk**. Paper, ink and one highlighter. Calm, typographic, human.

**Tokens**
| Token | Value | Use |
|---|---|---|
| `paper` | `#F6F1E7` | page background (never pure white) |
| `paper-raised` | `#EFE8DA` | raised surfaces (instead of shadows) |
| `ink` | `#1B2233` | text, primary button |
| `ink-soft` | `#4A5163` | secondary text |
| `rule` | `#D9D0BF` | the rare meaningful divider |
| `highlight` | `#F2D04B` | highlighter swipe, focus, the one accent |
| `right` | `#2F7D5B` | correct answer |
| `wrong` | `#B4443A` | wrong answer |

**Type:** Literata (headings, lesson text) and Atkinson Hyperlegible (UI, buttons, labels). Large page numbers set in Literata.

**Shape:** corner radius 2 to 4px; no drop shadows; no glass; depth from tone. Borders only where they carry meaning.

**Icons:** a small custom inline-SVG set drawn for this project (speaker, next, back, close). Words everywhere else.

**Signature graphic: the highlighter swipe.** An SVG marker stroke with slightly uneven edges, drawn left to right behind a phrase (`highlightProgress` 0 to 1). Used on "Remember this" lines, the logo, and every video beat.

**Lesson page layout:** big page number ("03") top left, title in Literata, explanation, key points as a plain numbered or dashed list, then the "Remember this" line with the swipe. No box around the page; the page is the screen.

**Motion:** app transitions are short fades and slides (~200ms, ease-out). Hover is an instant color change. Nothing bounces, spins, scales on hover or lifts. Respect `prefers-reduced-motion` (swipe appears fully drawn, no slides). The video carries the energy through pacing and kinetic type in the same palette.

**Banned (from the user's anti-AI-slop rules):** harsh gradients, Lucide or stock icon sets, pure white, rainbow, neon or basic pastels, purple and black, drop shadows, glassmorphism, radial orbs, dot grids, sparkle icons, emojis, bento grids, terminal-window graphics, three feature cards in a row, colored left-stripe callouts, checkmark bullets, soft large radii, animated arrows, hover animations, Inter/Geist/Space Grotesk, em dashes in copy, "it's not X, it's Y", fake testimonials or statistics, filler sub-headings, top-level tabs for 2 to 3 options, tables wider than 5 columns, spinners where a skeleton fits.

**Accessibility:** text contrast at least 4.5:1, visible focus (highlight-colored outline), all actions keyboard-reachable, read-aloud available on every page.

## 10. Copy

**Upload screen**
- Headline: **Turn tonight's slides into a lesson your class actually remembers.**
- Sub-headline: Slidekick rewrites any deck into short pages students study at their own pace, then quizzes them and sends every wrong answer back to the page that teaches it.
- Primary button: Upload your slides
- Secondary link: or try a sample lesson
- Doubt-reducers: PDF or PowerPoint · Ready in under a minute · We don't keep your slides

**Error messages** (each with a "Try the sample lesson" button)
| Code | Message |
|---|---|
| `no_key` | The AI isn't set up on this laptop yet. |
| `bad_type` | That file type won't work. Use a PDF or PowerPoint file. |
| `too_big` | That file is over 20 MB. Try exporting it as a PDF. |
| `too_many_slides` | That deck has more than 60 slides. Try splitting it into two lessons. |
| `empty` | We couldn't find any text in those slides. Try the PDF version. |
| `timeout` | The AI took too long. Check the internet and try again. |
| `ai_unavailable` | We couldn't reach the AI. Check the internet and try again. |
| `invalid_output` | The AI's lesson came back incomplete. Try again. |
| `refused` | The AI couldn't make a lesson from this file. |

## 11. Promo video

> Superseded for v2: the video is now 75 seconds and follows `2026-10-07-slidekick-promo-video-design.md`. The table below is the original v1 storyboard, kept for reference.

- 1920×1080, 30fps, ~70s (2100 frames). Music plus on-screen text, no voiceover. Works with the sound off. Minimum on-screen text size 56px.
- Product shots are the real `src/components/` rendering a real lesson (the default sample).
- Music: a royalty-free track the user supplies at `public/music/promo.mp3` (YouTube Audio Library or Pixabay Music). If absent, the video renders silent. Beat timings live in `remotion/timing.ts` so cuts can be aligned to the track.

| Time | Beat | On screen |
|---|---|---|
| 0:00–0:06 | Problem | Ink on paper: "40 slides." "Test on Friday." "Where do you even start?" Slide thumbnails pile up until the frame is full. |
| 0:06–0:10 | Reveal | A highlighter swipe across the pile reveals the Slidekick wordmark. "Slides in. Lesson out." |
| 0:10–0:18 | Upload | A PDF drops onto the upload screen. Skeletons fill in; status lines tick. |
| 0:18–0:24 | Lesson ready | "≈ 12 min · 8 pages · 6 questions" counts in; the page path draws. |
| 0:24–0:36 | Learn | Three pages turn; the swipe draws each "Remember this". Captions: "One idea per page." "At your own pace." |
| 0:36–0:48 | The twist (slowest beat) | A question, a wrong answer in brick red, "Review this page", fly back to page 3. Caption: "Wrong answer? Straight back to the page that teaches it." |
| 0:48–0:53 | Results | Score counts up to 5/6. |
| 0:53–1:03 | Teacher view | The insight sentence types out; mastery bars grow; "Preview" badge visible. |
| 1:03–1:10 | Close | "Any slides. Any subject." Wordmark with swipe. "Made by {names}, age 14." Holds. |

**Stage screens** (`StageOpen`, `StageClose`, PNG stills at 1920×1080): opening = wordmark plus the hook line; closing = the video's end card. Used as: opening screen, video, closing screen in whatever slide software the venue uses.

**Rendering:** `npm run render` writes `out/slidekick-promo.mp4`; `npm run render:stills` writes `out/stage-open.png` and `out/stage-close.png`.

## 12. Pitch outline

| Time | Speaker | Content |
|---|---|---|
| 0:00–0:25 | A | A specific scene: "It's Thursday night. Test tomorrow. Our teacher posted 40 slides..." Agitate: slides are made for teaching, not for studying. |
| 0:25–0:50 | B | The solution in one breath, then "Let us show you." |
| 0:50–2:00 | — | Video |
| 2:00–2:30 | A | "Everything you just saw is real and running today." Real proof from classmate testing. |
| 2:30–3:00 | B | What's next (teacher dashboard, class codes on phones). Close: "Slides in. Lesson out." |
| 3:00–3:15 | | Buffer. One sentence in part two is marked "cut if we're behind". |

**Real proof only:** before the competition the students test it with 10+ classmates on a real deck and record the quiz average and one named quote (with permission). No invented statistics anywhere. A draft lives in `docs/pitch-script.md` for the students to rewrite in their own words.

## 13. Error handling

- Client validates type and size before upload; server re-validates everything.
- Every failure returns a typed `code` (section 6) and the UI maps it to the copy in section 10, always offering "Try the sample lesson".
- A broken or missing sessionStorage lesson on any route redirects to `/` without crashing.
- Read-aloud degrades silently to hidden if `speechSynthesis` is unavailable; speech stops on page change.
- Demo mode needs no network once the app has run online once (`next/font` downloads the fonts on first run and serves them locally after that). The checklist includes a first run with internet.

## 14. Testing

- **Unit (Vitest):** lesson schema and `validateLesson` (counts, ids, `cardId` integrity, sanitizer); `extract-pptx` on a fixture PPTX; `scoring` (score, missed list, card lookup); `estimate`; `sample-class` determinism and weak-card selection; `generate-lesson` with a mocked Anthropic client (valid, invalid-then-valid retry, invalid twice, refusal, max_tokens).
- **API route:** error codes for wrong type, too big, missing key.
- **End-to-end (Playwright):** demo flow: `D` key, overview, all pages, quiz with one wrong answer, results, "Review this page" lands on the right page, back to results, teacher view shows the insight.
- **Real AI:** one manual run per sample deck once the key exists (`npm run make-demos`), with time and cost recorded in the README.
- **Video:** render, then check every beat against section 11.

## 15. Handover docs

- `README.md`: install, add the API key, run, rename the product, swap the sample deck, render the video.
- `docs/presentation-day-checklist.md`: the night before and 10 minutes before (laptop charged, `npm run dev` running, demo mode tested offline, video on laptop + USB + cloud, stage screens loaded, sound checked but not required).
- `docs/pitch-script.md`: timed draft per section 12.

## 16. Open items needing the user

1. Anthropic API key in `.env.local` (needed for real generation and for replacing placeholder demo lessons).
2. Music track file for the video.
3. Optional: a real class deck to use as the default sample.
4. The presenters' first names for the end card.
5. Final product name (default Slidekick).
