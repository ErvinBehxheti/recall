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
