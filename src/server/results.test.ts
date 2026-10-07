// src/server/results.test.ts
import { describe, expect, it } from "vitest";
import { makeLesson } from "../lib/test-fixtures";
import { createStudent, createTeacher } from "./accounts";
import { createClass, joinClass } from "./classes";
import { openDb, type Db } from "./db";
import { AccessError } from "./errors";
import { publishLesson, saveDraftLesson } from "./lessons";
import { getLessonResults, listAttention } from "./results";

type Raw = { first: boolean; answers: Record<string, number>; finished: boolean };

function attempt(db: Db, lessonId: number, studentId: number, a: Raw) {
  db.prepare(
    "INSERT INTO attempts (lesson_id, student_id, is_first, question_ids, shuffles, answers, total, score, started_at, finished_at) VALUES (?, ?, ?, '[]', '{}', ?, 5, ?, 0, ?)",
  ).run(lessonId, studentId, a.first ? 1 : 0, JSON.stringify(a.answers), a.finished ? 0 : null, a.finished ? 1 : null);
}

const allRight = { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 };

async function world() {
  const db = openDb(":memory:");
  const teacher = await createTeacher(db, { name: "Ms Hoxha", email: "t@x.co", password: "password1" });
  const other = await createTeacher(db, { name: "Mr Berisha", email: "o@x.co", password: "password1" });
  const cls = createClass(db, teacher, { subject: "biology", name: "8A Biology" });
  const lessonId = saveDraftLesson(db, teacher, cls.id, makeLesson({ title: "Cells" }), 5);
  publishLesson(db, teacher, lessonId);
  const join = async (name: string) => {
    const { user } = await createStudent(db, { name, password: "password1" });
    joinClass(db, user, cls.joinCode);
    return user;
  };
  return { db, teacher, other, cls, lessonId, join };
}

describe("getLessonResults", () => {
  it("uses only first attempts and reports who finished", async () => {
    const { db, teacher, lessonId, join } = await world();
    const [ana, bora, cena, dren] = [await join("Ana"), await join("Bora"), await join("Cena"), await join("Dren")];
    await join("Era");
    attempt(db, lessonId, ana.id, { first: true, answers: allRight, finished: true });
    attempt(db, lessonId, bora.id, { first: true, answers: { ...allRight, q2: 1 }, finished: true });
    attempt(db, lessonId, cena.id, { first: true, answers: { ...allRight, q2: 1, q3: 1 }, finished: true });
    attempt(db, lessonId, dren.id, { first: true, answers: { q1: 0 }, finished: false });
    // Practice attempts never count, even when they are terrible.
    attempt(db, lessonId, ana.id, { first: false, answers: { q1: 1, q2: 1, q3: 1, q4: 1, q5: 1 }, finished: true });

    const { enrolled, report } = getLessonResults(db, teacher, lessonId);
    expect(enrolled).toBe(5);
    expect(report).toMatchObject({ finished: 3, insight: "2 of 3 students struggled with Topic 2.", action: "Re-teach page 2." });
    expect(report!.rows.map((r) => [r.name, r.status])).toEqual([
      ["Cena", "finished"],
      ["Bora", "finished"],
      ["Ana", "finished"],
      ["Dren", "in-progress"],
      ["Era", "not-started"],
    ]);
  });

  it("returns no report for a class with no students and for a lesson nobody finished", async () => {
    const { db, teacher, lessonId, join } = await world();
    expect(getLessonResults(db, teacher, lessonId)).toMatchObject({ enrolled: 0, report: null });
    const mira = await join("Mira");
    attempt(db, lessonId, mira.id, { first: true, answers: { q1: 0 }, finished: false });
    expect(getLessonResults(db, teacher, lessonId)).toMatchObject({ enrolled: 1, report: null });
  });

  it("is private to the teacher who owns the class", async () => {
    const { db, other, lessonId } = await world();
    expect(() => getLessonResults(db, other, lessonId)).toThrow(AccessError);
  });
});

describe("listAttention", () => {
  it("flags a published lesson whose weakest page is under 60 percent", async () => {
    const { db, teacher, other, cls, lessonId, join } = await world();
    expect(listAttention(db, teacher)).toEqual([]);
    const ana = await join("Ana");
    const bora = await join("Bora");
    attempt(db, lessonId, ana.id, { first: true, answers: { ...allRight, q3: 1 }, finished: true });
    attempt(db, lessonId, bora.id, { first: true, answers: { ...allRight, q3: 1 }, finished: true });
    expect(listAttention(db, teacher)).toEqual([
      { lessonId, lessonTitle: "Cells", classId: cls.id, pageNumber: 3, pageTitle: "Topic 3" },
    ]);
    expect(listAttention(db, other)).toEqual([]);
  });
});
