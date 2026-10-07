// src/server/lessons.ts
import { detectLanguage, lessonText } from "../lib/language";
import { LessonSchema, LIMITS, type Card, type Lesson, type Question } from "../lib/lesson-schema";
import { SUBJECT_LABELS, type Subject } from "../lib/subjects";
import { sanitizeLesson, validateLesson } from "../lib/validate-lesson";
import type { SessionUser } from "./accounts";
import { getTeacherClass } from "./classes";
import { transaction, type Db } from "./db";
import { AccessError, InputError } from "./errors";

export type LessonStatus = "draft" | "published";

export type StoredLesson = {
  id: number;
  classId: number;
  className: string;
  subject: Subject;
  teacherId: number;
  status: LessonStatus;
  language: string;
  slideCount: number;
  lesson: Lesson;
};

type LessonRow = {
  id: number;
  class_id: number;
  title: string;
  language: string;
  slide_count: number;
  cards: string;
  status: LessonStatus;
  class_name: string;
  subject: Subject;
  teacher_id: number;
};
type QuestionRow = { qid: string; question: string; options: string; correct_index: number; explanation: string; card_id: string };

const toQuestion = (r: QuestionRow): Question => ({
  id: r.qid,
  question: r.question,
  options: JSON.parse(r.options) as string[],
  correctIndex: r.correct_index,
  explanation: r.explanation,
  cardId: r.card_id,
});

/** No access check: teachers go through getTeacherLesson, students through student.ts. */
export function loadLesson(db: Db, lessonId: number): StoredLesson | null {
  const row = db
    .prepare(
      `SELECT l.id, l.class_id, l.title, l.language, l.slide_count, l.cards, l.status,
              c.name AS class_name, c.subject, c.teacher_id
       FROM lessons l JOIN classes c ON c.id = l.class_id WHERE l.id = ?`,
    )
    .get(lessonId) as LessonRow | undefined;
  if (!row) return null;
  const questions = (
    db
      .prepare("SELECT qid, question, options, correct_index, explanation, card_id FROM questions WHERE lesson_id = ? ORDER BY position")
      .all(lessonId) as QuestionRow[]
  ).map(toQuestion);
  return {
    id: row.id,
    classId: row.class_id,
    className: row.class_name,
    subject: row.subject,
    teacherId: row.teacher_id,
    status: row.status,
    language: row.language,
    slideCount: row.slide_count,
    lesson: { title: row.title, subject: SUBJECT_LABELS[row.subject], cards: JSON.parse(row.cards) as Card[], quiz: questions },
  };
}

export function getTeacherLesson(db: Db, teacher: SessionUser, lessonId: number): StoredLesson {
  const stored = loadLesson(db, lessonId);
  if (!stored || teacher.role !== "teacher" || stored.teacherId !== teacher.id) throw new AccessError(404);
  return stored;
}

function insertQuestions(db: Db, lessonId: number, quiz: Question[]): void {
  const insert = db.prepare(
    "INSERT INTO questions (lesson_id, qid, position, question, options, correct_index, explanation, card_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  quiz.forEach((q, position) =>
    insert.run(lessonId, q.id, position, q.question, JSON.stringify(q.options), q.correctIndex, q.explanation, q.cardId),
  );
}

export function saveDraftLesson(db: Db, teacher: SessionUser, classId: number, lesson: Lesson, slideCount: number): number {
  const cls = getTeacherClass(db, teacher, classId);
  const clean = sanitizeLesson(lesson);
  return transaction(db, () => {
    const result = db
      .prepare("INSERT INTO lessons (class_id, title, language, slide_count, cards, status, created_at) VALUES (?, ?, ?, ?, ?, 'draft', ?)")
      .run(cls.id, clean.title, detectLanguage(lessonText(clean)), slideCount, JSON.stringify(clean.cards), Date.now());
    const id = Number(result.lastInsertRowid);
    insertQuestions(db, id, clean.quiz);
    return id;
  });
}

/** Saves a draft as typed. Counts and links are only enforced at publish, so a teacher can save half-done work. */
export function saveEdits(db: Db, teacher: SessionUser, lessonId: number, input: unknown): void {
  const stored = getTeacherLesson(db, teacher, lessonId);
  if (stored.status !== "draft") throw new InputError("Unpublish this lesson before editing it.");
  const parsed = LessonSchema.safeParse(input);
  if (!parsed.success) throw new InputError("Some fields are missing. Check the pages and questions and try again.");
  const clean = sanitizeLesson(parsed.data);
  if (clean.cards.length > LIMITS.maxCards || clean.quiz.length > LIMITS.maxQuestions) {
    throw new InputError(`Keep it to ${LIMITS.maxCards} pages and ${LIMITS.maxQuestions} questions.`);
  }
  if (new Set(clean.quiz.map((q) => q.id)).size !== clean.quiz.length) {
    throw new InputError("Two questions share an id. Reload the page and try again.");
  }
  transaction(db, () => {
    db.prepare("UPDATE lessons SET title = ?, cards = ?, language = ? WHERE id = ?").run(
      clean.title,
      JSON.stringify(clean.cards),
      detectLanguage(lessonText(clean)),
      lessonId,
    );
    db.prepare("DELETE FROM questions WHERE lesson_id = ?").run(lessonId);
    insertQuestions(db, lessonId, clean.quiz);
  });
}

export function publishLesson(db: Db, teacher: SessionUser, lessonId: number): void {
  const stored = getTeacherLesson(db, teacher, lessonId);
  if (stored.status === "published") return;
  const result = validateLesson(stored.lesson);
  if (!result.ok) throw new InputError(`Fix this before publishing: ${result.problems.slice(0, 3).join("; ")}.`);
  db.prepare("UPDATE lessons SET status = 'published', published_at = ? WHERE id = ?").run(Date.now(), lessonId);
}

export function unpublishLesson(db: Db, teacher: SessionUser, lessonId: number): void {
  getTeacherLesson(db, teacher, lessonId);
  if (db.prepare("SELECT 1 FROM attempts WHERE lesson_id = ? LIMIT 1").get(lessonId)) {
    throw new InputError("Students have already taken this quiz, so it can't be unpublished.");
  }
  db.prepare("UPDATE lessons SET status = 'draft', published_at = NULL WHERE id = ?").run(lessonId);
}

export function deleteLesson(db: Db, teacher: SessionUser, lessonId: number): void {
  getTeacherLesson(db, teacher, lessonId);
  db.prepare("DELETE FROM lessons WHERE id = ?").run(lessonId);
}

export type LessonSummary = { id: number; title: string; status: LessonStatus; pageCount: number; questionCount: number };

export function listClassLessons(db: Db, teacher: SessionUser, classId: number): LessonSummary[] {
  getTeacherClass(db, teacher, classId);
  const rows = db
    .prepare(
      `SELECT l.id, l.title, l.status, l.cards,
              (SELECT COUNT(*) FROM questions q WHERE q.lesson_id = l.id) AS question_count
       FROM lessons l WHERE l.class_id = ? ORDER BY l.created_at DESC, l.id DESC`,
    )
    .all(classId) as { id: number; title: string; status: LessonStatus; cards: string; question_count: number }[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    pageCount: (JSON.parse(r.cards) as unknown[]).length,
    questionCount: r.question_count,
  }));
}
