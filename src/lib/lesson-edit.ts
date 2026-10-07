// src/lib/lesson-edit.ts
import type { Card, Lesson, Question } from "./lesson-schema";

export function nextId(prefix: "c" | "q", existing: string[]): string {
  let n = existing.length + 1;
  while (existing.includes(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

export function addCard(lesson: Lesson): Lesson {
  const id = nextId("c", lesson.cards.map((c) => c.id));
  return { ...lesson, cards: [...lesson.cards, { id, title: "", explanation: "", keyPoints: [""], rememberThis: "" }] };
}

/** Questions that pointed at the page keep the stale id; publishing flags them. */
export function removeCard(lesson: Lesson, id: string): Lesson {
  return { ...lesson, cards: lesson.cards.filter((c) => c.id !== id) };
}

export function updateCard(lesson: Lesson, id: string, patch: Partial<Card>): Lesson {
  return { ...lesson, cards: lesson.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
}

export function addQuestion(lesson: Lesson): Lesson {
  const id = nextId("q", lesson.quiz.map((q) => q.id));
  const blank: Question = {
    id,
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
    cardId: lesson.cards[0]?.id ?? "",
  };
  return { ...lesson, quiz: [...lesson.quiz, blank] };
}

export function removeQuestion(lesson: Lesson, id: string): Lesson {
  return { ...lesson, quiz: lesson.quiz.filter((q) => q.id !== id) };
}

export function updateQuestion(lesson: Lesson, id: string, patch: Partial<Question>): Lesson {
  return { ...lesson, quiz: lesson.quiz.map((q) => (q.id === id ? { ...q, ...patch } : q)) };
}

export function setOption(lesson: Lesson, questionId: string, index: number, value: string): Lesson {
  return {
    ...lesson,
    quiz: lesson.quiz.map((q) =>
      q.id === questionId ? { ...q, options: q.options.map((option, i) => (i === index ? value : option)) } : q,
    ),
  };
}
