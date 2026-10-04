# Slidekick MVP App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the working Slidekick web app: upload slides, generate a lesson and quiz with Claude, study page by page, take the quiz, review missed pages, and view the teacher dashboard preview, with an offline demo mode.

**Architecture:** One Next.js 16 App Router project. Pure logic lives in `src/lib/` (schema, validation, PPTX extraction, scoring, sample class, AI call) and is unit-tested with Vitest. A single route handler `POST /api/generate` validates the upload and calls Claude with structured output. The UI is client components backed by a React context persisted to `sessionStorage`. Display components in `src/components/` are pure (props in, markup out) so the Remotion video in Plan 2 can reuse them.

**Tech Stack:** Next.js 16.3, React 19.3, TypeScript, Tailwind CSS 4.3, Motion 14 (`motion/react`), Zod 4, `@anthropic-ai/sdk` 0.131, JSZip 3.10, pdf-lib 1.17, Vitest 5 (+ jsdom, Testing Library), Playwright 1.63, tsx.

**Spec:** `docs/superpowers/specs/2026-10-04-slidekick-design.md`

**Out of this plan (Plan 2):** Remotion video, stage screens, slide thumbnails for the video, pitch script.

## Global Constraints

- Model: `claude-opus-5-5`; effort from `LESSON_EFFORT` env (`low|medium|high`, default `medium`); server-side fallback `fallbacks: "default"` with beta `server-side-fallback-2026-07-01`.
- One 120s deadline per generate request shared by the first attempt and one retry; retry only if at least 45s remain.
- Upload limits: 20 MB, 60 slides/pages, PDF or PPTX only, detected by file bytes plus lowercase extension, never by MIME type.
- Lesson limits: 4 to 15 cards, 5 to 10 questions, exactly 4 options, every `cardId` exists.
- Reading estimate: `ceil(words / 120 + questions * 0.5)` minutes, minimum 1.
- Error codes and copy exactly as spec section 10.
- Colors: paper `#F6F1E7`, paper-raised `#EFE8DA`, ink `#1B2233`, ink-soft `#4A5163`, rule `#D9D0BF`, highlight `#F2D04B`, right `#2F7D5B`, wrong `#B4443A`.
- Fonts: Literata (serif: headings, lesson text, page numbers), Atkinson Hyperlegible (sans: UI).
- Corner radius 2 to 4px. No drop shadows, gradients, glass, emojis, Lucide/stock icons, sparkle icons, checkmark bullets, colored left stripes, bento grids, hover animations (instant color change only), top-level tabs for 2 to 3 options.
- Copy: no em dashes anywhere in UI text; no "it's not X, it's Y"; no filler sub-headings.
- Motion: app transitions ~200ms ease-out fades/slides; honor `prefers-reduced-motion`.
- The API key is read only on the server from `ANTHROPIC_API_KEY`; never sent to the browser.
- Product name comes only from `src/config/brand.ts`.

## Review Focus

1. **Windows file quirks:** a file named `LESSON.PPTX` or `Deck.PDF` with an empty MIME type must be accepted; detection uses bytes plus lowercase extension. Pinned in Task 6.
2. **Reordered PowerPoint decks:** slides moved around in PowerPoint keep their old file names (`slide7.xml` can be first); extraction must follow `ppt/presentation.xml` order. Pinned in Task 5.
3. **Direct or stale URLs:** opening `/quiz`, `/results`, `/teacher` or `/lesson/42` in a fresh tab (empty or corrupt `sessionStorage`) must redirect home or clamp, never crash. Pinned in Task 8 (`parseStoredState`, `parsePageParam`) and Task 14 (e2e visits `/lesson/99`).
4. **Refresh mid-quiz:** answers survive a refresh and the quiz resumes at the first unanswered question. Pinned in Task 3 (`nextQuestionIndex`) and Task 8 (state round trip).
5. **Double start:** dropping a second file or pressing `D` while a lesson is generating must not start a second request. Pinned in Task 10 (`uploadReducer`).

---

### Task 1: Scaffold the project, design tokens, fonts and test runner

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.env.example`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx` (temporary)
- Create: `src/config/brand.ts`, `src/config/brand.test.ts`

**Interfaces:**
- Produces: `BRAND = { name: string; tagline: string }`; Tailwind color utilities `bg-paper`, `bg-paper-raised`, `text-ink`, `text-ink-soft`, `border-rule`, `bg-highlight`, `text-right`, `text-wrong` (and `bg-`/`border-` variants); font utilities `font-serif`, `font-sans`; path alias `@/*` → `src/*`.

- [ ] **Step 1: Scaffold Next.js in a scratch folder and move it in** (the repo already has `docs/` and `.git`)

```bash
cd "$SCRATCH" && npx create-next-app@16.3.8 slidekick --ts --tailwind --app --src-dir --import-alias "@/*" --use-npm --yes
# copy everything except .git and node_modules into the repo root, then:
cd /c/Users/38345/Desktop/dija && npm install
```

Delete the scaffold's sample assets (`public/*.svg`, default page content). Keep `.gitignore` entries from the repo (merge, do not overwrite).

- [ ] **Step 2: Install dependencies**

```bash
npm install motion@14 zod@4 @anthropic-ai/sdk jszip pdf-lib
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @playwright/test tsx
```

- [ ] **Step 3: Add scripts to `package.json`**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "decks": "node scripts/build-sample-decks.mjs",
  "make-demos": "tsx scripts/make-demos.ts"
}
```

- [ ] **Step 4: `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.{ts,tsx}"] },
});
```

- [ ] **Step 5: Write the failing brand test** `src/config/brand.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { BRAND } from "./brand";

describe("BRAND", () => {
  it("has a name and a tagline with no em dashes", () => {
    expect(BRAND.name).toBe("Slidekick");
    expect(BRAND.tagline).toBe("Slides in. Lesson out.");
    expect(`${BRAND.name}${BRAND.tagline}`).not.toMatch(/—/);
  });
});
```

Run: `npx vitest run src/config` → FAIL (module not found).

- [ ] **Step 6: `src/config/brand.ts`**

```ts
// Rename the product here. Everything in the app reads from this file.
export const BRAND = {
  name: "Slidekick",
  tagline: "Slides in. Lesson out.",
} as const;
```

Run: `npx vitest run src/config` → PASS.

- [ ] **Step 7: Design tokens in `src/app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-paper: #f6f1e7;
  --color-paper-raised: #efe8da;
  --color-ink: #1b2233;
  --color-ink-soft: #4a5163;
  --color-rule: #d9d0bf;
  --color-highlight: #f2d04b;
  --color-right: #2f7d5b;
  --color-wrong: #b4443a;
  --font-serif: var(--font-literata), Georgia, serif;
  --font-sans: var(--font-atkinson), system-ui, sans-serif;
  --radius-sm: 2px;
  --radius-md: 4px;
}

html { background: var(--color-paper); color: var(--color-ink); }
body { font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
:focus-visible { outline: 3px solid var(--color-highlight); outline-offset: 3px; }
::selection { background: var(--color-highlight); }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; }
}
```

- [ ] **Step 8: Fonts and metadata in `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Literata, Atkinson_Hyperlegible } from "next/font/google";
import { BRAND } from "@/config/brand";
import "./globals.css";

const literata = Literata({ subsets: ["latin"], variable: "--font-literata", display: "swap" });
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap" });

export const metadata: Metadata = { title: BRAND.name, description: BRAND.tagline };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${literata.variable} ${atkinson.variable}`}>
      <body className="min-h-dvh bg-paper text-ink">{children}</body>
    </html>
  );
}
```

Temporary `src/app/page.tsx`: `export default function Home() { return <main className="p-8 font-serif text-4xl">Slidekick</main>; }`

`.env.example`:

```
# Get a key at https://console.anthropic.com and copy this file to .env.local
ANTHROPIC_API_KEY=
# low | medium | high (lower is faster)
LESSON_EFFORT=medium
```

- [ ] **Step 9: Verify** `npm test` passes, `npm run build` succeeds, `npm run dev` shows "Slidekick" in Literata on paper background.

- [ ] **Step 10: Commit** `git add -A && git commit -m "chore: scaffold Next.js app with design tokens, fonts and Vitest"`

---

### Task 2: Lesson schema, sanitizer and validation

**Files:**
- Create: `src/lib/errors.ts`, `src/lib/lesson-schema.ts`, `src/lib/sanitize.ts`, `src/lib/validate-lesson.ts`
- Test: `src/lib/sanitize.test.ts`, `src/lib/validate-lesson.test.ts`, `src/lib/test-fixtures.ts`

**Interfaces:**
- Produces: `ErrorCode`, `ERROR_CODES`, `ERROR_MESSAGES`, `ERROR_STATUS`, `LessonError(code)`, `isErrorCode()`; `Card`, `Question`, `Lesson`, `LessonSchema`, `LIMITS`; `sanitizeText(s: string): string`; `validateLesson(raw: unknown): { ok: true; lesson: Lesson } | { ok: false; problems: string[] }`; `lessonJsonSchema(): Record<string, unknown>`; test helper `makeLesson(overrides?)`.

- [ ] **Step 1: `src/lib/errors.ts`** (no logic to test beyond types)

```ts
export const ERROR_CODES = [
  "no_key", "bad_type", "too_big", "too_many_slides", "empty",
  "timeout", "ai_unavailable", "invalid_output", "refused",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  no_key: "The AI isn't set up on this laptop yet.",
  bad_type: "That file type won't work. Use a PDF or PowerPoint file.",
  too_big: "That file is over 20 MB. Try exporting it as a PDF.",
  too_many_slides: "That deck has more than 60 slides. Try splitting it into two lessons.",
  empty: "We couldn't find any text in those slides. Try the PDF version.",
  timeout: "The AI took too long. Check the internet and try again.",
  ai_unavailable: "We couldn't reach the AI. Check the internet and try again.",
  invalid_output: "The AI's lesson came back incomplete. Try again.",
  refused: "The AI couldn't make a lesson from this file.",
};

export const ERROR_STATUS: Record<ErrorCode, number> = {
  no_key: 503, bad_type: 415, too_big: 413, too_many_slides: 422, empty: 422,
  timeout: 504, ai_unavailable: 502, invalid_output: 502, refused: 422,
};

export class LessonError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "LessonError";
    this.code = code;
  }
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && (ERROR_CODES as readonly string[]).includes(value);
}
```

- [ ] **Step 2: `src/lib/lesson-schema.ts`** (strict objects so the JSON schema has `additionalProperties: false`, which structured outputs require)

```ts
import { z } from "zod";

export const CardSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  explanation: z.string(),
  keyPoints: z.array(z.string()),
  rememberThis: z.string(),
});

export const QuestionSchema = z.strictObject({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  correctIndex: z.number().int(),
  explanation: z.string(),
  cardId: z.string(),
});

export const LessonSchema = z.strictObject({
  title: z.string(),
  subject: z.string(),
  cards: z.array(CardSchema),
  quiz: z.array(QuestionSchema),
});

export type Card = z.infer<typeof CardSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Lesson = z.infer<typeof LessonSchema>;

export const LIMITS = { minCards: 4, maxCards: 15, minQuestions: 5, maxQuestions: 10, options: 4 } as const;

/** JSON schema for Claude structured output. Counts are enforced by validateLesson, not here. */
export function lessonJsonSchema(): Record<string, unknown> {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(LessonSchema) as Record<string, unknown>;
  return schema;
}
```

- [ ] **Step 3: Test fixture helper `src/lib/test-fixtures.ts`**

```ts
import type { Lesson } from "./lesson-schema";

export function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  const cards = Array.from({ length: 5 }, (_, i) => ({
    id: `c${i + 1}`,
    title: `Topic ${i + 1}`,
    explanation: `This is the explanation for topic ${i + 1}. It has two sentences.`,
    keyPoints: [`Point A${i + 1}`, `Point B${i + 1}`],
    rememberThis: `Remember topic ${i + 1}.`,
  }));
  const quiz = Array.from({ length: 5 }, (_, i) => ({
    id: `q${i + 1}`,
    question: `Question ${i + 1}?`,
    options: [`Right ${i + 1}`, `Wrong A${i + 1}`, `Wrong B${i + 1}`, `Wrong C${i + 1}`],
    correctIndex: 0,
    explanation: `Because of topic ${i + 1}.`,
    cardId: `c${i + 1}`,
  }));
  return { title: "Test Lesson", subject: "Science", cards, quiz, ...overrides };
}
```

- [ ] **Step 4: Failing tests** `src/lib/sanitize.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { sanitizeText } from "./sanitize";

describe("sanitizeText", () => {
  it("turns em dashes into commas", () => {
    expect(sanitizeText("Plants make food — using light.")).toBe("Plants make food, using light.");
    expect(sanitizeText("Plants—animals")).toBe("Plants, animals");
  });
  it("turns spaced en dashes into commas but keeps number ranges", () => {
    expect(sanitizeText("War – a long one")).toBe("War, a long one");
    expect(sanitizeText("1914–1918")).toBe("1914–1918");
  });
  it("removes emojis without leaving double spaces or space before punctuation", () => {
    expect(sanitizeText("Leaves \u{1F331} are green \u{1F600}!")).toBe("Leaves are green!");
    expect(sanitizeText("Keycap 1️⃣ here")).toBe("Keycap 1 here");
  });
  it("keeps copyright and trademark signs", () => {
    expect(sanitizeText("© 2026 Brand™")).toBe("© 2026 Brand™");
  });
  it("drops a leading comma left by a leading dash", () => {
    expect(sanitizeText("— Start here")).toBe("Start here");
  });
});
```

`src/lib/validate-lesson.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { validateLesson } from "./validate-lesson";
import { lessonJsonSchema } from "./lesson-schema";
import { makeLesson } from "./test-fixtures";

describe("validateLesson", () => {
  it("accepts a well-formed lesson", () => {
    const result = validateLesson(makeLesson());
    expect(result.ok).toBe(true);
  });

  it("rejects non-objects and missing fields", () => {
    expect(validateLesson(null).ok).toBe(false);
    expect(validateLesson({ title: "x" }).ok).toBe(false);
  });

  it("rejects too few cards and too many questions", () => {
    const base = makeLesson();
    expect(validateLesson({ ...base, cards: base.cards.slice(0, 3) }).ok).toBe(false);
    const many = Array.from({ length: 11 }, (_, i) => ({ ...base.quiz[0], id: `q${i + 1}` }));
    expect(validateLesson({ ...base, quiz: many }).ok).toBe(false);
  });

  it("rejects a question pointing to a missing card", () => {
    const base = makeLesson();
    const quiz = base.quiz.map((q, i) => (i === 0 ? { ...q, cardId: "c99" } : q));
    const result = validateLesson({ ...base, quiz });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.join(" ")).toContain("c99");
  });

  it("rejects duplicate ids, wrong option counts, repeated options and bad correctIndex", () => {
    const base = makeLesson();
    const dupCards = base.cards.map((c, i) => (i === 1 ? { ...c, id: "c1" } : c));
    expect(validateLesson({ ...base, cards: dupCards }).ok).toBe(false);
    const threeOptions = base.quiz.map((q, i) => (i === 0 ? { ...q, options: q.options.slice(0, 3) } : q));
    expect(validateLesson({ ...base, quiz: threeOptions }).ok).toBe(false);
    const repeated = base.quiz.map((q, i) => (i === 0 ? { ...q, options: ["A", "a", "B", "C"] } : q));
    expect(validateLesson({ ...base, quiz: repeated }).ok).toBe(false);
    const badIndex = base.quiz.map((q, i) => (i === 0 ? { ...q, correctIndex: 4 } : q));
    expect(validateLesson({ ...base, quiz: badIndex }).ok).toBe(false);
  });

  it("returns sanitized text", () => {
    const base = makeLesson();
    const cards = base.cards.map((c, i) => (i === 0 ? { ...c, explanation: "Light — energy \u{1F31E}." } : c));
    const result = validateLesson({ ...base, cards });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.lesson.cards[0].explanation).toBe("Light, energy.");
  });
});

describe("lessonJsonSchema", () => {
  it("is an object schema with no $schema key and closed objects", () => {
    const schema = lessonJsonSchema() as { type: string; additionalProperties: boolean; required: string[] };
    expect(schema.type).toBe("object");
    expect(schema).not.toHaveProperty("$schema");
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(expect.arrayContaining(["title", "subject", "cards", "quiz"]));
    expect(JSON.stringify(schema)).not.toContain('"additionalProperties":true');
  });
});
```

Run: `npx vitest run src/lib` → FAIL (modules missing).

- [ ] **Step 5: `src/lib/sanitize.ts`**

```ts
// Emoji and pictographs, except the copyright, registered and trademark signs.
const EMOJI = /(?![©®™])\p{Extended_Pictographic}|[‍️⃣]/gu;

export function sanitizeText(input: string): string {
  return input
    .replace(EMOJI, "")
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s+–\s+/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/^[,\s]+/, "")
    .trim();
}
```

- [ ] **Step 6: `src/lib/validate-lesson.ts`**

```ts
import { LessonSchema, LIMITS, type Lesson } from "./lesson-schema";
import { sanitizeText as s } from "./sanitize";

export type ValidationResult = { ok: true; lesson: Lesson } | { ok: false; problems: string[] };

function sanitizeLesson(lesson: Lesson): Lesson {
  return {
    title: s(lesson.title),
    subject: s(lesson.subject),
    cards: lesson.cards.map((c) => ({
      id: c.id.trim(),
      title: s(c.title),
      explanation: s(c.explanation),
      keyPoints: c.keyPoints.map(s).filter(Boolean),
      rememberThis: s(c.rememberThis),
    })),
    quiz: lesson.quiz.map((q) => ({
      id: q.id.trim(),
      question: s(q.question),
      options: q.options.map(s),
      correctIndex: q.correctIndex,
      explanation: s(q.explanation),
      cardId: q.cardId.trim(),
    })),
  };
}

export function validateLesson(raw: unknown): ValidationResult {
  const parsed = LessonSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, problems: parsed.error.issues.map((i) => `${i.path.join(".") || "lesson"}: ${i.message}`) };
  }
  const lesson = sanitizeLesson(parsed.data);
  const problems: string[] = [];
  const { cards, quiz } = lesson;

  if (!lesson.title) problems.push("title is empty");
  if (cards.length < LIMITS.minCards || cards.length > LIMITS.maxCards) {
    problems.push(`expected ${LIMITS.minCards}-${LIMITS.maxCards} cards, got ${cards.length}`);
  }
  if (quiz.length < LIMITS.minQuestions || quiz.length > LIMITS.maxQuestions) {
    problems.push(`expected ${LIMITS.minQuestions}-${LIMITS.maxQuestions} questions, got ${quiz.length}`);
  }

  const cardIds = new Set<string>();
  for (const card of cards) {
    if (!card.id || cardIds.has(card.id)) problems.push(`card id "${card.id}" is empty or duplicated`);
    cardIds.add(card.id);
    if (!card.title || !card.explanation || !card.rememberThis) problems.push(`card ${card.id} has empty text`);
    if (card.keyPoints.length < 1 || card.keyPoints.length > 6) problems.push(`card ${card.id} needs 1-6 key points`);
  }

  const questionIds = new Set<string>();
  for (const q of quiz) {
    if (!q.id || questionIds.has(q.id)) problems.push(`question id "${q.id}" is empty or duplicated`);
    questionIds.add(q.id);
    if (!q.question) problems.push(`question ${q.id} is empty`);
    if (q.options.length !== LIMITS.options) problems.push(`question ${q.id} needs exactly ${LIMITS.options} options`);
    const distinct = new Set(q.options.map((o) => o.toLowerCase()));
    if (distinct.size !== q.options.length || q.options.some((o) => !o)) {
      problems.push(`question ${q.id} has empty or repeated options`);
    }
    if (q.correctIndex < 0 || q.correctIndex >= q.options.length) problems.push(`question ${q.id} correctIndex out of range`);
    if (!cardIds.has(q.cardId)) problems.push(`question ${q.id} points to missing card "${q.cardId}"`);
  }

  return problems.length ? { ok: false, problems } : { ok: true, lesson };
}
```

- [ ] **Step 7: Run** `npx vitest run src/lib` → PASS.

- [ ] **Step 8: Commit** `git add -A && git commit -m "feat: lesson schema, sanitizer and validation"`

---

### Task 3: Reading estimate and quiz scoring

**Files:**
- Create: `src/lib/estimate.ts`, `src/lib/scoring.ts`
- Test: `src/lib/estimate.test.ts`, `src/lib/scoring.test.ts`

**Interfaces:**
- Consumes: `Lesson`, `Question`, `Card` (Task 2), `makeLesson` (Task 2).
- Produces: `countWords(text)`, `lessonWordCount(lesson)`, `estimateMinutes(lesson): number`; `Answers = Record<string, number>`; `scoreQuiz(questions, answers): { correct; total; missed: Question[] }`; `findCard(lesson, cardId): { card: Card; pageNumber: number } | null`; `verdict(correct, total): string`; `nextQuestionIndex(questions, answers): number` (-1 when all answered).

- [ ] **Step 1: Failing tests** `src/lib/estimate.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { countWords, estimateMinutes, lessonWordCount } from "./estimate";
import { makeLesson } from "./test-fixtures";

describe("estimate", () => {
  it("counts words on whitespace", () => {
    expect(countWords("  one two\nthree ")).toBe(3);
    expect(countWords("   ")).toBe(0);
  });
  it("estimates minutes from words at 120 wpm plus half a minute per question", () => {
    const lesson = makeLesson();
    const words = lessonWordCount(lesson);
    expect(estimateMinutes(lesson)).toBe(Math.ceil(words / 120 + lesson.quiz.length * 0.5));
  });
  it("never returns less than 1", () => {
    const tiny = makeLesson({ quiz: [] });
    tiny.cards = tiny.cards.map((c) => ({ ...c, title: "", explanation: "", keyPoints: [], rememberThis: "" }));
    expect(estimateMinutes(tiny)).toBe(1);
  });
});
```

`src/lib/scoring.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { findCard, nextQuestionIndex, scoreQuiz, verdict } from "./scoring";
import { makeLesson } from "./test-fixtures";

const lesson = makeLesson();

describe("scoreQuiz", () => {
  it("counts correct answers and lists missed questions, treating unanswered as missed", () => {
    const answers = { q1: 0, q2: 1, q3: 0 };
    const score = scoreQuiz(lesson.quiz, answers);
    expect(score.correct).toBe(2);
    expect(score.total).toBe(5);
    expect(score.missed.map((q) => q.id)).toEqual(["q2", "q4", "q5"]);
  });
});

describe("findCard", () => {
  it("returns the card and its 1-based page number", () => {
    expect(findCard(lesson, "c3")).toEqual({ card: lesson.cards[2], pageNumber: 3 });
    expect(findCard(lesson, "nope")).toBeNull();
  });
});

describe("nextQuestionIndex", () => {
  it("returns the first unanswered question, or -1 when all are answered", () => {
    expect(nextQuestionIndex(lesson.quiz, {})).toBe(0);
    expect(nextQuestionIndex(lesson.quiz, { q1: 0, q2: 3 })).toBe(2);
    expect(nextQuestionIndex(lesson.quiz, { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 })).toBe(-1);
  });
});

describe("verdict", () => {
  it("has a line for every band and never uses em dashes", () => {
    const lines = [verdict(6, 6), verdict(5, 6), verdict(3, 6), verdict(1, 6), verdict(0, 0)];
    expect(new Set(lines).size).toBe(4);
    for (const line of lines) expect(line).not.toMatch(/—/);
  });
});
```

Run → FAIL.

- [ ] **Step 2: `src/lib/estimate.ts`**

```ts
import type { Lesson } from "./lesson-schema";

export const WORDS_PER_MINUTE = 120;
export const MINUTES_PER_QUESTION = 0.5;

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function lessonWordCount(lesson: Lesson): number {
  return lesson.cards.reduce(
    (sum, c) => sum + countWords([c.title, c.explanation, ...c.keyPoints, c.rememberThis].join(" ")),
    0,
  );
}

export function estimateMinutes(lesson: Lesson): number {
  const minutes = lessonWordCount(lesson) / WORDS_PER_MINUTE + lesson.quiz.length * MINUTES_PER_QUESTION;
  return Math.max(1, Math.ceil(minutes));
}
```

- [ ] **Step 3: `src/lib/scoring.ts`**

```ts
import type { Card, Lesson, Question } from "./lesson-schema";

export type Answers = Record<string, number>;
export type QuizScore = { correct: number; total: number; missed: Question[] };

export function scoreQuiz(questions: Question[], answers: Answers): QuizScore {
  const missed = questions.filter((q) => answers[q.id] !== q.correctIndex);
  return { correct: questions.length - missed.length, total: questions.length, missed };
}

export function findCard(lesson: Lesson, cardId: string): { card: Card; pageNumber: number } | null {
  const index = lesson.cards.findIndex((c) => c.id === cardId);
  return index === -1 ? null : { card: lesson.cards[index], pageNumber: index + 1 };
}

export function nextQuestionIndex(questions: Question[], answers: Answers): number {
  return questions.findIndex((q) => answers[q.id] === undefined);
}

export function verdict(correct: number, total: number): string {
  const ratio = total === 0 ? 1 : correct / total;
  if (ratio === 1) return "Perfect score. You know this lesson.";
  if (ratio >= 0.8) return "Strong work. Review the pages below and you have all of it.";
  if (ratio >= 0.5) return "Good start. The pages below will close the gaps.";
  return "Worth another pass. Start with the pages below.";
}
```

- [ ] **Step 4: Run** `npx vitest run src/lib` → PASS. **Commit** `git commit -am "feat: reading estimate and quiz scoring"` (add new files first with `git add -A`).

---

### Task 4: Seeded sample class report

**Files:**
- Create: `src/lib/sample-class.ts`
- Test: `src/lib/sample-class.test.ts`

**Interfaces:**
- Consumes: `Lesson` (Task 2), `makeLesson` (Task 2).
- Produces: `hashString`, `mulberry32`, `lessonSeed(lesson)`, `weakCardIndex(lesson): number`, `STRUGGLE_THRESHOLD = 60`, `CLASS_NAMES` (26), types `TopicMastery = { cardId; pageNumber; title; percent; struggling }`, `StudentResult = { name; average; weakestTitle }`, `ClassReport = { classSize; classAverage; topics: TopicMastery[]; weakest: TopicMastery; needHelp: StudentResult[]; insight: string; action: string }`, `buildClassReport(lesson): ClassReport`.

- [ ] **Step 1: Failing tests** `src/lib/sample-class.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { buildClassReport, CLASS_NAMES, weakCardIndex } from "./sample-class";
import { makeLesson } from "./test-fixtures";

describe("buildClassReport", () => {
  const lesson = makeLesson();

  it("is deterministic for the same lesson", () => {
    expect(buildClassReport(lesson)).toEqual(buildClassReport(structuredClone(lesson)));
  });

  it("changes when the lesson changes", () => {
    const other = makeLesson({ title: "Another Lesson" });
    expect(buildClassReport(other)).not.toEqual(buildClassReport(lesson));
  });

  it("never picks the first card as the weak card", () => {
    for (const title of ["A", "B", "C", "D", "E", "F", "G", "H"]) {
      expect(weakCardIndex(makeLesson({ title }))).toBeGreaterThan(0);
    }
  });

  it("makes the weak card the lowest topic and writes the insight from data", () => {
    const report = buildClassReport(lesson);
    const weak = lesson.cards[weakCardIndex(lesson)];
    expect(report.weakest.cardId).toBe(weak.id);
    expect(Math.min(...report.topics.map((t) => t.percent))).toBe(report.weakest.percent);
    expect(report.insight).toBe(`${report.weakest.struggling} of ${CLASS_NAMES.length} students struggled with ${weak.title}.`);
    expect(report.action).toBe(`Re-teach page ${report.weakest.pageNumber}.`);
  });

  it("lists 4 students who need help, lowest average first", () => {
    const { needHelp } = buildClassReport(lesson);
    expect(needHelp).toHaveLength(4);
    const averages = needHelp.map((s) => s.average);
    expect([...averages].sort((a, b) => a - b)).toEqual(averages);
  });

  it("keeps every percent between 0 and 100", () => {
    for (const t of buildClassReport(lesson).topics) {
      expect(t.percent).toBeGreaterThanOrEqual(0);
      expect(t.percent).toBeLessThanOrEqual(100);
    }
  });
});
```

Run → FAIL.

- [ ] **Step 2: `src/lib/sample-class.ts`**

```ts
import type { Lesson } from "./lesson-schema";

export const CLASS_NAMES = [
  "Arta", "Liam", "Sofia", "Noah", "Amira", "Leon", "Mia", "Yusuf", "Elena", "Kai",
  "Zara", "Luka", "Ines", "Omar", "Nora", "Mateo", "Lea", "Dren", "Hana", "Jonas",
  "Aisha", "Ben", "Vera", "Rron", "Maya", "Theo",
] as const;

export const STRUGGLE_THRESHOLD = 60;

export type TopicMastery = { cardId: string; pageNumber: number; title: string; percent: number; struggling: number };
export type StudentResult = { name: string; average: number; weakestTitle: string };
export type ClassReport = {
  classSize: number;
  classAverage: number;
  topics: TopicMastery[];
  weakest: TopicMastery;
  needHelp: StudentResult[];
  insight: string;
  action: string;
};

/** FNV-1a 32-bit. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (const ch of text) {
    hash ^= ch.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lessonSeed(lesson: Lesson): number {
  return hashString(`${lesson.title}|${lesson.cards.map((c) => `${c.id}:${c.title}`).join("|")}`);
}

/** A seeded pick among cards 2..n so the insight never points at the intro page. */
export function weakCardIndex(lesson: Lesson): number {
  const n = lesson.cards.length;
  return n < 2 ? 0 : 1 + (lessonSeed(lesson) % (n - 1));
}

const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const clamp = (v: number) => Math.min(100, Math.max(5, Math.round(v)));
const bare = (title: string) => title.replace(/[.?!:]+$/, "");

export function buildClassReport(lesson: Lesson): ClassReport {
  const rng = mulberry32(lessonSeed(lesson));
  const weak = weakCardIndex(lesson);

  const students = CLASS_NAMES.map((name) => {
    const ability = 55 + rng() * 40;
    const scores = lesson.cards.map((_, i) => clamp(ability + (rng() - 0.5) * 30 - (i === weak ? 35 : 0)));
    return { name, scores };
  });

  const topics: TopicMastery[] = lesson.cards.map((card, i) => {
    const values = students.map((s) => s.scores[i]);
    return {
      cardId: card.id,
      pageNumber: i + 1,
      title: card.title,
      percent: Math.round(average(values)),
      struggling: values.filter((v) => v < STRUGGLE_THRESHOLD).length,
    };
  });

  const weakest = topics.reduce((low, t) => (t.percent < low.percent ? t : low));

  const needHelp = students
    .map((s) => ({
      name: s.name,
      average: Math.round(average(s.scores)),
      weakestTitle: lesson.cards[s.scores.indexOf(Math.min(...s.scores))].title,
    }))
    .sort((a, b) => a.average - b.average || a.name.localeCompare(b.name))
    .slice(0, 4);

  const insight =
    weakest.percent < STRUGGLE_THRESHOLD
      ? `${weakest.struggling} of ${CLASS_NAMES.length} students struggled with ${bare(weakest.title)}.`
      : `The class is solid on every topic. Lowest: ${bare(weakest.title)} at ${weakest.percent}%.`;

  return {
    classSize: CLASS_NAMES.length,
    classAverage: Math.round(average(topics.map((t) => t.percent))),
    topics,
    weakest,
    needHelp,
    insight,
    action: `Re-teach page ${weakest.pageNumber}.`,
  };
}
```

Note: the test's insight expectation uses `weak.title`; fixture titles have no trailing punctuation, so `bare()` leaves them unchanged.

- [ ] **Step 3: Run** → PASS. **Commit** `git add -A && git commit -m "feat: seeded sample class report for the teacher preview"`

---

### Task 5: PowerPoint text extraction

**Files:**
- Create: `src/lib/extract-pptx.ts`
- Test: `src/lib/extract-pptx.test.ts`, `src/lib/pptx-fixture.ts`

**Interfaces:**
- Produces: `SlideText = { number: number; text: string; notes: string }`; `extractPptx(data: Uint8Array | ArrayBuffer): Promise<SlideText[]>` (throws on non-zip); `xmlToText(xml): string`; `slidesToPrompt(slides): string`; `hasReadableText(slides): boolean`; test helper `buildPptx(spec): Promise<Uint8Array>`.

- [ ] **Step 1: Fixture builder `src/lib/pptx-fixture.ts`**

```ts
import JSZip from "jszip";

type FixtureSlide = { file: number; paragraphs: string[]; notes?: string[] };

const para = (text: string) => `<a:p><a:r><a:t>${text}</a:t></a:r></a:p>`;

/** Builds a minimal PPTX. `order` lists slide file numbers in presentation order. */
export async function buildPptx(slides: FixtureSlide[], order = slides.map((s) => s.file)): Promise<Uint8Array> {
  const zip = new JSZip();
  const rels = slides
    .map((s) => `<Relationship Id="rId${s.file + 100}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${s.file}.xml"/>`)
    .join("");
  zip.file("ppt/_rels/presentation.xml.rels", `<?xml version="1.0"?><Relationships>${rels}</Relationships>`);
  const ids = order.map((file, i) => `<p:sldId id="${256 + i}" r:id="rId${file + 100}"/>`).join("");
  zip.file("ppt/presentation.xml", `<?xml version="1.0"?><p:presentation><p:sldIdLst>${ids}</p:sldIdLst></p:presentation>`);
  for (const s of slides) {
    zip.file(`ppt/slides/slide${s.file}.xml`, `<p:sld><p:txBody>${s.paragraphs.map(para).join("")}</p:txBody></p:sld>`);
    if (s.notes) {
      zip.file(
        `ppt/slides/_rels/slide${s.file}.xml.rels`,
        `<Relationships><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${s.file + 40}.xml"/></Relationships>`,
      );
      zip.file(
        `ppt/notesSlides/notesSlide${s.file + 40}.xml`,
        `<p:notes>${s.notes.map(para).join("")}<a:p><a:fld id="x" type="slidenum"><a:t>${s.file}</a:t></a:fld></a:p></p:notes>`,
      );
    }
  }
  return zip.generateAsync({ type: "uint8array" });
}
```

- [ ] **Step 2: Failing tests** `src/lib/extract-pptx.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { extractPptx, hasReadableText, slidesToPrompt, xmlToText } from "./extract-pptx";
import { buildPptx } from "./pptx-fixture";

describe("xmlToText", () => {
  it("joins runs per paragraph, decodes entities, turns line breaks into spaces and skips fields", () => {
    const xml =
      '<a:p><a:r><a:t>Light &amp; water</a:t></a:r><a:br/><a:r><a:t>make &#x201C;food&#x201D;</a:t></a:r></a:p>' +
      '<a:p><a:pPr/><a:r><a:t xml:space="preserve">Second &lt;line&gt;</a:t></a:r></a:p>' +
      '<a:p><a:fld id="1" type="slidenum"><a:t>7</a:t></a:fld></a:p>';
    expect(xmlToText(xml)).toBe("Light & water make “food”\nSecond <line>");
  });
});

describe("extractPptx", () => {
  it("follows presentation order, not file names (Review Focus 2)", async () => {
    const data = await buildPptx(
      [
        { file: 1, paragraphs: ["Moved to the end"] },
        { file: 2, paragraphs: ["Second"] },
        { file: 10, paragraphs: ["Title slide"] },
      ],
      [10, 2, 1],
    );
    const slides = await extractPptx(data);
    expect(slides.map((s) => s.text)).toEqual(["Title slide", "Second", "Moved to the end"]);
    expect(slides.map((s) => s.number)).toEqual([1, 2, 3]);
  });

  it("falls back to numeric file order when presentation.xml is missing", async () => {
    const data = await buildPptx([
      { file: 10, paragraphs: ["Ten"] },
      { file: 2, paragraphs: ["Two"] },
    ]);
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(data);
    zip.remove("ppt/presentation.xml");
    const slides = await extractPptx(await zip.generateAsync({ type: "uint8array" }));
    expect(slides.map((s) => s.text)).toEqual(["Two", "Ten"]);
  });

  it("reads speaker notes through the slide relationships, without the slide number field", async () => {
    const data = await buildPptx([{ file: 3, paragraphs: ["Chlorophyll"], notes: ["Say it is green."] }]);
    const [slide] = await extractPptx(data);
    expect(slide.notes).toBe("Say it is green.");
  });

  it("throws on bytes that are not a zip", async () => {
    await expect(extractPptx(new TextEncoder().encode("not a zip"))).rejects.toThrow();
  });
});

describe("slidesToPrompt and hasReadableText", () => {
  it("labels slides and notes", () => {
    const text = slidesToPrompt([
      { number: 1, text: "Intro", notes: "" },
      { number: 2, text: "", notes: "Talk about leaves" },
    ]);
    expect(text).toBe("Slide 1:\nIntro\n\nSlide 2:\n(no text)\nSpeaker notes: Talk about leaves");
  });
  it("detects image-only decks", () => {
    expect(hasReadableText([{ number: 1, text: "", notes: "" }, { number: 2, text: "7", notes: "" }])).toBe(false);
    expect(hasReadableText([{ number: 1, text: "Cells", notes: "" }])).toBe(true);
  });
});
```

Run → FAIL.

- [ ] **Step 3: `src/lib/extract-pptx.ts`**

```ts
import JSZip from "jszip";

export type SlideText = { number: number; text: string; notes: string };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] !== "#") return ENTITIES[e.toLowerCase()];
    const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return String.fromCodePoint(code);
  });
}

const attr = (tag: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];

export function xmlToText(xml: string): string {
  const cleaned = xml.replace(/<a:fld\b[\s\S]*?<\/a:fld>/g, "").replace(/<a:br\s*\/>/g, "<a:t> </a:t>");
  const paragraphs = cleaned.match(/<a:p\b[\s\S]*?<\/a:p>/g) ?? [];
  return paragraphs
    .map((p) => [...p.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map((m) => decodeXml(m[1])).join(""))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

async function slidePaths(zip: JSZip): Promise<string[]> {
  const numeric = Object.keys(zip.files)
    .map((path) => ({ path, match: /^ppt\/slides\/slide(\d+)\.xml$/.exec(path) }))
    .filter((x): x is { path: string; match: RegExpExecArray } => x.match !== null)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))
    .map((x) => x.path);

  const pres = await zip.file("ppt/presentation.xml")?.async("string");
  const rels = await zip.file("ppt/_rels/presentation.xml.rels")?.async("string");
  if (!pres || !rels) return numeric;

  const targets = new Map<string, string>();
  for (const [tag] of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(tag, "Id");
    const target = attr(tag, "Target");
    if (id && target) targets.set(id, `ppt/${target.replace(/^\/?ppt\//, "").replace(/^\.\//, "")}`);
  }
  const ordered = [...pres.matchAll(/<p:sldId\b[^>]*>/g)]
    .map(([tag]) => targets.get(attr(tag, "r:id") ?? ""))
    .filter((p): p is string => !!p && zip.file(p) !== null);
  return ordered.length ? ordered : numeric;
}

async function readNotes(zip: JSZip, slidePath: string): Promise<string> {
  const relsPath = slidePath.replace(/slides\/(slide\d+\.xml)$/, "slides/_rels/$1.rels");
  const rels = await zip.file(relsPath)?.async("string");
  const target = rels && /Target="([^"]*notesSlide\d+\.xml)"/.exec(rels)?.[1];
  if (!target) return "";
  const notes = await zip.file(`ppt/${target.replace(/^(\.\.\/)+/, "")}`)?.async("string");
  return notes ? xmlToText(notes).replace(/\n/g, " ") : "";
}

export async function extractPptx(data: Uint8Array | ArrayBuffer): Promise<SlideText[]> {
  const zip = await JSZip.loadAsync(data);
  const paths = await slidePaths(zip);
  const slides: SlideText[] = [];
  for (const [i, path] of paths.entries()) {
    const xml = await zip.file(path)!.async("string");
    slides.push({ number: i + 1, text: xmlToText(xml), notes: await readNotes(zip, path) });
  }
  return slides;
}

export function slidesToPrompt(slides: SlideText[]): string {
  return slides
    .map((s) => `Slide ${s.number}:\n${s.text || "(no text)"}${s.notes ? `\nSpeaker notes: ${s.notes}` : ""}`)
    .join("\n\n");
}

export function hasReadableText(slides: SlideText[]): boolean {
  return slides.some((s) => /\p{L}{2,}/u.test(`${s.text} ${s.notes}`));
}
```

- [ ] **Step 4: Run** → PASS. **Commit** `git add -A && git commit -m "feat: extract slide text and notes from PowerPoint files"`

---

### Task 6: Upload checks, AI generation and the API route

**Files:**
- Create: `src/lib/file-kind.ts`, `src/lib/lesson-prompt.ts`, `src/lib/generate-lesson.ts`, `src/lib/anthropic-client.ts`, `src/lib/handle-generate.ts`, `src/app/api/generate/route.ts`
- Test: `src/lib/file-kind.test.ts`, `src/lib/generate-lesson.test.ts`, `src/lib/handle-generate.test.ts`

**Interfaces:**
- Consumes: `Lesson`, `lessonJsonSchema`, `validateLesson`, `LessonError`, `ERROR_MESSAGES`, `ERROR_STATUS` (Task 2); `extractPptx`, `slidesToPrompt`, `hasReadableText` (Task 5).
- Produces:
  - `FileKind = "pdf" | "pptx"`, `MAX_FILE_BYTES = 20 * 1024 * 1024`, `MAX_SLIDES = 60`, `detectFileKind(name, head: Uint8Array): FileKind | null`, `precheckFile(file: File): Promise<ErrorCode | null>`.
  - `LessonSource = { kind: "pdf"; base64: string } | { kind: "text"; text: string }`, `Effort`, `parseEffort(value?: string): Effort`, `ModelReply = { stop_reason: string | null; content: { type: string; text?: string }[] }`, `CreateMessage = (params: LessonRequest, options: { signal: AbortSignal }) => Promise<ModelReply>`, `buildLessonRequest(source, effort)`, `generateLesson(source, { createMessage, effort?, now? }): Promise<Lesson>`.
  - `makeCreateMessage(apiKey: string): CreateMessage`.
  - `handleGenerate(request: Request, deps: { hasKey: boolean; generate: (s: LessonSource) => Promise<Lesson> }): Promise<Response>`; JSON body `{ lesson, slideCount }` or `{ error: { code, message } }`.

- [ ] **Step 1: Failing tests** `src/lib/file-kind.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { detectFileKind, MAX_FILE_BYTES, precheckFile } from "./file-kind";

const enc = (s: string) => new TextEncoder().encode(s);
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]);

describe("detectFileKind (Review Focus 1)", () => {
  it("detects PDFs by magic bytes regardless of name case", () => {
    expect(detectFileKind("Deck.PDF", enc("%PDF-1.7\n"))).toBe("pdf");
    expect(detectFileKind("weird-name", enc("%PDF-1.4"))).toBe("pdf");
    expect(detectFileKind("junk-first.pdf", enc("\n\n%PDF-1.4"))).toBe("pdf");
  });
  it("detects PPTX by zip bytes plus .pptx extension in any case", () => {
    expect(detectFileKind("LESSON.PPTX", ZIP)).toBe("pptx");
    expect(detectFileKind("report.docx", ZIP)).toBeNull();
  });
  it("rejects lookalikes", () => {
    expect(detectFileKind("fake.pdf", enc("hello"))).toBeNull();
    expect(detectFileKind("old.ppt", enc("\xD0\xCF\x11\xE0"))).toBeNull();
  });
});

describe("precheckFile", () => {
  it("accepts a PDF with an empty MIME type", async () => {
    expect(await precheckFile(new File([enc("%PDF-1.7")], "a.pdf", { type: "" }))).toBeNull();
  });
  it("flags wrong types and big files", async () => {
    expect(await precheckFile(new File([enc("hi")], "a.txt"))).toBe("bad_type");
    const big = new File([new Uint8Array(MAX_FILE_BYTES + 1)], "big.pdf");
    expect(await precheckFile(big)).toBe("too_big");
  });
});
```

`src/lib/generate-lesson.test.ts`

```ts
import { describe, expect, it, vi } from "vitest";
import { buildLessonRequest, generateLesson, parseEffort, type CreateMessage } from "./generate-lesson";
import { LessonError } from "./errors";
import { makeLesson } from "./test-fixtures";

const reply = (text: string, stop_reason = "end_turn") => ({ stop_reason, content: [{ type: "text", text }] });
const good = JSON.stringify(makeLesson());
const source = { kind: "text", text: "Slide 1:\nCells" } as const;

describe("generateLesson", () => {
  it("returns the validated lesson", async () => {
    const createMessage: CreateMessage = vi.fn(async () => reply(good));
    const lesson = await generateLesson(source, { createMessage });
    expect(lesson.title).toBe("Test Lesson");
    expect(createMessage).toHaveBeenCalledTimes(1);
  });

  it("retries once after invalid output, then succeeds", async () => {
    const createMessage = vi.fn<CreateMessage>().mockResolvedValueOnce(reply("{not json")).mockResolvedValueOnce(reply(good));
    await expect(generateLesson(source, { createMessage })).resolves.toMatchObject({ title: "Test Lesson" });
    expect(createMessage).toHaveBeenCalledTimes(2);
  });

  it("retries after max_tokens", async () => {
    const createMessage = vi.fn<CreateMessage>().mockResolvedValueOnce(reply("{", "max_tokens")).mockResolvedValueOnce(reply(good));
    await expect(generateLesson(source, { createMessage })).resolves.toBeTruthy();
  });

  it("fails with invalid_output after two bad replies", async () => {
    const createMessage = vi.fn<CreateMessage>(async () => reply('{"title":"x"}'));
    await expect(generateLesson(source, { createMessage })).rejects.toMatchObject({ code: "invalid_output" });
    expect(createMessage).toHaveBeenCalledTimes(2);
  });

  it("does not retry when less than 45s of the 120s deadline is left", async () => {
    let t = 0;
    const createMessage = vi.fn<CreateMessage>(async () => {
      t += 80_000;
      return reply("{bad");
    });
    await expect(generateLesson(source, { createMessage, now: () => t })).rejects.toMatchObject({ code: "invalid_output" });
    expect(createMessage).toHaveBeenCalledTimes(1);
  });

  it("maps a refusal to the refused error", async () => {
    const createMessage = vi.fn<CreateMessage>(async () => ({ stop_reason: "refusal", content: [] }));
    await expect(generateLesson(source, { createMessage })).rejects.toBeInstanceOf(LessonError);
    await expect(generateLesson(source, { createMessage })).rejects.toMatchObject({ code: "refused" });
  });

  it("maps an aborted call to timeout", async () => {
    const createMessage: CreateMessage = (_p, { signal }) =>
      new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))));
    vi.useFakeTimers();
    const pending = generateLesson(source, { createMessage });
    const assertion = expect(pending).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(120_000);
    await assertion;
    vi.useRealTimers();
  });
});

describe("buildLessonRequest", () => {
  it("puts the PDF document block before the instruction and enables fallbacks", () => {
    const req = buildLessonRequest({ kind: "pdf", base64: "AAAA" }, "low");
    expect(req.model).toBe("claude-opus-5-5");
    expect(req.betas).toContain("server-side-fallback-2026-07-01");
    expect(req.fallbacks).toBe("default");
    expect(req.output_config.effort).toBe("low");
    expect(req.output_config.format.type).toBe("json_schema");
    const content = req.messages[0].content;
    expect(content[0]).toMatchObject({ type: "document", source: { media_type: "application/pdf", data: "AAAA" } });
    expect(content[1]).toMatchObject({ type: "text" });
  });
  it("wraps PPTX text in slides tags", () => {
    const req = buildLessonRequest(source, "medium");
    expect(req.messages[0].content[0]).toMatchObject({ type: "text", text: expect.stringContaining("<slides>\nSlide 1:") });
  });
});

describe("parseEffort", () => {
  it("defaults to medium", () => {
    expect(parseEffort(undefined)).toBe("medium");
    expect(parseEffort("LOW")).toBe("low");
    expect(parseEffort("turbo")).toBe("medium");
  });
});
```

`src/lib/handle-generate.test.ts`

```ts
import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { handleGenerate } from "./handle-generate";
import { buildPptx } from "./pptx-fixture";
import { makeLesson } from "./test-fixtures";

async function pdfWithPages(n: number) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) doc.addPage();
  return doc.save();
}

function post(file: File | null) {
  const form = new FormData();
  if (file) form.set("file", file);
  return new Request("http://localhost/api/generate", { method: "POST", body: form });
}

const okDeps = () => ({ hasKey: true, generate: vi.fn(async () => makeLesson()) });

describe("handleGenerate", () => {
  it("returns no_key before reading the upload", async () => {
    const res = await handleGenerate(post(null), { hasKey: false, generate: vi.fn() });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("no_key");
  });

  it("rejects a missing file and a wrong type", async () => {
    expect((await (await handleGenerate(post(null), okDeps())).json()).error.code).toBe("bad_type");
    const txt = new File(["hello"], "notes.txt");
    expect((await handleGenerate(post(txt), okDeps())).status).toBe(415);
  });

  it("generates from a PDF and reports the page count", async () => {
    const deps = okDeps();
    const file = new File([await pdfWithPages(3)], "DECK.PDF", { type: "" });
    const res = await handleGenerate(post(file), deps);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slideCount).toBe(3);
    expect(body.lesson.title).toBe("Test Lesson");
    expect(deps.generate).toHaveBeenCalledWith({ kind: "pdf", base64: expect.any(String) });
  });

  it("rejects PDFs over 60 pages", async () => {
    const file = new File([await pdfWithPages(61)], "long.pdf");
    expect((await (await handleGenerate(post(file), okDeps())).json()).error.code).toBe("too_many_slides");
  });

  it("generates from PPTX text and rejects image-only decks", async () => {
    const deps = okDeps();
    const pptx = await buildPptx([{ file: 1, paragraphs: ["Photosynthesis basics"] }]);
    const res = await handleGenerate(post(new File([pptx], "Lesson.PPTX")), deps);
    expect(res.status).toBe(200);
    expect(deps.generate).toHaveBeenCalledWith({ kind: "text", text: "Slide 1:\nPhotosynthesis basics" });

    const empty = await buildPptx([{ file: 1, paragraphs: [] }]);
    const res2 = await handleGenerate(post(new File([empty], "pics.pptx")), okDeps());
    expect((await res2.json()).error.code).toBe("empty");
  });

  it("maps generator errors to their status and unknown errors to ai_unavailable", async () => {
    const { LessonError } = await import("./errors");
    const file = async () => new File([await pdfWithPages(1)], "a.pdf");
    const timeout = await handleGenerate(post(await file()), { hasKey: true, generate: vi.fn(async () => { throw new LessonError("timeout"); }) });
    expect(timeout.status).toBe(504);
    const boom = await handleGenerate(post(await file()), { hasKey: true, generate: vi.fn(async () => { throw new Error("boom"); }) });
    expect(boom.status).toBe(502);
    expect((await boom.json()).error).toEqual({ code: "ai_unavailable", message: "We couldn't reach the AI. Check the internet and try again." });
  });
});
```

Run → FAIL.

- [ ] **Step 2: `src/lib/file-kind.ts`**

```ts
import type { ErrorCode } from "./errors";

export type FileKind = "pdf" | "pptx";
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_SLIDES = 60;
export const ACCEPT = ".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation";

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

function startsAt(bytes: Uint8Array, magic: number[], at: number) {
  return magic.every((b, i) => bytes[at + i] === b);
}

/** Uses file bytes and the lowercase extension. MIME types are unreliable on Windows, so they are ignored. */
export function detectFileKind(name: string, head: Uint8Array): FileKind | null {
  const window = Math.min(head.length, 1024) - PDF_MAGIC.length;
  for (let i = 0; i <= window; i++) if (startsAt(head, PDF_MAGIC, i)) return "pdf";
  if (startsAt(head, ZIP_MAGIC, 0) && name.toLowerCase().endsWith(".pptx")) return "pptx";
  return null;
}

export async function precheckFile(file: File): Promise<ErrorCode | null> {
  if (file.size > MAX_FILE_BYTES) return "too_big";
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  return detectFileKind(file.name, head) ? null : "bad_type";
}
```

- [ ] **Step 3: `src/lib/lesson-prompt.ts`**

```ts
export const LESSON_SYSTEM_PROMPT = `You turn a teacher's lesson slides into a short self-study lesson and quiz for students around 14 years old.

How to write:
- Plain words and short sentences a 14-year-old reads easily. Explain a technical term the first time it appears.
- Stay faithful to the slides. Do not add facts the slides do not support. Fold title-only or image-only slides into a neighboring card.
- Write like a good teacher talking to one student: direct, warm and concrete. Use the slides' own examples when they exist.
- Never use em dashes, emojis, or the pattern "it's not X, it's Y". Do not open with filler such as "In this lesson we will".

Cards:
- One idea per card, ordered so each builds on the one before.
- Use between 4 and 15 cards. Choose the number from how much content the slides contain. Do not pad short decks or cram long ones.
- title: a short noun phrase of at most 8 words, never a question.
- explanation: 2 to 4 sentences.
- keyPoints: 2 to 4 short points, each under 15 words.
- rememberThis: the one sentence a student should still know next week.
- ids: "c1", "c2" and so on, in order.

Quiz:
- Between 5 and 10 multiple-choice questions covering the most important cards. ids: "q1", "q2" and so on.
- Each question tests exactly one card and names it in cardId.
- Exactly 4 options. One is clearly correct according to the cards; the other three are plausible mistakes a student might make, never jokes.
- Vary the position of the correct answer across questions.
- explanation: one sentence on why the correct answer is right.

title is the lesson topic, for example "Photosynthesis". subject is the school subject, for example "Biology".`;

export const LESSON_INSTRUCTION = "Create the lesson and quiz from these slides.";
```

- [ ] **Step 4: `src/lib/generate-lesson.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { LessonError } from "./errors";
import { lessonJsonSchema, type Lesson } from "./lesson-schema";
import { LESSON_INSTRUCTION, LESSON_SYSTEM_PROMPT } from "./lesson-prompt";
import { validateLesson } from "./validate-lesson";

export const LESSON_MODEL = "claude-opus-5-5";
export const DEADLINE_MS = 120_000;
export const MIN_RETRY_WINDOW_MS = 45_000;

export type Effort = "low" | "medium" | "high";
export type LessonSource = { kind: "pdf"; base64: string } | { kind: "text"; text: string };
export type ModelReply = { stop_reason: string | null; content: { type: string; text?: string }[] };

export function parseEffort(value: string | undefined): Effort {
  const v = value?.toLowerCase();
  return v === "low" || v === "high" ? v : "medium";
}

export function buildLessonRequest(source: LessonSource, effort: Effort) {
  const content =
    source.kind === "pdf"
      ? [
          { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: source.base64 } },
          { type: "text" as const, text: LESSON_INSTRUCTION },
        ]
      : [{ type: "text" as const, text: `<slides>\n${source.text}\n</slides>\n\n${LESSON_INSTRUCTION}` }];
  return {
    model: LESSON_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default" as const,
    system: LESSON_SYSTEM_PROMPT,
    output_config: { effort, format: { type: "json_schema" as const, schema: lessonJsonSchema() } },
    messages: [{ role: "user" as const, content }],
  };
}

export type LessonRequest = ReturnType<typeof buildLessonRequest>;
export type CreateMessage = (params: LessonRequest, options: { signal: AbortSignal }) => Promise<ModelReply>;
export type GenerateOptions = { createMessage: CreateMessage; effort?: Effort; now?: () => number };

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function callWithDeadline(createMessage: CreateMessage, request: LessonRequest, ms: number): Promise<ModelReply> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await createMessage(request, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new LessonError("timeout");
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      throw new LessonError("no_key");
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Claude API error:", error.status, error.message);
      throw new LessonError("ai_unavailable");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateLesson(
  source: LessonSource,
  { createMessage, effort = "medium", now = Date.now }: GenerateOptions,
): Promise<Lesson> {
  const deadline = now() + DEADLINE_MS;
  const request = buildLessonRequest(source, effort);
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - now();
    if (attempt > 0 && remaining < MIN_RETRY_WINDOW_MS) break;
    const reply = await callWithDeadline(createMessage, request, remaining);
    if (reply.stop_reason === "refusal") throw new LessonError("refused");
    if (reply.stop_reason === "max_tokens") continue;
    const text = reply.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    const result = validateLesson(parseJson(text));
    if (result.ok) return result.lesson;
    console.warn("Lesson failed validation:", result.problems.slice(0, 5));
  }
  throw new LessonError("invalid_output");
}
```

- [ ] **Step 5: `src/lib/anthropic-client.ts`** (thin adapter; check the SDK's beta `messages.create` types for `fallbacks` and `output_config`. If the installed SDK version does not type `fallbacks: "default"`, cast the params object once here, with a one-line comment saying why.)

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { CreateMessage } from "./generate-lesson";

export function makeCreateMessage(apiKey: string): CreateMessage {
  const client = new Anthropic({ apiKey, maxRetries: 2 });
  return (params, { signal }) => client.beta.messages.create(params, { signal });
}
```

- [ ] **Step 6: `src/lib/handle-generate.ts`**

```ts
import { PDFDocument } from "pdf-lib";
import { ERROR_MESSAGES, ERROR_STATUS, LessonError } from "./errors";
import { extractPptx, hasReadableText, slidesToPrompt } from "./extract-pptx";
import { detectFileKind, MAX_FILE_BYTES, MAX_SLIDES } from "./file-kind";
import type { LessonSource } from "./generate-lesson";
import type { Lesson } from "./lesson-schema";

export type HandlerDeps = { hasKey: boolean; generate: (source: LessonSource) => Promise<Lesson> };
type Prepared = { source: LessonSource; slideCount: number };

async function readPdf(bytes: Uint8Array): Promise<Prepared> {
  let slideCount: number;
  try {
    slideCount = (await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })).getPageCount();
  } catch {
    throw new LessonError("bad_type");
  }
  if (slideCount > MAX_SLIDES) throw new LessonError("too_many_slides");
  return { slideCount, source: { kind: "pdf", base64: Buffer.from(bytes).toString("base64") } };
}

async function readPptx(bytes: Uint8Array): Promise<Prepared> {
  const slides = await extractPptx(bytes).catch(() => {
    throw new LessonError("bad_type");
  });
  if (slides.length === 0) throw new LessonError("bad_type");
  if (slides.length > MAX_SLIDES) throw new LessonError("too_many_slides");
  if (!hasReadableText(slides)) throw new LessonError("empty");
  return { slideCount: slides.length, source: { kind: "text", text: slidesToPrompt(slides) } };
}

export async function handleGenerate(request: Request, deps: HandlerDeps): Promise<Response> {
  try {
    if (!deps.hasKey) throw new LessonError("no_key");
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new LessonError("bad_type");
    if (file.size > MAX_FILE_BYTES) throw new LessonError("too_big");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = detectFileKind(file.name, bytes.subarray(0, 1024));
    if (!kind) throw new LessonError("bad_type");
    const { source, slideCount } = kind === "pdf" ? await readPdf(bytes) : await readPptx(bytes);
    const lesson = await deps.generate(source);
    return Response.json({ lesson, slideCount });
  } catch (error) {
    if (!(error instanceof LessonError)) console.error("Unexpected generate error:", error);
    const code = error instanceof LessonError ? error.code : "ai_unavailable";
    return Response.json({ error: { code, message: ERROR_MESSAGES[code] } }, { status: ERROR_STATUS[code] });
  }
}
```

- [ ] **Step 7: `src/app/api/generate/route.ts`**

```ts
import { makeCreateMessage } from "@/lib/anthropic-client";
import { generateLesson, parseEffort } from "@/lib/generate-lesson";
import { handleGenerate } from "@/lib/handle-generate";

export const runtime = "nodejs";
export const maxDuration = 150;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const effort = parseEffort(process.env.LESSON_EFFORT);
  return handleGenerate(request, {
    hasKey: apiKey.length > 0,
    generate: (source) => generateLesson(source, { createMessage: makeCreateMessage(apiKey), effort }),
  });
}
```

- [ ] **Step 8: Run** `npx vitest run src/lib` → PASS; `npx tsc --noEmit` → no errors. **Commit** `git add -A && git commit -m "feat: generate lessons with Claude via /api/generate"`

---

### Task 7: Sample lessons (demo mode data)

**Files:**
- Create: `src/demo/photosynthesis.json`, `src/demo/ww1-causes.json`, `src/demo/index.ts`
- Test: `src/demo/demos.test.ts`

**Interfaces:**
- Consumes: `validateLesson`, `Lesson` (Task 2); `weakCardIndex` (Task 4).
- Produces: `DemoLesson = { slug: string; label: string; slideCount: number; source: "ai" | "placeholder"; lesson: Lesson }`, `DEMOS: DemoLesson[]`, `DEFAULT_DEMO_SLUG = "photosynthesis"`, `getDemo(slug): DemoLesson | undefined`.

JSON file shape: `{ "source": "placeholder", "slideCount": 18, "lesson": { title, subject, cards, quiz } }`.

Content requirements (hand-authored placeholders until `npm run make-demos` replaces them with real AI output):
- **Photosynthesis** (Biology): 8 cards, 6 questions, `slideCount` 18. Cards in order: What photosynthesis is; What plants take in; Chlorophyll and chloroplasts; Light-dependent reactions ("Light reactions" as the title so the video's teacher insight reads well); The Calvin cycle; What plants make; Why it matters for life on Earth; Things that change the speed. Question correct answers spread across positions 0 to 3.
- **Causes of World War I** (History): 7 cards, 6 questions, `slideCount` 14. Cards: Europe in 1914; Militarism; Alliances; Imperialism; Nationalism; The assassination in Sarajevo; How one shot became a world war.
- Follow every prompt rule from `lesson-prompt.ts`: plain words for a 14-year-old, 2 to 4 sentence explanations, 2 to 4 key points under 15 words, noun-phrase titles, no em dashes, no emojis.

- [ ] **Step 1: Failing test** `src/demo/demos.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_DEMO_SLUG, DEMOS, getDemo } from "./index";
import { validateLesson } from "@/lib/validate-lesson";

describe("demo lessons", () => {
  it("has the default sample", () => {
    expect(getDemo(DEFAULT_DEMO_SLUG)?.lesson.title).toBe("Photosynthesis");
    expect(DEMOS.map((d) => d.slug)).toEqual(["photosynthesis", "ww1-causes"]);
  });

  for (const demo of DEMOS) {
    it(`${demo.slug} passes validation unchanged (already sanitized)`, () => {
      const result = validateLesson(demo.lesson);
      expect(result.ok, result.ok ? "" : result.problems.join("; ")).toBe(true);
      if (result.ok) expect(result.lesson).toEqual(demo.lesson);
    });

    it(`${demo.slug} spreads correct answers across at least 3 positions`, () => {
      expect(new Set(demo.lesson.quiz.map((q) => q.correctIndex)).size).toBeGreaterThanOrEqual(3);
    });
  }
});
```

Run → FAIL.

- [ ] **Step 2: Write both JSON files** following the content requirements above.

- [ ] **Step 3: `src/demo/index.ts`**

```ts
import type { Lesson } from "@/lib/lesson-schema";
import photosynthesis from "./photosynthesis.json";
import ww1Causes from "./ww1-causes.json";

export type DemoLesson = { slug: string; label: string; slideCount: number; source: "ai" | "placeholder"; lesson: Lesson };

type DemoFile = { source: string; slideCount: number; lesson: Lesson };
const make = (slug: string, label: string, file: DemoFile): DemoLesson => ({
  slug,
  label,
  slideCount: file.slideCount,
  source: file.source === "ai" ? "ai" : "placeholder",
  lesson: file.lesson,
});

export const DEMOS: DemoLesson[] = [
  make("photosynthesis", "Photosynthesis · Biology", photosynthesis as DemoFile),
  make("ww1-causes", "Causes of World War I · History", ww1Causes as DemoFile),
];

export const DEFAULT_DEMO_SLUG = "photosynthesis";

export function getDemo(slug: string): DemoLesson | undefined {
  return DEMOS.find((d) => d.slug === slug);
}
```

- [ ] **Step 4: Run** → PASS. **Commit** `git add -A && git commit -m "feat: sample lessons for demo mode"`

---

### Task 8: Lesson state, persistence and route params

**Files:**
- Create: `src/lib/lesson-state.ts`, `src/lib/pages.ts`, `src/lib/lesson-store.tsx`, `src/app/providers.tsx`
- Modify: `src/app/layout.tsx` (wrap children in `<Providers>`)
- Test: `src/lib/lesson-state.test.ts`, `src/lib/pages.test.ts`

**Interfaces:**
- Consumes: `Lesson`, `LessonSchema` (Task 2); `Answers`, `scoreQuiz` (Task 3).
- Produces:
  - `LessonState = { lesson: Lesson; slideCount: number; origin: "ai" | "demo"; answers: Answers; activeQuestionIds: string[] }`, `STORAGE_KEY = "slidekick:v1"`, `newLessonState(lesson, slideCount, origin)`, `serializeState(state): string`, `parseStoredState(raw: string | null): LessonState | null`, `answerQuestion(state, questionId, optionIndex): LessonState`, `startRetry(state): LessonState`, `activeQuestions(state): Question[]`.
  - `parsePageParam(raw: string | string[] | undefined, total: number): number | null`.
  - `useLessonStore(): { ready: boolean; state: LessonState | null; setLesson(lesson, slideCount, origin): void; answer(questionId, optionIndex): void; retryMissed(): void; clear(): void }`, `LessonProvider`.

- [ ] **Step 1: Failing tests** `src/lib/lesson-state.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { activeQuestions, answerQuestion, newLessonState, parseStoredState, serializeState, startRetry } from "./lesson-state";
import { makeLesson } from "./test-fixtures";

const fresh = () => newLessonState(makeLesson(), 12, "demo");

describe("lesson state", () => {
  it("starts with every question active and no answers", () => {
    const s = fresh();
    expect(s.answers).toEqual({});
    expect(s.activeQuestionIds).toEqual(["q1", "q2", "q3", "q4", "q5"]);
  });

  it("round-trips through storage so a refresh keeps answers (Review Focus 4)", () => {
    const s = answerQuestion(answerQuestion(fresh(), "q1", 0), "q2", 3);
    expect(parseStoredState(serializeState(s))).toEqual(s);
  });

  it("returns null for missing, corrupt or invalid stored data (Review Focus 3)", () => {
    expect(parseStoredState(null)).toBeNull();
    expect(parseStoredState("{oops")).toBeNull();
    expect(parseStoredState(JSON.stringify({ version: 1, lesson: { title: 1 } }))).toBeNull();
  });

  it("drops answers and active ids that do not belong to the lesson", () => {
    const raw = JSON.parse(serializeState(fresh()));
    raw.answers = { q1: 2, ghost: 1, q2: "x" };
    raw.activeQuestionIds = ["ghost"];
    const parsed = parseStoredState(JSON.stringify(raw))!;
    expect(parsed.answers).toEqual({ q1: 2 });
    expect(parsed.activeQuestionIds).toEqual(["q1", "q2", "q3", "q4", "q5"]);
  });

  it("ignores answers to questions that are not active or out of range", () => {
    const s = fresh();
    expect(answerQuestion(s, "q1", 7)).toBe(s);
    expect(answerQuestion(s, "ghost", 0)).toBe(s);
  });

  it("retry keeps correct answers, clears missed ones and activates only the missed", () => {
    let s = fresh();
    for (const [id, pick] of [["q1", 0], ["q2", 1], ["q3", 0], ["q4", 2], ["q5", 0]] as const) s = answerQuestion(s, id, pick);
    const retry = startRetry(s);
    expect(retry.activeQuestionIds).toEqual(["q2", "q4"]);
    expect(retry.answers).toEqual({ q1: 0, q3: 0, q5: 0 });
    expect(activeQuestions(retry).map((q) => q.id)).toEqual(["q2", "q4"]);
  });
});
```

`src/lib/pages.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { parsePageParam } from "./pages";

describe("parsePageParam (Review Focus 3)", () => {
  it("accepts whole numbers in range", () => {
    expect(parsePageParam("1", 8)).toBe(1);
    expect(parsePageParam("8", 8)).toBe(8);
  });
  it("rejects everything else", () => {
    for (const raw of ["0", "9", "-1", "2.5", "abc", "", undefined, ["1", "2"]]) {
      expect(parsePageParam(raw as string | string[] | undefined, 8)).toBeNull();
    }
  });
});
```

Run → FAIL.

- [ ] **Step 2: `src/lib/lesson-state.ts`**

```ts
import { LessonSchema, type Lesson, type Question } from "./lesson-schema";
import { scoreQuiz, type Answers } from "./scoring";

export const STORAGE_KEY = "slidekick:v1";

export type LessonOrigin = "ai" | "demo";
export type LessonState = {
  lesson: Lesson;
  slideCount: number;
  origin: LessonOrigin;
  answers: Answers;
  activeQuestionIds: string[];
};

export function newLessonState(lesson: Lesson, slideCount: number, origin: LessonOrigin): LessonState {
  return { lesson, slideCount, origin, answers: {}, activeQuestionIds: lesson.quiz.map((q) => q.id) };
}

export function serializeState(state: LessonState): string {
  return JSON.stringify({ version: 1, ...state });
}

export function parseStoredState(raw: string | null): LessonState | null {
  if (!raw) return null;
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || data.version !== 1) return null;
  const lesson = LessonSchema.safeParse(data.lesson);
  if (!lesson.success) return null;
  const ids = new Set(lesson.data.quiz.map((q) => q.id));

  const answers: Answers = {};
  if (data.answers && typeof data.answers === "object") {
    for (const [id, value] of Object.entries(data.answers as Record<string, unknown>)) {
      if (ids.has(id) && Number.isInteger(value)) answers[id] = value as number;
    }
  }
  const active = Array.isArray(data.activeQuestionIds)
    ? data.activeQuestionIds.filter((id): id is string => typeof id === "string" && ids.has(id))
    : [];

  return {
    lesson: lesson.data,
    slideCount: typeof data.slideCount === "number" ? data.slideCount : lesson.data.cards.length,
    origin: data.origin === "ai" ? "ai" : "demo",
    answers,
    activeQuestionIds: active.length ? active : [...ids],
  };
}

export function activeQuestions(state: LessonState): Question[] {
  return state.activeQuestionIds
    .map((id) => state.lesson.quiz.find((q) => q.id === id))
    .filter((q): q is Question => q !== undefined);
}

export function answerQuestion(state: LessonState, questionId: string, optionIndex: number): LessonState {
  const question = activeQuestions(state).find((q) => q.id === questionId);
  if (!question || optionIndex < 0 || optionIndex >= question.options.length) return state;
  return { ...state, answers: { ...state.answers, [questionId]: optionIndex } };
}

export function startRetry(state: LessonState): LessonState {
  const missed = scoreQuiz(state.lesson.quiz, state.answers).missed.map((q) => q.id);
  const answers = Object.fromEntries(Object.entries(state.answers).filter(([id]) => !missed.includes(id)));
  return { ...state, answers, activeQuestionIds: missed };
}
```

- [ ] **Step 3: `src/lib/pages.ts`**

```ts
export function parsePageParam(raw: string | string[] | undefined, total: number): number | null {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= total ? n : null;
}
```

- [ ] **Step 4: Run** → PASS.

- [ ] **Step 5: `src/lib/lesson-store.tsx`** (client context; loads from `sessionStorage` after mount, writes on every change; storage errors are ignored so private windows still work)

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Lesson } from "./lesson-schema";
import {
  answerQuestion, newLessonState, parseStoredState, serializeState, startRetry,
  STORAGE_KEY, type LessonOrigin, type LessonState,
} from "./lesson-state";

type Store = {
  ready: boolean;
  state: LessonState | null;
  setLesson: (lesson: Lesson, slideCount: number, origin: LessonOrigin) => void;
  answer: (questionId: string, optionIndex: number) => void;
  retryMissed: () => void;
  clear: () => void;
};

const LessonContext = createContext<Store | null>(null);

function save(state: LessonState | null) {
  try {
    if (state) sessionStorage.setItem(STORAGE_KEY, serializeState(state));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode). The lesson still works for this page view.
  }
}

export function LessonProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LessonState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(STORAGE_KEY);
    } catch {}
    setState(parseStoredState(stored));
    setReady(true);
  }, []);

  const update = useCallback((next: (prev: LessonState | null) => LessonState | null) => {
    setState((prev) => {
      const value = next(prev);
      save(value);
      return value;
    });
  }, []);

  const store = useMemo<Store>(
    () => ({
      ready,
      state,
      setLesson: (lesson, slideCount, origin) => update(() => newLessonState(lesson, slideCount, origin)),
      answer: (id, index) => update((prev) => (prev ? answerQuestion(prev, id, index) : prev)),
      retryMissed: () => update((prev) => (prev ? startRetry(prev) : prev)),
      clear: () => update(() => null),
    }),
    [ready, state, update],
  );

  return <LessonContext.Provider value={store}>{children}</LessonContext.Provider>;
}

export function useLessonStore(): Store {
  const store = useContext(LessonContext);
  if (!store) throw new Error("useLessonStore must be used inside LessonProvider");
  return store;
}
```

`src/app/providers.tsx`: `"use client"; export function Providers({ children }) { return <LessonProvider>{children}</LessonProvider>; }` and wrap `{children}` in `layout.tsx`.

- [ ] **Step 6: Run** `npm test` and `npx tsc --noEmit` → PASS. **Commit** `git add -A && git commit -m "feat: lesson state with sessionStorage persistence"`

---

### Task 9: Pure display components and the highlighter swipe

Before writing UI: invoke `frontend-design:frontend-design` and `modern-web-guidance:modern-web-guidance` (for reduced motion, focus styles, `dvh`, view transitions decisions), and apply the Global Constraints.

**Files:**
- Create: `src/components/HighlightSwipe.tsx`, `src/components/Icons.tsx`, `src/components/Wordmark.tsx`, `src/components/LessonPageView.tsx`, `src/components/QuizQuestionView.tsx`, `src/components/ScoreView.tsx`, `src/components/MasteryBars.tsx`, `src/components/LessonSkeleton.tsx`, `src/components/ProgressBar.tsx`, `src/components/StatsLine.tsx`, `src/components/Button.tsx`
- Test: `src/components/components.test.tsx` (jsdom)

**Interfaces (all pure: props in, markup out; no hooks that read time, storage, routing or network):**

```ts
HighlightSwipe(props: { progress: number; children: React.ReactNode; className?: string })
// Inline span; an SVG marker stroke behind the text, revealed left to right by clip-path inset(0 (1-progress)*100% 0 0).
// The stroke path has uneven top and bottom edges and slight tilt; fill = var(--color-highlight); preserveAspectRatio="none".

Icons: SpeakerIcon, StopIcon, ArrowLeftIcon, ArrowRightIcon, CloseIcon — props { className?: string; title?: string }
// 24x24 viewBox, stroke currentColor, strokeWidth 2, round caps, slightly hand-drawn paths (not a stock set).

Wordmark(props: { highlightProgress?: number; size?: "sm" | "lg" })
// BRAND.name in Literata, with HighlightSwipe behind the last 4 letters ("kick").

LessonPageView(props: { card: Card; pageNumber: number; totalPages: number; highlightProgress: number })
// Layout: page number padded to 2 digits ("03") in large Literata, ink-soft; "of 08" small beside it;
// h1 title (Literata); explanation paragraph (Literata, ~1.25rem, 1.6 line-height, max-w 62ch);
// key points as an ordered list with small ink-soft numerals (no checkmarks);
// "Remember this" small caps label then the rememberThis sentence wrapped in HighlightSwipe.

QuizQuestionView(props: { question: Question; number: number; total: number; selectedIndex: number | null;
  revealed: boolean; onSelect?: (index: number) => void })
// Question text in Literata. 4 options as full-width buttons labeled with "1".."4" key hints.
// data-state on each option: "idle" | "selected" | "right" | "wrong" | "dim".
// When revealed: correct option -> "right" (bg right, white text); selected wrong -> "wrong" (bg wrong, white text); others "dim".
// Buttons disabled after reveal. Explanation line appears when revealed, prefixed "Right." or "Not quite."

ScoreView(props: { correct: number; total: number; shown: number; verdict: string })
// "shown" is the animated count (0..correct). Big Literata numerals "5 / 6", verdict below.

MasteryBars(props: { topics: TopicMastery[]; grow: number; highlightCardId?: string })
// Rows: page number, title, bar (width = percent * grow), percent. Bar color ink; the highlighted (weak) row uses wrong.
// Max 4 visual columns. No borders; rows separated by spacing.

LessonSkeleton(props: { filled: number; rows: number; title?: string; lines: string[]; activeLine: number })
// Title bar + `rows` page-row placeholders (paper-raised blocks with soft pulse via CSS opacity, disabled for reduced motion);
// the first `filled` rows render as solid ink-soft lines. Status lines below: past lines ink-soft, the active line ink with a highlight swipe at progress 1.

ProgressBar(props: { value: number })   // 0..1, 4px, ink on rule, role="progressbar" with aria-valuenow 0..100
StatsLine(props: { minutes: number; pages: number; questions: number })   // "≈ 9 min · 8 pages · 6 questions"
Button(props: React.ButtonHTMLAttributes & { variant?: "primary" | "quiet" }) // primary: bg ink, text paper, radius 4px; hover: bg #2a3348 (instant); quiet: underline text button
```

- [ ] **Step 1: Failing tests** `src/components/components.test.tsx`

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LessonPageView } from "./LessonPageView";
import { QuizQuestionView } from "./QuizQuestionView";
import { StatsLine } from "./StatsLine";
import { makeLesson } from "@/lib/test-fixtures";

const lesson = makeLesson();

describe("LessonPageView", () => {
  it("shows a padded page number, title and the remember line", () => {
    render(<LessonPageView card={lesson.cards[2]} pageNumber={3} totalPages={5} highlightProgress={1} />);
    expect(screen.getByText("03")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Topic 3");
    expect(screen.getByText("Remember topic 3.")).toBeTruthy();
  });
});

describe("QuizQuestionView", () => {
  const q = lesson.quiz[0];

  it("calls onSelect with the option index", () => {
    const onSelect = vi.fn();
    render(<QuizQuestionView question={q} number={1} total={5} selectedIndex={null} revealed={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Wrong A1/ }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("marks right and wrong after reveal and disables options", () => {
    render(<QuizQuestionView question={q} number={1} total={5} selectedIndex={1} revealed onSelect={vi.fn()} />);
    const right = screen.getByRole("button", { name: /Right 1/ });
    const wrong = screen.getByRole("button", { name: /Wrong A1/ });
    expect(right.getAttribute("data-state")).toBe("right");
    expect(wrong.getAttribute("data-state")).toBe("wrong");
    expect((wrong as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Not quite\./)).toBeTruthy();
  });
});

describe("StatsLine", () => {
  it("formats the lesson stats", () => {
    render(<StatsLine minutes={9} pages={8} questions={6} />);
    expect(screen.getByText("≈ 9 min · 8 pages · 6 questions")).toBeTruthy();
  });
});
```

Run → FAIL.

- [ ] **Step 2: Implement the components** per the interface notes above. Key pieces:

```tsx
// src/components/HighlightSwipe.tsx
export function HighlightSwipe({ progress, children, className = "" }: { progress: number; children: React.ReactNode; className?: string }) {
  const p = Math.min(1, Math.max(0, progress));
  return (
    <span className={`relative inline isolate ${className}`}>
      <svg aria-hidden viewBox="0 0 200 40" preserveAspectRatio="none"
        className="pointer-events-none absolute -inset-x-[0.2em] top-[0.1em] -z-10 h-[1.15em] w-[calc(100%+0.4em)]"
        style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}>
        <path d="M3 9 C40 4 90 7 130 5 S190 6 197 8 L196 31 C160 35 120 32 80 34 S20 33 4 30 Z" fill="var(--color-highlight)" opacity="0.85" />
      </svg>
      {children}
    </span>
  );
}
```

Note: `inline` spans that wrap across lines get one swipe across the bounding box; for multi-line remember lines, render the swipe with `box-decoration-break: clone` on a background instead. Implement as: wrap text in `<span style={{ backgroundImage: "url(data:image/svg+xml;...)", backgroundSize: `${p*100}% 70%`, backgroundRepeat: "no-repeat", backgroundPosition: "0 85%", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>` using the same path encoded as a data URI. Choose the background approach so it works on wrapped lines; keep the `progress` prop contract.

```tsx
// src/components/StatsLine.tsx
export function StatsLine({ minutes, pages, questions }: { minutes: number; pages: number; questions: number }) {
  return <p className="text-ink-soft">{`≈ ${minutes} min · ${pages} pages · ${questions} questions`}</p>;
}
```

- [ ] **Step 3: Run** `npx vitest run src/components` → PASS. **Commit** `git add -A && git commit -m "feat: pure display components and highlighter swipe"`

---

### Task 10: Upload screen, generating state, errors and demo shortcuts (route `/`)

**Files:**
- Create: `src/app-components/upload-state.ts`, `src/app-components/UploadScreen.tsx`, `src/app-components/SiteHeader.tsx`, `src/app-components/useKey.ts`, `src/app-components/useAnimatedValue.ts`
- Modify: `src/app/page.tsx`
- Test: `src/app-components/upload-state.test.ts`

**Interfaces:**
- Consumes: `precheckFile`, `ACCEPT` (Task 6); `ERROR_MESSAGES`, `isErrorCode`, `ErrorCode` (Task 2); `DEMOS`, `getDemo`, `DEFAULT_DEMO_SLUG` (Task 7); `useLessonStore` (Task 8); `LessonSkeleton`, `Wordmark`, `Button`, `HighlightSwipe` (Task 9); `BRAND`.
- Produces:
  - `UploadState = { phase: "idle" } | { phase: "generating"; mode: "ai" | "demo"; fileName: string } | { phase: "error"; code: ErrorCode }`; `UploadEvent = { type: "start"; mode: "ai" | "demo"; fileName: string } | { type: "fail"; code: ErrorCode } | { type: "reset" }`; `uploadReducer(state, event): UploadState`.
  - `useKey(key: string, handler: () => void, enabled?: boolean)`: ignores events with modifier keys or from inputs/textareas/contenteditable.
  - `useAnimatedValue(target: number, durationMs: number, delayMs?: number): number`: animates 0→target with Motion's `animate`, returns target immediately under reduced motion.
  - `SiteHeader(props: { right?: React.ReactNode })`: Wordmark linking to `/` on the left.

- [ ] **Step 1: Failing test** `src/app-components/upload-state.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { uploadReducer, type UploadState } from "./upload-state";

describe("uploadReducer (Review Focus 5)", () => {
  const idle: UploadState = { phase: "idle" };

  it("starts generating from idle and from error", () => {
    expect(uploadReducer(idle, { type: "start", mode: "ai", fileName: "a.pdf" })).toEqual({ phase: "generating", mode: "ai", fileName: "a.pdf" });
    expect(uploadReducer({ phase: "error", code: "timeout" }, { type: "start", mode: "demo", fileName: "x" }).phase).toBe("generating");
  });

  it("ignores a second start while generating", () => {
    const busy = uploadReducer(idle, { type: "start", mode: "ai", fileName: "a.pdf" });
    expect(uploadReducer(busy, { type: "start", mode: "demo", fileName: "b" })).toBe(busy);
  });

  it("fails and resets", () => {
    const busy = uploadReducer(idle, { type: "start", mode: "ai", fileName: "a.pdf" });
    expect(uploadReducer(busy, { type: "fail", code: "no_key" })).toEqual({ phase: "error", code: "no_key" });
    expect(uploadReducer({ phase: "error", code: "no_key" }, { type: "reset" })).toEqual(idle);
  });
});
```

Run → FAIL.

- [ ] **Step 2: `src/app-components/upload-state.ts`**

```ts
import type { ErrorCode } from "@/lib/errors";

export type UploadMode = "ai" | "demo";
export type UploadState =
  | { phase: "idle" }
  | { phase: "generating"; mode: UploadMode; fileName: string }
  | { phase: "error"; code: ErrorCode };
export type UploadEvent =
  | { type: "start"; mode: UploadMode; fileName: string }
  | { type: "fail"; code: ErrorCode }
  | { type: "reset" };

export function uploadReducer(state: UploadState, event: UploadEvent): UploadState {
  switch (event.type) {
    case "start":
      return state.phase === "generating" ? state : { phase: "generating", mode: event.mode, fileName: event.fileName };
    case "fail":
      return { phase: "error", code: event.code };
    case "reset":
      return { phase: "idle" };
  }
}
```

Run → PASS.

- [ ] **Step 3: `UploadScreen.tsx` behavior**
  - `useReducer(uploadReducer, { phase: "idle" })`.
  - **Idle layout** (above the fold on a 1366×768 laptop and on a 390px phone): `SiteHeader`; h1 headline (Literata, clamp(2.4rem, 5vw, 4.2rem), max-w 18ch) with "actually remembers" wrapped in `HighlightSwipe` animated to 1 on load; sub-headline (max-w 56ch, ink-soft); primary `Button` "Upload your slides" that clicks a hidden `<input type="file" accept={ACCEPT}>`; quiet button "or try a sample lesson" that toggles an inline list of `DEMOS` (each a quiet button with its label); doubt-reducer line "PDF or PowerPoint · Ready in under a minute · We don't keep your slides" in small ink-soft text. Right side on wide screens: a real sample page rendered with `LessonPageView` for the default demo's 4th card at reduced scale, slightly rotated (-1.5deg) on `paper-raised`, as the hero image showing the actual product.
  - **Drag and drop:** `dragenter/over` on the whole `<main>` shows a full-screen paper overlay "Drop your slides" (no dashed-border box); `drop` takes the first file.
  - **startFile(file):** dispatch start (ignored if busy); `const code = await precheckFile(file)`; if code → fail; else `fetch("/api/generate", { method: "POST", body: formData })`; parse JSON; on `!res.ok` dispatch fail with `isErrorCode(body?.error?.code) ? code : "ai_unavailable"`; on network error → fail `ai_unavailable`; on success `setLesson(body.lesson, body.slideCount, "ai")` then `router.push("/lesson")`.
  - **startDemo(slug):** dispatch start with mode "demo"; after 5000ms (`setTimeout`, cleared on unmount) `setLesson(demo.lesson, demo.slideCount, "demo")` and `router.push("/lesson")`.
  - `useKey("d", () => startDemo(DEFAULT_DEMO_SLUG), state.phase !== "generating")`.
  - **Generating view:** replaces the hero; shows file name, `LessonSkeleton` with `rows = 8`, lines `["Reading your slides", "Finding the key ideas", "Writing the lesson pages", "Writing your quiz"]`; `activeLine` advances every 1.2s in demo mode and every 7s in AI mode (stays on the last line until the request ends); `filled` rows grow with `activeLine`. Use `aria-live="polite"` on the status line.
  - **Error view:** message from `ERROR_MESSAGES[code]` in Literata, primary `Button` "Try the sample lesson" (starts the default demo), quiet button "Try another file" (reset).

- [ ] **Step 4: `src/app/page.tsx`** renders `<UploadScreen />`.

- [ ] **Step 5: Verify manually** with `npm run dev`:
  - Without `.env.local`: upload any PDF and see the `no_key` message plus a working "Try the sample lesson".
  - Upload a `.txt` file: see the bad_type message without a network call (check the Network tab).
  - Press `D`: see the 5s generating view, then land on `/lesson` (a 404 until Task 11 is fine).
  - Press `D` twice quickly: there's only one transition.
  - Check the layout at 390px width: no horizontal scroll.

- [ ] **Step 6: Commit** `git add -A && git commit -m "feat: upload screen with generating state, errors and demo mode"`

---

### Task 11: Lesson overview and lesson pages (routes `/lesson`, `/lesson/[n]`)

**Files:**
- Create: `src/app-components/useRequiredLesson.ts`, `src/app-components/ReadAloudButton.tsx`, `src/lib/speech.ts`, `src/app/lesson/page.tsx`, `src/app/lesson/[n]/page.tsx`, `src/app-components/LessonPageScreen.tsx`
- Test: `src/lib/speech.test.ts`

**Interfaces:**
- Consumes: `useLessonStore` (Task 8), `parsePageParam` (Task 8), `estimateMinutes` (Task 3), `LessonPageView`, `StatsLine`, `ProgressBar`, `Button`, Icons (Task 9), `useKey`, `useAnimatedValue`, `SiteHeader` (Task 10).
- Produces:
  - `useRequiredLesson(): LessonState | null`: returns null until `ready`; if ready and no state, `router.replace("/")`.
  - `pickVoice(voices: Pick<SpeechSynthesisVoice, "name" | "lang">[]): number` (index or -1), `speak(text, onEnd)`, `stopSpeaking()`, `canSpeak()`.
  - `cardSpeechText(card: Card): string`.

- [ ] **Step 1: Failing test** `src/lib/speech.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { cardSpeechText, pickVoice } from "./speech";
import { makeLesson } from "./test-fixtures";

describe("pickVoice", () => {
  it("prefers natural-sounding English voices, then any English voice", () => {
    const voices = [
      { name: "Microsoft Hedda", lang: "de-DE" },
      { name: "Microsoft David", lang: "en-US" },
      { name: "Microsoft Aria Online (Natural)", lang: "en-US" },
    ];
    expect(pickVoice(voices)).toBe(2);
    expect(pickVoice(voices.slice(0, 2))).toBe(1);
    expect(pickVoice([{ name: "Hedda", lang: "de-DE" }])).toBe(-1);
  });
});

describe("cardSpeechText", () => {
  it("reads title, explanation, key points and the remember line in order", () => {
    const card = makeLesson().cards[0];
    expect(cardSpeechText(card)).toBe(
      "Topic 1. This is the explanation for topic 1. It has two sentences. Point A1. Point B1. Remember this: Remember topic 1.",
    );
  });
});
```

- [ ] **Step 2: `src/lib/speech.ts`**

```ts
import type { Card } from "./lesson-schema";

const PREFERRED = /natural|neural|google|aria|jenny|guy|samantha|daniel/i;
const end = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

export function pickVoice(voices: Pick<SpeechSynthesisVoice, "name" | "lang">[]): number {
  const english = voices.map((v, i) => ({ v, i })).filter(({ v }) => v.lang.toLowerCase().startsWith("en"));
  return (english.find(({ v }) => PREFERRED.test(v.name)) ?? english[0])?.i ?? -1;
}

export function cardSpeechText(card: Card): string {
  return [end(card.title), card.explanation, ...card.keyPoints.map(end), `Remember this: ${card.rememberThis}`].join(" ");
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

export function speak(text: string, onEnd: () => void): void {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const index = pickVoice(voices);
  if (index >= 0) utterance.voice = voices[index];
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  synth.speak(utterance);
}
```

Run → PASS.

- [ ] **Step 3: `/lesson` overview.** Uses `useRequiredLesson`. Shows subject (small caps, ink-soft), h1 title (Literata, large), `StatsLine` with `estimateMinutes`, an ordered list of page titles with 2-digit numerals as the "path" (each a link to `/lesson/n`), and a primary link-button "Start lesson" → `/lesson/1`. If `origin === "demo"` show a small ink-soft note "Sample lesson" next to the subject.

- [ ] **Step 4: `/lesson/[n]`.** Wrap the client screen in `<Suspense>` (it reads `useSearchParams`).
  - `parsePageParam(params.n, cards.length)`; if null → `router.replace("/lesson/1")` (Review Focus 3).
  - `review = searchParams.get("review") === "1"`.
  - Layout: `SiteHeader` with `ProgressBar value={n / total}` under it; `LessonPageView` with `highlightProgress = useAnimatedValue(1, 650, 250)` keyed by page number so it replays per page; page enters with Motion fade + 12px slide (200ms, ease-out), direction based on navigation.
  - Controls: `ReadAloudButton` (hidden if `!canSpeak()`; toggles speak/stop; stops on page change and unmount); in normal mode: "Back" (quiet, hidden on page 1) and primary "Next page" (on the last page: "Finish lesson" → `/quiz`); keys ArrowLeft/ArrowRight do the same; touch swipe left/right (pointer events, 60px threshold).
  - Review mode: no back/next; one primary button "Back to results" → `/results`; label above title "Review" in small caps.

- [ ] **Step 5: Verify manually** by pressing `D` and stepping through all pages with the arrows. Check:
  - the swipe replays on each page
  - read-aloud speaks and stops when you change page
  - `/lesson/99` redirects to `/lesson/1`
  - a new tab at `/lesson/2` redirects to `/`

- [ ] **Step 6: Commit** `git add -A && git commit -m "feat: lesson overview and page-by-page lesson with read-aloud"`

---

### Task 12: Quiz, results, review and retry (routes `/quiz`, `/results`)

**Files:**
- Create: `src/app/quiz/page.tsx`, `src/app-components/QuizScreen.tsx`, `src/app/results/page.tsx`, `src/app-components/ResultsScreen.tsx`

**Interfaces:**
- Consumes: `useRequiredLesson` (Task 11); `activeQuestions` (Task 8); `nextQuestionIndex`, `scoreQuiz`, `findCard`, `verdict` (Task 3); `QuizQuestionView`, `ScoreView`, `ProgressBar`, `Button`, `HighlightSwipe` (Task 9); `useKey`, `useAnimatedValue` (Task 10); `useLessonStore().answer / retryMissed` (Task 8).
- Produces: routes only.

- [ ] **Step 1: `/quiz` behavior**
  - `questions = activeQuestions(state)`; `current = nextQuestionIndex(questions, state.answers)` (Review Focus 4: a refresh resumes at the first unanswered question).
  - Local state `revealedId: string | null`. While a question is revealed, it stays on screen even though it is answered.
  - **Intro** (no answers yet among active questions and not revealed): "Quiz unlocked" as h1 with the swipe, line "{questions.length} questions. Every wrong answer links back to the page that teaches it.", primary "Start quiz" (also Enter).
  - **Question:** `ProgressBar` (answered / total), `QuizQuestionView` with `onSelect(i)` → `answer(q.id, i)` then `setRevealedId(q.id)`; keys `1`–`4` select while not revealed; after reveal primary "Next question" (Enter / ArrowRight) → `setRevealedId(null)`; on the last question the button reads "See results" → `/results`.
  - If all active questions are answered and nothing is revealed → `router.replace("/results")`.

- [ ] **Step 2: `/results` behavior**
  - If not all active questions are answered → `router.replace("/quiz")`.
  - `score = scoreQuiz(lesson.quiz, answers)` over the full quiz; `shown = Math.round(useAnimatedValue(score.correct, 900))`; `ScoreView` with `verdict(score.correct, score.total)`.
  - Missed list (only if any): heading "Pages to review"; per missed question: the question text, "Your answer: …" (wrong color) and "Right answer: …" (right color), and quiet link-button "Review page {n}: {card title}" → `/lesson/{n}?review=1` using `findCard`.
  - Actions: primary "Retry missed questions" (only if missed) → `retryMissed()` then `/quiz`; quiet link "Teacher view" → `/teacher`; quiet link "New lesson" → `clear()` then `/`.

- [ ] **Step 3: Verify manually** by pressing `D`, going through the pages and answering with one deliberate mistake. Check:
  - refreshing mid-quiz resumes on the right question
  - the results show 5/6
  - "Review page" opens the right page in review mode, and "Back to results" returns
  - retry shows only the missed question, and the score becomes 6/6

- [ ] **Step 4: Commit** `git add -A && git commit -m "feat: quiz with instant feedback, results, review and retry"`

---

### Task 13: Teacher dashboard preview (route `/teacher`)

**Files:**
- Create: `src/app/teacher/page.tsx`, `src/app-components/TeacherScreen.tsx`

**Interfaces:**
- Consumes: `useRequiredLesson` (Task 11), `buildClassReport` (Task 4), `MasteryBars` (Task 9), `useAnimatedValue` (Task 10), `SiteHeader`.

- [ ] **Step 1: Layout**, top to bottom, no cards or bento:
  1. Row: h1 = lesson title (Literata) and a small badge "Preview · sample class data" (paper-raised background, ink-soft text, radius 2px).
  2. Insight: `report.insight` as a large Literata sentence with the weak title wrapped in `HighlightSwipe`, then `report.action` as a link "Re-teach page {n}" → `/lesson/{n}?review=1`.
  3. "Topic mastery" heading (no sub-heading); `MasteryBars topics={report.topics} grow={useAnimatedValue(1, 700, 200)} highlightCardId={report.weakest.cardId}`.
  4. "Students who need help" heading; list rows: name, average %, "Weakest: {title}". Max 3 columns.
  5. Footer line: "Class of {classSize} · average {classAverage}%".
  - Back link "Back to results" (quiet) top-left under the header.

- [ ] **Step 2: Verify manually** in the demo flow. Check:
  - the weak topic's bar is brick red and is the lowest
  - the insight's page number matches that bar
  - it reads cleanly at 390px

- [ ] **Step 3: Commit** `git add -A && git commit -m "feat: teacher dashboard preview from seeded class data"`

---

### Task 14: End-to-end demo flow test

**Files:**
- Create: `playwright.config.ts`, `e2e/demo-flow.spec.ts`

- [ ] **Step 1: Install the browser** `npx playwright install chromium`

- [ ] **Step 2: `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm run dev -- --port 3100", url: "http://localhost:3100", reuseExistingServer: true, timeout: 120_000 },
});
```

- [ ] **Step 3: `e2e/demo-flow.spec.ts`**

```ts
import { expect, test } from "@playwright/test";
import demo from "../src/demo/photosynthesis.json" with { type: "json" };
import { buildClassReport } from "../src/lib/sample-class";

const lesson = demo.lesson;
const firstMissedPage = lesson.cards.findIndex((c) => c.id === lesson.quiz[0].cardId) + 1;

test("fresh tab on a deep link goes home (Review Focus 3)", async ({ page }) => {
  await page.goto("/lesson/99");
  await expect(page).toHaveURL(/\/$/);
});

test("demo flow: learn, quiz, review a missed page, teacher view", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Turn tonight's slides");

  await page.keyboard.press("d");
  await expect(page).toHaveURL(/\/lesson$/, { timeout: 15_000 });
  await expect(page.getByText(`${lesson.cards.length} pages · ${lesson.quiz.length} questions`)).toBeVisible();

  await page.getByRole("link", { name: "Start lesson" }).click();
  for (let n = 1; n < lesson.cards.length; n++) {
    await expect(page).toHaveURL(new RegExp(`/lesson/${n}$`));
    await page.keyboard.press("ArrowRight");
  }
  await page.getByRole("button", { name: "Finish lesson" }).click();

  await expect(page.getByRole("heading", { name: "Quiz unlocked" })).toBeVisible();
  await page.getByRole("button", { name: "Start quiz" }).click();

  for (const [i, q] of lesson.quiz.entries()) {
    const pick = i === 0 ? (q.correctIndex + 1) % 4 : q.correctIndex;
    await page.keyboard.press(String(pick + 1));
    await expect(page.getByText(i === 0 ? /Not quite\./ : /Right\./)).toBeVisible();
    await page.keyboard.press("Enter");
  }

  await expect(page).toHaveURL(/\/results$/);
  await expect(page.getByText(`${lesson.quiz.length - 1} / ${lesson.quiz.length}`)).toBeVisible();

  await page.getByRole("link", { name: new RegExp(`Review page ${firstMissedPage}`) }).click();
  await expect(page).toHaveURL(new RegExp(`/lesson/${firstMissedPage}\\?review=1$`));
  await page.getByRole("link", { name: "Back to results" }).click();

  await page.reload();
  await expect(page.getByText(`${lesson.quiz.length - 1} / ${lesson.quiz.length}`)).toBeVisible();

  await page.getByRole("link", { name: "Teacher view" }).click();
  await expect(page.getByText(buildClassReport(lesson).insight, { exact: false })).toBeVisible();
  await expect(page.getByText("Preview · sample class data")).toBeVisible();
});
```

Adjust role names only if the implemented control is a link where the test expects a button (or the reverse); keep the visible text identical to the plan.

- [ ] **Step 4: Run** `npm run test:e2e` → PASS (2 tests). **Commit** `git add -A && git commit -m "test: end-to-end demo flow"`

---

### Task 15: Sample decks and the make-demos script

**Files:**
- Create: `samples/decks/photosynthesis.html`, `samples/decks/ww1-causes.html`, `samples/decks/deck.css`, `scripts/build-sample-decks.mjs`, `scripts/make-demos.ts`
- Output (committed): `samples/pdf/photosynthesis.pdf`, `samples/pdf/ww1-causes.pdf`

**Interfaces:**
- Consumes: `generateLesson`, `parseEffort` (Task 6), `makeCreateMessage` (Task 6), `DEMOS` slugs (Task 7).
- Produces: the PDFs used by `make-demos`; Plan 2 adds PNG thumbnails from the same HTML.

- [ ] **Step 1: Author the decks** as a realistic classroom deck, one `<section class="slide">` per slide at 1280×720: 18 slides for Photosynthesis and 14 for Causes of WWI. Use the same facts as the placeholder lessons, in a typical teacher-slide style (title + bullets, a simple diagram drawn with HTML/CSS, a summary slide). `deck.css` sets `@page { size: 1280px 720px; margin: 0 }` and `section.slide { width: 1280px; height: 720px; page-break-after: always; }`.

- [ ] **Step 2: `scripts/build-sample-decks.mjs`**

```js
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const slugs = ["photosynthesis", "ww1-causes"];
await mkdir("samples/pdf", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
for (const slug of slugs) {
  await page.goto(pathToFileURL(path.resolve(`samples/decks/${slug}.html`)).href);
  await page.pdf({ path: `samples/pdf/${slug}.pdf`, width: "1280px", height: "720px", printBackground: true });
  console.log(`built samples/pdf/${slug}.pdf`);
}
await browser.close();
```

- [ ] **Step 3: `scripts/make-demos.ts`**

```ts
import { readFile, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { makeCreateMessage } from "../src/lib/anthropic-client";
import { generateLesson, parseEffort } from "../src/lib/generate-lesson";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("Set ANTHROPIC_API_KEY (for example in .env.local, then run: npx dotenv -e .env.local -- npm run make-demos)");
  process.exit(1);
}

for (const slug of ["photosynthesis", "ww1-causes"]) {
  const bytes = await readFile(`samples/pdf/${slug}.pdf`);
  const slideCount = (await PDFDocument.load(bytes)).getPageCount();
  const started = Date.now();
  const lesson = await generateLesson(
    { kind: "pdf", base64: bytes.toString("base64") },
    { createMessage: makeCreateMessage(apiKey), effort: parseEffort(process.env.LESSON_EFFORT) },
  );
  await writeFile(`src/demo/${slug}.json`, `${JSON.stringify({ source: "ai", slideCount, lesson }, null, 2)}\n`);
  console.log(`${slug}: ${lesson.cards.length} cards, ${lesson.quiz.length} questions in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}
```

Load `.env.local` without a new dependency by running the script with Node's built-in flag: change the package script to `"make-demos": "tsx --env-file=.env.local scripts/make-demos.ts"` and update the error message to say "Add ANTHROPIC_API_KEY to .env.local".

- [ ] **Step 4: Run** `npm run decks` → two PDFs with 18 and 14 pages (check with `node -e` + pdf-lib or open them). Run `npm run make-demos` without a key → exits with the clear message. **Commit** `git add -A && git commit -m "feat: sample decks and make-demos script"`

---

### Task 16: README and presentation-day checklist

**Files:**
- Create: `README.md`, `docs/presentation-day-checklist.md`

- [ ] **Step 1: `README.md`** sections:
  - What it is (2 sentences, same copy as the sub-headline).
  - Setup: Node 24+; `npm install`; copy `.env.example` to `.env.local` and paste the key; `npm run dev`; open http://localhost:3000.
  - Demo mode: the "or try a sample lesson" link, or press `D`.
  - Make the sample lessons real: `npm run decks` then `npm run make-demos`, with the measured time and cost per lesson filled in after the first real run.
  - Rename the product: edit `src/config/brand.ts`.
  - Use your own class deck as the sample: put the PDF in `samples/pdf/`, add its slug to `scripts/make-demos.ts` and `src/demo/index.ts`.
  - Tests: `npm test`, `npm run test:e2e`.
  - Cost note: Claude Opus 5.5 at about $0.20 to $0.50 per 20-slide lesson.
- [ ] **Step 2: `docs/presentation-day-checklist.md`**:
  - **The night before:** charge the laptop; run `npm run dev` once online so fonts are cached; generate one real lesson; test demo mode with Wi-Fi off; copy the video to the laptop, a USB stick and the cloud (Plan 2); load the stage screens.
  - **10 minutes before:** start `npm run dev`, open http://localhost:3000, press `D` once and return home, set the browser to full screen (F11), turn off notifications, set volume, close other apps.
  - **If something breaks on stage:** press `D` for the sample lesson; if the app won't load, keep going with the video.
- [ ] **Step 3: Commit** `git add -A && git commit -m "docs: README and presentation-day checklist"`

---

## Self-review notes

- Spec coverage:
  - sections 3 (flow): Tasks 10–13
  - section 4 (architecture): Tasks 1, 6, 8, 9
  - section 5 (data model): Task 2
  - section 6 (AI): Task 6
  - section 7 (demo): Tasks 7 and 15
  - section 8 (teacher): Tasks 4 and 13
  - section 9 (design): Global Constraints and Task 9
  - section 10 (copy): Tasks 2 and 10
  - section 13 (errors): Tasks 6, 8 and 10
  - section 14 (testing): every task plus Task 14
  - section 15 (handover): Task 16
  - sections 11 and 12 (video, pitch): Plan 2
- Type names are consistent across tasks: `LessonState`, `activeQuestions`, `nextQuestionIndex`, `buildClassReport`, `CreateMessage`, `LessonSource`.
