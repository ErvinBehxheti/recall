// src/server/results.ts
import { buildClassReport, STRUGGLE_THRESHOLD, type ClassReport, type ReportStudent } from "../lib/class-report";
import type { SessionUser } from "./accounts";
import type { Db } from "./db";
import { getTeacherLesson, type StoredLesson } from "./lessons";

export type LessonResults = { stored: StoredLesson; enrolled: number; report: ClassReport | null };

/** Only each student's first attempt counts. Practice attempts are never read here. */
export function getLessonResults(db: Db, teacher: SessionUser, lessonId: number): LessonResults {
  const stored = getTeacherLesson(db, teacher, lessonId);
  const students = db
    .prepare("SELECT u.id, u.name FROM enrollments e JOIN users u ON u.id = e.student_id WHERE e.class_id = ? ORDER BY u.name, u.id")
    .all(stored.classId) as { id: number; name: string }[];
  const firstAttempt = db.prepare("SELECT answers, finished_at FROM attempts WHERE lesson_id = ? AND student_id = ? AND is_first = 1");
  const { quiz, cards } = stored.lesson;

  const reportStudents: ReportStudent[] = students.map((s) => {
    const row = firstAttempt.get(stored.id, s.id) as { answers: string; finished_at: number | null } | undefined;
    if (!row) return { name: s.name, status: "not-started", correct: {} };
    const answers = JSON.parse(row.answers) as Record<string, number>;
    const correct: Record<string, boolean> = {};
    for (const q of quiz) if (answers[q.id] !== undefined) correct[q.id] = answers[q.id] === q.correctIndex;
    return { name: s.name, status: row.finished_at === null ? "in-progress" : "finished", correct };
  });

  return {
    stored,
    enrolled: students.length,
    report: buildClassReport({ cards, questions: quiz.map((q) => ({ id: q.id, cardId: q.cardId })), students: reportStudents }),
  };
}

export type Attention = { lessonId: number; lessonTitle: string; classId: number; pageNumber: number; pageTitle: string };

export function listAttention(db: Db, teacher: SessionUser): Attention[] {
  const lessons = db
    .prepare(
      `SELECT l.id FROM lessons l JOIN classes c ON c.id = l.class_id
       WHERE c.teacher_id = ? AND l.status = 'published' ORDER BY l.published_at DESC, l.id DESC`,
    )
    .all(teacher.id) as { id: number }[];
  return lessons.flatMap(({ id }) => {
    const { stored, report } = getLessonResults(db, teacher, id);
    if (!report || report.weakest.percent >= STRUGGLE_THRESHOLD) return [];
    return [
      {
        lessonId: id,
        lessonTitle: stored.lesson.title,
        classId: stored.classId,
        pageNumber: report.weakest.pageNumber,
        pageTitle: report.weakest.title,
      },
    ];
  });
}
