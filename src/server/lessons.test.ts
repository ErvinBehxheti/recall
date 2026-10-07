// src/server/lessons.test.ts
import { describe, expect, it } from "vitest";
import { makeLesson } from "../lib/test-fixtures";
import { createStudent, createTeacher } from "./accounts";
import { createClass } from "./classes";
import { openDb } from "./db";
import { AccessError, InputError } from "./errors";
import {
  deleteLesson,
  getTeacherLesson,
  listClassLessons,
  loadLesson,
  publishLesson,
  saveDraftLesson,
  saveEdits,
  unpublishLesson,
} from "./lessons";

async function world() {
  const db = openDb(":memory:");
  const teacher = await createTeacher(db, { name: "Ms Hoxha", email: "t@x.co", password: "password1" });
  const other = await createTeacher(db, { name: "Mr Berisha", email: "o@x.co", password: "password1" });
  const cls = createClass(db, teacher, { subject: "biology", name: "8A Biology" });
  return { db, teacher, other, cls };
}

describe("saveDraftLesson", () => {
  it("stores a draft and loads it back with the class subject as the label", async () => {
    const { db, teacher, cls } = await world();
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson({ subject: "Whatever the AI said" }), 12);
    const stored = getTeacherLesson(db, teacher, id);
    expect(stored).toMatchObject({ id, classId: cls.id, className: "8A Biology", status: "draft", slideCount: 12, language: "en" });
    expect(stored.lesson).toEqual({ ...makeLesson(), subject: "Biology" });
  });

  it("detects an Albanian lesson", async () => {
    const { db, teacher, cls } = await world();
    const base = makeLesson();
    const albanian = makeLesson({
      cards: base.cards.map((c) => ({
        ...c,
        explanation: "Bimët e kthejnë dritën e diellit në energji dhe kjo është e rëndësishme për jetën në tokë.",
      })),
    });
    const id = saveDraftLesson(db, teacher, cls.id, albanian, 5);
    expect(getTeacherLesson(db, teacher, id).language).toBe("sq");
  });

  it("is hidden from other teachers and refuses their classes", async () => {
    const { db, teacher, other, cls } = await world();
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
    expect(() => getTeacherLesson(db, other, id)).toThrow(AccessError);
    expect(() => saveDraftLesson(db, other, cls.id, makeLesson(), 5)).toThrow(AccessError);
    expect(() => getTeacherLesson(db, teacher, 999)).toThrow(AccessError);
    expect(loadLesson(db, 999)).toBeNull();
  });
});

describe("saveEdits", () => {
  it("keeps a half-finished draft, replaces the questions, and re-sanitizes text", async () => {
    const { db, teacher, cls } = await world();
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
    const draft = makeLesson({ title: "  Cells \u{1F600}  " });
    draft.cards = draft.cards.slice(0, 1);
    draft.quiz = [{ ...draft.quiz[0], question: "Only one left?", options: ["a", "b", "", ""] }];
    saveEdits(db, teacher, id, draft);
    const stored = getTeacherLesson(db, teacher, id);
    expect(stored.lesson.title).toBe("Cells");
    expect(stored.lesson.cards).toHaveLength(1);
    expect(stored.lesson.quiz).toHaveLength(1);
    expect(stored.lesson.quiz[0].question).toBe("Only one left?");
  });

  it("rejects malformed payloads, oversized lessons and duplicate question ids", async () => {
    const { db, teacher, cls } = await world();
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
    expect(() => saveEdits(db, teacher, id, { title: 3 })).toThrow(InputError);
    expect(() => saveEdits(db, teacher, id, null)).toThrow(InputError);
    const big = makeLesson();
    big.cards = Array.from({ length: 16 }, (_, i) => ({ ...big.cards[0], id: `c${i + 1}` }));
    expect(() => saveEdits(db, teacher, id, big)).toThrow("Keep it to");
    const dup = makeLesson();
    dup.quiz = [dup.quiz[0], { ...dup.quiz[1], id: dup.quiz[0].id }];
    expect(() => saveEdits(db, teacher, id, dup)).toThrow(InputError);
    expect(getTeacherLesson(db, teacher, id).lesson.quiz).toHaveLength(5);
  });

  it("refuses to edit a published lesson", async () => {
    const { db, teacher, cls } = await world();
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
    publishLesson(db, teacher, id);
    expect(() => saveEdits(db, teacher, id, makeLesson())).toThrow("Unpublish");
  });
});

describe("publish and unpublish", () => {
  it("blocks an invalid lesson with a plain message and allows it once fixed", async () => {
    const { db, teacher, cls } = await world();
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
    const broken = makeLesson();
    broken.quiz = broken.quiz.slice(0, 4);
    saveEdits(db, teacher, id, broken);
    expect(() => publishLesson(db, teacher, id)).toThrow(/Fix this before publishing: expected 5-10 questions/);
    expect(getTeacherLesson(db, teacher, id).status).toBe("draft");
    saveEdits(db, teacher, id, makeLesson());
    publishLesson(db, teacher, id);
    expect(getTeacherLesson(db, teacher, id).status).toBe("published");
    publishLesson(db, teacher, id);
  });

  it("flags a question that points at a removed page", async () => {
    const { db, teacher, cls } = await world();
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
    const edited = makeLesson();
    edited.quiz[0] = { ...edited.quiz[0], cardId: "gone" };
    saveEdits(db, teacher, id, edited);
    expect(() => publishLesson(db, teacher, id)).toThrow("missing card");
  });

  it("unpublishes while nobody has taken the quiz, and refuses afterwards", async () => {
    const { db, teacher, cls } = await world();
    const { user: student } = await createStudent(db, { name: "Mira", password: "password1" });
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
    publishLesson(db, teacher, id);
    unpublishLesson(db, teacher, id);
    expect(getTeacherLesson(db, teacher, id).status).toBe("draft");
    publishLesson(db, teacher, id);
    db.prepare(
      "INSERT INTO attempts (lesson_id, student_id, is_first, question_ids, shuffles, total, started_at) VALUES (?, ?, 1, '[]', '{}', 0, 0)",
    ).run(id, student.id);
    expect(() => unpublishLesson(db, teacher, id)).toThrow("already taken");
    expect(getTeacherLesson(db, teacher, id).status).toBe("published");
  });
});

describe("deleteLesson and listClassLessons", () => {
  it("deletes a lesson with its questions and lists the rest newest first", async () => {
    const { db, teacher, other, cls } = await world();
    const first = saveDraftLesson(db, teacher, cls.id, makeLesson({ title: "First" }), 5);
    const second = saveDraftLesson(db, teacher, cls.id, makeLesson({ title: "Second" }), 5);
    expect(listClassLessons(db, teacher, cls.id).map((l) => l.id)).toEqual([second, first]);
    expect(listClassLessons(db, teacher, cls.id)[0]).toEqual({ id: second, title: "Second", status: "draft", pageCount: 5, questionCount: 5 });
    expect(() => deleteLesson(db, other, first)).toThrow(AccessError);
    deleteLesson(db, teacher, first);
    expect(loadLesson(db, first)).toBeNull();
    expect((db.prepare("SELECT COUNT(*) AS n FROM questions WHERE lesson_id = ?").get(first) as { n: number }).n).toBe(0);
    expect(() => listClassLessons(db, other, cls.id)).toThrow(AccessError);
  });
});
