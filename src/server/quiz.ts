// src/server/quiz.ts
import type { Question } from "../lib/lesson-schema";
import type { AttemptResult, AttemptView, Feedback } from "../lib/quiz-types";
import type { SessionUser } from "./accounts";
import { transaction, type Db } from "./db";
import { AccessError, InputError } from "./errors";
import { openLessonForStudent } from "./student";

export type Rng = () => number;

type AttemptRow = {
  id: number;
  lesson_id: number;
  student_id: number;
  is_first: number;
  question_ids: string;
  shuffles: string;
  answers: string;
  score: number | null;
  total: number;
  finished_at: number | null;
};

export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const loadAttempt = (db: Db, id: number) => db.prepare("SELECT * FROM attempts WHERE id = ?").get(id) as AttemptRow | undefined;

function ownAttempt(db: Db, student: SessionUser, attemptId: number): AttemptRow {
  const row = loadAttempt(db, attemptId);
  if (!row || row.student_id !== student.id || student.role !== "student") throw new AccessError(404);
  return row;
}

const findOpenAttempt = (db: Db, studentId: number, lessonId: number) =>
  db
    .prepare("SELECT * FROM attempts WHERE lesson_id = ? AND student_id = ? AND finished_at IS NULL ORDER BY id LIMIT 1")
    .get(lessonId, studentId) as AttemptRow | undefined;

function createAttempt(db: Db, studentId: number, lessonId: number, questions: Question[], ids: string[], isFirst: boolean, rng: Rng): AttemptRow {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const order = shuffled(ids, rng);
  const shuffles: Record<string, number[]> = {};
  for (const id of order) shuffles[id] = shuffled(byId.get(id)!.options.map((_, i) => i), rng);
  const result = db
    .prepare("INSERT INTO attempts (lesson_id, student_id, is_first, question_ids, shuffles, total, started_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(lessonId, studentId, isFirst ? 1 : 0, JSON.stringify(order), JSON.stringify(shuffles), order.length, Date.now());
  return loadAttempt(db, Number(result.lastInsertRowid))!;
}

function feedbackFor(question: Question, shuffle: number[], chosenOriginal: number): Feedback {
  return {
    chosenIndex: shuffle.indexOf(chosenOriginal),
    correctIndex: shuffle.indexOf(question.correctIndex),
    correct: chosenOriginal === question.correctIndex,
    explanation: question.explanation,
  };
}

function viewAttempt(db: Db, student: SessionUser, attempt: AttemptRow): AttemptView {
  const { lesson } = openLessonForStudent(db, student, attempt.lesson_id);
  const byId = new Map(lesson.quiz.map((q) => [q.id, q]));
  const ids = JSON.parse(attempt.question_ids) as string[];
  const shuffles = JSON.parse(attempt.shuffles) as Record<string, number[]>;
  const answers = JSON.parse(attempt.answers) as Record<string, number>;
  const answered: Record<string, Feedback> = {};
  // Only questions the student has already answered get their feedback back.
  for (const id of ids) if (answers[id] !== undefined) answered[id] = feedbackFor(byId.get(id)!, shuffles[id], answers[id]);
  return {
    attemptId: attempt.id,
    lessonId: attempt.lesson_id,
    isFirst: attempt.is_first === 1,
    total: ids.length,
    questions: ids.map((id) => ({
      id,
      question: byId.get(id)!.question,
      options: shuffles[id].map((original) => byId.get(id)!.options[original]),
    })),
    answered,
  };
}

export function startAttempt(db: Db, student: SessionUser, lessonId: number, rng: Rng = Math.random): AttemptView {
  const stored = openLessonForStudent(db, student, lessonId);
  const open = findOpenAttempt(db, student.id, lessonId);
  if (open) return viewAttempt(db, student, open);
  const isFirst = !db.prepare("SELECT 1 FROM attempts WHERE lesson_id = ? AND student_id = ?").get(lessonId, student.id);
  const quiz = stored.lesson.quiz;
  return viewAttempt(db, student, createAttempt(db, student.id, lessonId, quiz, quiz.map((q) => q.id), isFirst, rng));
}

export function startRetry(db: Db, student: SessionUser, lessonId: number, rng: Rng = Math.random): AttemptView {
  const stored = openLessonForStudent(db, student, lessonId);
  const open = findOpenAttempt(db, student.id, lessonId);
  if (open) return viewAttempt(db, student, open);
  const latest = db
    .prepare("SELECT * FROM attempts WHERE lesson_id = ? AND student_id = ? AND finished_at IS NOT NULL ORDER BY finished_at DESC, id DESC LIMIT 1")
    .get(lessonId, student.id) as AttemptRow | undefined;
  if (!latest) throw new InputError("Take the quiz first.");
  const byId = new Map(stored.lesson.quiz.map((q) => [q.id, q]));
  const answers = JSON.parse(latest.answers) as Record<string, number>;
  const missed = (JSON.parse(latest.question_ids) as string[]).filter((id) => answers[id] !== byId.get(id)!.correctIndex);
  if (missed.length === 0) throw new InputError("You got everything right. Nothing to retry.");
  return viewAttempt(db, student, createAttempt(db, student.id, lessonId, stored.lesson.quiz, missed, false, rng));
}

export function answerQuestion(
  db: Db,
  student: SessionUser,
  attemptId: number,
  qid: string,
  displayIndex: number,
): { feedback: Feedback; finished: boolean } {
  const attempt = ownAttempt(db, student, attemptId);
  const { lesson } = openLessonForStudent(db, student, attempt.lesson_id);
  const ids = JSON.parse(attempt.question_ids) as string[];
  if (!ids.includes(qid)) throw new InputError("That question is not part of this quiz.");
  const byId = new Map(lesson.quiz.map((q) => [q.id, q]));
  const question = byId.get(qid)!;
  const shuffle = (JSON.parse(attempt.shuffles) as Record<string, number[]>)[qid];
  if (!Number.isInteger(displayIndex) || displayIndex < 0 || displayIndex >= shuffle.length) {
    throw new InputError("Pick one of the options.");
  }
  const answers = JSON.parse(attempt.answers) as Record<string, number>;
  // Locked: a second tap or a reload returns what was already decided and changes nothing.
  if (answers[qid] !== undefined) return { feedback: feedbackFor(question, shuffle, answers[qid]), finished: attempt.finished_at !== null };

  return transaction(db, () => {
    answers[qid] = shuffle[displayIndex];
    const finished = ids.every((id) => answers[id] !== undefined);
    if (finished) {
      const score = ids.filter((id) => answers[id] === byId.get(id)!.correctIndex).length;
      db.prepare("UPDATE attempts SET answers = ?, score = ?, finished_at = ? WHERE id = ?").run(JSON.stringify(answers), score, Date.now(), attempt.id);
    } else {
      db.prepare("UPDATE attempts SET answers = ? WHERE id = ?").run(JSON.stringify(answers), attempt.id);
    }
    return { feedback: feedbackFor(question, shuffle, answers[qid]), finished };
  });
}

export function getAttemptResult(db: Db, student: SessionUser, attemptId: number): AttemptResult {
  const attempt = ownAttempt(db, student, attemptId);
  if (attempt.finished_at === null) throw new InputError("Finish the quiz to see the results.");
  const { lesson } = openLessonForStudent(db, student, attempt.lesson_id);
  const byId = new Map(lesson.quiz.map((q) => [q.id, q]));
  const answers = JSON.parse(attempt.answers) as Record<string, number>;
  const missed = (JSON.parse(attempt.question_ids) as string[]).flatMap((id) => {
    const q = byId.get(id)!;
    if (answers[id] === q.correctIndex) return [];
    const cardIndex = lesson.cards.findIndex((c) => c.id === q.cardId);
    return [
      {
        id,
        question: q.question,
        yourAnswer: q.options[answers[id]],
        rightAnswer: q.options[q.correctIndex],
        pageNumber: cardIndex === -1 ? null : cardIndex + 1,
        pageTitle: cardIndex === -1 ? null : lesson.cards[cardIndex].title,
      },
    ];
  });
  return {
    attemptId: attempt.id,
    lessonId: attempt.lesson_id,
    lessonTitle: lesson.title,
    isFirst: attempt.is_first === 1,
    correct: attempt.score ?? 0,
    total: attempt.total,
    missed,
  };
}

export function latestFinishedAttemptId(db: Db, studentId: number, lessonId: number): number | null {
  const row = db
    .prepare("SELECT id FROM attempts WHERE lesson_id = ? AND student_id = ? AND finished_at IS NOT NULL ORDER BY finished_at DESC, id DESC LIMIT 1")
    .get(lessonId, studentId) as { id: number } | undefined;
  return row?.id ?? null;
}
