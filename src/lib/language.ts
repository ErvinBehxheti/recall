// src/lib/language.ts
import type { Lesson } from "./lesson-schema";

// Common Albanian function words. Short words that are also English ("me", "do", "si") are left out.
const ALBANIAN_WORDS = new Set([
  "dhe", "është", "një", "për", "që", "nga", "të", "në", "ose", "kjo", "janë", "mund", "kur", "nuk",
  "edhe", "por", "ajo", "tek", "së", "nëse", "pasi", "gjatë", "midis", "mes", "ky", "çfarë", "shumë",
  "vetëm", "ndër", "pas", "gjithashtu",
]);

/** Albanian or English is all the app needs to decide (read-aloud voices, the lang attribute). */
export function detectLanguage(text: string): "sq" | "en" {
  const words = text.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  if (words.length === 0) return "en";
  const hits = words.filter((w) => ALBANIAN_WORDS.has(w)).length;
  return hits / words.length >= 0.08 ? "sq" : "en";
}

export function lessonText(lesson: Lesson): string {
  return [lesson.title, ...lesson.cards.map((c) => c.explanation)].join(" ");
}
