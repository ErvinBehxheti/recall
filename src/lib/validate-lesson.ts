import { LessonSchema, LIMITS, type Lesson } from "./lesson-schema";
import { sanitizeText as s } from "./sanitize";

export type ValidationResult = { ok: true; lesson: Lesson } | { ok: false; problems: string[] };

export function sanitizeLesson(lesson: Lesson): Lesson {
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
