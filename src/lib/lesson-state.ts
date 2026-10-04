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
