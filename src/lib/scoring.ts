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
