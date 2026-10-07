// src/server/student.ts
import { estimateMinutes } from "../lib/estimate";
import type { Card } from "../lib/lesson-schema";
import type { Subject } from "../lib/subjects";
import type { SessionUser } from "./accounts";
import { listStudentSubjects } from "./classes";
import type { Db } from "./db";
import { AccessError } from "./errors";
import { loadLesson, type StoredLesson } from "./lessons";

/**
 * The only door a student's request goes through. Includes the answer key, so it is for server code
 * (quiz.ts). Pages and handlers that talk to the browser use getStudentLesson instead.
 */
export function openLessonForStudent(db: Db, student: SessionUser, lessonId: number): StoredLesson {
  if (student.role !== "student") throw new AccessError(403);
  const stored = loadLesson(db, lessonId);
  if (!stored || stored.status !== "published") throw new AccessError(404);
  const enrolled = db.prepare("SELECT 1 FROM enrollments WHERE class_id = ? AND student_id = ?").get(stored.classId, student.id);
  if (!enrolled) throw new AccessError(404);
  return stored;
}

export type StudentLesson = {
  id: number;
  classId: number;
  className: string;
  subject: Subject;
  language: string;
  title: string;
  cards: Card[];
  questionCount: number;
  minutes: number;
};

/** The safe view of a lesson: pages only, never the questions. */
export function getStudentLesson(db: Db, student: SessionUser, lessonId: number): StudentLesson {
  const stored = openLessonForStudent(db, student, lessonId);
  return {
    id: stored.id,
    classId: stored.classId,
    className: stored.className,
    subject: stored.subject,
    language: stored.language,
    title: stored.lesson.title,
    cards: stored.lesson.cards,
    questionCount: stored.lesson.quiz.length,
    minutes: estimateMinutes(stored.lesson),
  };
}

export type LessonProgress = "not-started" | "read" | "in-progress" | "done";
export type StudentLessonRow = {
  id: number;
  title: string;
  className: string;
  pageCount: number;
  questionCount: number;
  progress: LessonProgress;
  score: { correct: number; total: number } | null;
};

export function listSubjectLessons(db: Db, student: SessionUser, subject: Subject): StudentLessonRow[] {
  const id = student.id;
  const rows = db
    .prepare(
      `SELECT l.id, l.title, l.cards, c.name AS class_name,
         (SELECT COUNT(*) FROM questions q WHERE q.lesson_id = l.id) AS question_count,
         (SELECT a.score FROM attempts a WHERE a.lesson_id = l.id AND a.student_id = ? AND a.is_first = 1 AND a.finished_at IS NOT NULL) AS first_score,
         (SELECT a.total FROM attempts a WHERE a.lesson_id = l.id AND a.student_id = ? AND a.is_first = 1 AND a.finished_at IS NOT NULL) AS first_total,
         EXISTS (SELECT 1 FROM attempts a WHERE a.lesson_id = l.id AND a.student_id = ? AND a.finished_at IS NULL) AS has_open,
         EXISTS (SELECT 1 FROM reads r WHERE r.lesson_id = l.id AND r.student_id = ?) AS has_read
       FROM lessons l
       JOIN classes c ON c.id = l.class_id
       JOIN enrollments e ON e.class_id = c.id AND e.student_id = ?
       WHERE l.status = 'published' AND c.subject = ?
       ORDER BY l.published_at DESC, l.id DESC`,
    )
    .all(id, id, id, id, id, subject) as {
    id: number;
    title: string;
    cards: string;
    class_name: string;
    question_count: number;
    first_score: number | null;
    first_total: number | null;
    has_open: number;
    has_read: number;
  }[];
  return rows.map((r) => {
    const done = r.first_score !== null && r.first_total !== null;
    const progress: LessonProgress = done ? "done" : r.has_open ? "in-progress" : r.has_read ? "read" : "not-started";
    return {
      id: r.id,
      title: r.title,
      className: r.class_name,
      pageCount: (JSON.parse(r.cards) as unknown[]).length,
      questionCount: r.question_count,
      progress,
      score: done ? { correct: r.first_score!, total: r.first_total! } : null,
    };
  });
}

export type SubjectProgress = { subject: Subject; classes: { id: number; name: string }[]; lessonCount: number; doneCount: number };

export function listSubjectProgress(db: Db, student: SessionUser): SubjectProgress[] {
  return listStudentSubjects(db, student).map(({ subject, classes }) => {
    const lessons = classes.length ? listSubjectLessons(db, student, subject) : [];
    return { subject, classes, lessonCount: lessons.length, doneCount: lessons.filter((l) => l.progress === "done").length };
  });
}

export function markRead(db: Db, student: SessionUser, lessonId: number): void {
  openLessonForStudent(db, student, lessonId);
  db.prepare("INSERT OR IGNORE INTO reads (lesson_id, student_id, read_at) VALUES (?, ?, ?)").run(lessonId, student.id, Date.now());
}
