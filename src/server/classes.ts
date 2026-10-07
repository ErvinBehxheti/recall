// src/server/classes.ts
import { randomInt } from "node:crypto";
import { isSubject, SUBJECTS, type Subject } from "../lib/subjects";
import type { SessionUser } from "./accounts";
import type { Db } from "./db";
import { AccessError, InputError } from "./errors";

export type ClassRow = { id: number; teacherId: number; subject: Subject; name: string; joinCode: string };
export type ClassSummary = ClassRow & { studentCount: number; lessonCount: number };

type RawClass = { id: number; teacher_id: number; subject: Subject; name: string; join_code: string };
const toClass = (r: RawClass): ClassRow => ({ id: r.id, teacherId: r.teacher_id, subject: r.subject, name: r.name, joinCode: r.join_code });

// No I, O, 0 or 1, so a code read aloud or copied by hand is hard to get wrong.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newJoinCode(pick: (max: number) => number = (max) => randomInt(max)): string {
  return Array.from({ length: 6 }, () => ALPHABET[pick(ALPHABET.length)]).join("");
}

export const normalizeCode = (raw: string): string => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

export function createClass(
  db: Db,
  teacher: SessionUser,
  input: { subject: string; name: string },
  pick?: (max: number) => number,
): ClassRow {
  if (teacher.role !== "teacher") throw new AccessError(403);
  if (!isSubject(input.subject)) throw new InputError("Choose one of the five subjects.");
  const name = input.name.replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 60) throw new InputError("Give the class a name between 2 and 60 characters.");
  for (let tries = 0; tries < 20; tries++) {
    const joinCode = newJoinCode(pick);
    try {
      const result = db
        .prepare("INSERT INTO classes (teacher_id, subject, name, join_code, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(teacher.id, input.subject, name, joinCode, Date.now());
      return { id: Number(result.lastInsertRowid), teacherId: teacher.id, subject: input.subject, name, joinCode };
    } catch (error) {
      if (!(error instanceof Error && /UNIQUE constraint failed/.test(error.message))) throw error;
    }
  }
  throw new InputError("We couldn't make a class code. Try again.");
}

export function joinClass(db: Db, student: SessionUser, rawCode: string): ClassRow {
  if (student.role !== "student") throw new AccessError(403);
  const row = db.prepare("SELECT * FROM classes WHERE join_code = ?").get(normalizeCode(rawCode)) as RawClass | undefined;
  if (!row) throw new InputError("That code doesn't match a class. Check it with your teacher.");
  db.prepare("INSERT OR IGNORE INTO enrollments (class_id, student_id, joined_at) VALUES (?, ?, ?)").run(row.id, student.id, Date.now());
  return toClass(row);
}

export function listTeacherClasses(db: Db, teacher: SessionUser): ClassSummary[] {
  const rows = db
    .prepare(
      `SELECT c.*,
         (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) AS student_count,
         (SELECT COUNT(*) FROM lessons l WHERE l.class_id = c.id) AS lesson_count
       FROM classes c WHERE c.teacher_id = ? ORDER BY c.created_at, c.id`,
    )
    .all(teacher.id) as (RawClass & { student_count: number; lesson_count: number })[];
  return rows.map((r) => ({ ...toClass(r), studentCount: r.student_count, lessonCount: r.lesson_count }));
}

export function getTeacherClass(db: Db, teacher: SessionUser, classId: number): ClassRow {
  const row = db.prepare("SELECT * FROM classes WHERE id = ? AND teacher_id = ?").get(classId, teacher.id) as RawClass | undefined;
  if (!row || teacher.role !== "teacher") throw new AccessError(404);
  return toClass(row);
}

export function listClassStudents(db: Db, teacher: SessionUser, classId: number): { id: number; name: string }[] {
  getTeacherClass(db, teacher, classId);
  return db
    .prepare("SELECT u.id, u.name FROM enrollments e JOIN users u ON u.id = e.student_id WHERE e.class_id = ? ORDER BY u.name, u.id")
    .all(classId) as { id: number; name: string }[];
}

export function listStudentSubjects(
  db: Db,
  student: SessionUser,
): { subject: Subject; classes: { id: number; name: string }[] }[] {
  const rows = db
    .prepare("SELECT c.id, c.name, c.subject FROM enrollments e JOIN classes c ON c.id = e.class_id WHERE e.student_id = ? ORDER BY c.name, c.id")
    .all(student.id) as { id: number; name: string; subject: Subject }[];
  return SUBJECTS.map((subject) => ({
    subject,
    classes: rows.filter((r) => r.subject === subject).map((r) => ({ id: r.id, name: r.name })),
  }));
}
