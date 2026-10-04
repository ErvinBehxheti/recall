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
