// Regenerates the demo lessons in src/demo from the sample PDFs, using the real AI.
// Run with: npm run make-demos   (reads ANTHROPIC_API_KEY from .env.local)
import { readFile, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { makeCreateMessage } from "../src/lib/anthropic-client";
import { generateLesson, parseEffort } from "../src/lib/generate-lesson";

const SLUGS = ["photosynthesis", "ww1-causes"];

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("Add ANTHROPIC_API_KEY to .env.local first (copy .env.example to .env.local).");
  process.exit(1);
}

for (const slug of SLUGS) {
  const bytes = await readFile(`samples/pdf/${slug}.pdf`);
  const slideCount = (await PDFDocument.load(bytes)).getPageCount();
  const started = Date.now();
  const lesson = await generateLesson(
    { kind: "pdf", base64: bytes.toString("base64") },
    { createMessage: makeCreateMessage(apiKey), effort: parseEffort(process.env.LESSON_EFFORT) },
  );
  await writeFile(`src/demo/${slug}.json`, `${JSON.stringify({ source: "ai", slideCount, lesson }, null, 2)}\n`);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`${slug}: ${lesson.cards.length} pages, ${lesson.quiz.length} questions in ${seconds}s`);
}
