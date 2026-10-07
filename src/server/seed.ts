// src/server/seed.ts
import { DEFAULT_DEMO_SLUG, getDemo } from "../demo";
import { mulberry32 } from "../lib/random";
import { createStudent, createTeacher } from "./accounts";
import { createClass, joinClass } from "./classes";
import type { Db } from "./db";
import { publishLesson, saveDraftLesson } from "./lessons";

export const DEMO_TEACHER = { name: "Ms Hoxha", email: "teacher@demo.test", password: "demo-teacher-1" };
export const DEMO_STUDENT_PASSWORD = "demo-student-1";

const STUDENT_NAMES = ["Arta", "Liam", "Sofia", "Noah", "Amira", "Leon", "Mia", "Yusuf", "Elena", "Kai", "Zara", "Luka"];
const WEAK_QUESTION_INDEX = 2;

export type SeedResult = { classCode: string; classId: number; lessonId: number; students: { name: string; login: string }[] };

/**
 * One demo teacher, a Biology class, a published lesson and 12 students. Ten finished the quiz (with one
 * page most of them missed), one is part way through and one has not started.
 */
export async function seedDemo(db: Db, rng: () => number = mulberry32(2026)): Promise<SeedResult | "exists"> {
  if (db.prepare("SELECT 1 FROM users WHERE login = ?").get(DEMO_TEACHER.email)) return "exists";

  const teacher = await createTeacher(db, DEMO_TEACHER);
  const cls = createClass(db, teacher, { subject: "biology", name: "8A Biology" });
  const demo = getDemo(DEFAULT_DEMO_SLUG)!;
  const lessonId = saveDraftLesson(db, teacher, cls.id, demo.lesson, demo.slideCount);
  publishLesson(db, teacher, lessonId);

  const { quiz } = demo.lesson;
  // A page that certainly has a question, so the demo always has one visibly weak page.
  const weakCardId = quiz[Math.min(WEAK_QUESTION_INDEX, quiz.length - 1)].cardId;
  const identity = [0, 1, 2, 3];
  const insertAttempt = db.prepare(
    "INSERT INTO attempts (lesson_id, student_id, is_first, question_ids, shuffles, answers, score, total, started_at, finished_at) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)",
  );

  const students: SeedResult["students"] = [];
  for (const [i, name] of STUDENT_NAMES.entries()) {
    const { user, login } = await createStudent(db, { name, password: DEMO_STUDENT_PASSWORD });
    joinClass(db, user, cls.joinCode);
    students.push({ name, login });
    if (i === STUDENT_NAMES.length - 1) continue; // never started

    const finished = i < 10;
    const ability = 0.6 + rng() * 0.35;
    const answers: Record<string, number> = {};
    for (const q of quiz.slice(0, finished ? quiz.length : 2)) {
      const chance = ability - (q.cardId === weakCardId ? 0.4 : 0);
      answers[q.id] = rng() < chance ? q.correctIndex : (q.correctIndex + 1) % 4;
    }
    const score = quiz.filter((q) => answers[q.id] === q.correctIndex).length;
    const now = Date.now();
    insertAttempt.run(
      lessonId,
      user.id,
      JSON.stringify(quiz.map((q) => q.id)),
      JSON.stringify(Object.fromEntries(quiz.map((q) => [q.id, identity]))),
      JSON.stringify(answers),
      finished ? score : null,
      quiz.length,
      now,
      finished ? now : null,
    );
  }
  return { classCode: cls.joinCode, classId: cls.id, lessonId, students };
}
