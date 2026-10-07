// src/server/student.test.ts
import { describe, expect, it } from "vitest";
import { makeLesson } from "../lib/test-fixtures";
import { createStudent, createTeacher } from "./accounts";
import { createClass, joinClass } from "./classes";
import { openDb } from "./db";
import { AccessError } from "./errors";
import { publishLesson, saveDraftLesson, unpublishLesson } from "./lessons";
import { getStudentLesson, listSubjectLessons, listSubjectProgress, markRead, openLessonForStudent } from "./student";

async function world() {
  const db = openDb(":memory:");
  const teacher = await createTeacher(db, { name: "Ms Hoxha", email: "t@x.co", password: "password1" });
  const bio = createClass(db, teacher, { subject: "biology", name: "8A Biology" });
  const math = createClass(db, teacher, { subject: "math", name: "8A Math" });
  const { user: mira } = await createStudent(db, { name: "Mira", password: "password1" });
  const { user: outsider } = await createStudent(db, { name: "Leon", password: "password1" });
  joinClass(db, mira, bio.joinCode);
  const lessonId = saveDraftLesson(db, teacher, bio.id, makeLesson({ title: "Cells" }), 5);
  publishLesson(db, teacher, lessonId);
  return { db, teacher, bio, math, mira, outsider, lessonId };
}

describe("access", () => {
  it("gives an enrolled student the lesson without any quiz data", async () => {
    const { db, mira, lessonId } = await world();
    const view = getStudentLesson(db, mira, lessonId);
    expect(view).toMatchObject({ id: lessonId, className: "8A Biology", subject: "biology", language: "en", title: "Cells", questionCount: 5 });
    expect(view.cards).toHaveLength(5);
    expect(view.minutes).toBeGreaterThan(0);
    const json = JSON.stringify(view);
    expect(json).not.toContain("correctIndex");
    expect(json).not.toContain("quiz");
  });

  it("says not found to a student who has not joined, a teacher, an unpublished lesson and a missing id", async () => {
    const { db, teacher, mira, outsider, lessonId } = await world();
    expect(() => getStudentLesson(db, outsider, lessonId)).toThrow(AccessError);
    expect(() => openLessonForStudent(db, teacher, lessonId)).toThrow(AccessError);
    expect(() => getStudentLesson(db, mira, 999)).toThrow(AccessError);
    unpublishLesson(db, teacher, lessonId);
    expect(() => getStudentLesson(db, mira, lessonId)).toThrow(AccessError);
  });
});

describe("progress", () => {
  const attempt = (db: ReturnType<typeof openDb>, lessonId: number, studentId: number, extra: { first: boolean; score: number | null }) =>
    db
      .prepare(
        "INSERT INTO attempts (lesson_id, student_id, is_first, question_ids, shuffles, total, score, started_at, finished_at) VALUES (?, ?, ?, '[]', '{}', 5, ?, 0, ?)",
      )
      .run(lessonId, studentId, extra.first ? 1 : 0, extra.score, extra.score === null ? null : 1);

  it("moves from not started to read, in progress and done", async () => {
    const { db, mira, lessonId } = await world();
    const row = () => listSubjectLessons(db, mira, "biology")[0];
    expect(row()).toMatchObject({ id: lessonId, title: "Cells", className: "8A Biology", pageCount: 5, questionCount: 5, progress: "not-started", score: null });
    markRead(db, mira, lessonId);
    markRead(db, mira, lessonId);
    expect(row().progress).toBe("read");
    attempt(db, lessonId, mira.id, { first: true, score: null });
    expect(row().progress).toBe("in-progress");
    db.prepare("UPDATE attempts SET score = 3, finished_at = 1").run();
    expect(row()).toMatchObject({ progress: "done", score: { correct: 3, total: 5 } });
    attempt(db, lessonId, mira.id, { first: false, score: null });
    expect(row().progress).toBe("done");
  });

  it("shows a score of zero as done, not as unfinished", async () => {
    const { db, mira, lessonId } = await world();
    attempt(db, lessonId, mira.id, { first: true, score: 0 });
    expect(listSubjectLessons(db, mira, "biology")[0]).toMatchObject({ progress: "done", score: { correct: 0, total: 5 } });
  });

  it("lists only the subject asked for, from classes the student joined", async () => {
    const { db, teacher, math, mira, outsider } = await world();
    const mathLesson = saveDraftLesson(db, teacher, math.id, makeLesson({ title: "Fractions" }), 5);
    publishLesson(db, teacher, mathLesson);
    expect(listSubjectLessons(db, mira, "math")).toEqual([]);
    expect(listSubjectLessons(db, mira, "biology")).toHaveLength(1);
    expect(listSubjectLessons(db, outsider, "biology")).toEqual([]);
  });

  it("hides drafts and counts done lessons per subject", async () => {
    const { db, teacher, bio, mira, lessonId } = await world();
    saveDraftLesson(db, teacher, bio.id, makeLesson({ title: "Draft only" }), 5);
    attempt(db, lessonId, mira.id, { first: true, score: 4 });
    const progress = listSubjectProgress(db, mira);
    expect(progress.map((p) => p.subject)).toEqual(["biology", "chemistry", "math", "albanian", "english"]);
    expect(progress[0]).toMatchObject({ lessonCount: 1, doneCount: 1 });
    expect(progress[1]).toMatchObject({ classes: [], lessonCount: 0, doneCount: 0 });
  });

  it("refuses to mark a lesson read for someone who cannot open it", async () => {
    const { db, outsider, lessonId } = await world();
    expect(() => markRead(db, outsider, lessonId)).toThrow(AccessError);
  });
});
