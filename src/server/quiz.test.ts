// src/server/quiz.test.ts
import { describe, expect, it } from "vitest";
import type { AttemptView, QuizQuestion } from "../lib/quiz-types";
import { makeLesson } from "../lib/test-fixtures";
import { createStudent, createTeacher, type SessionUser } from "./accounts";
import { createClass, joinClass } from "./classes";
import { openDb, type Db } from "./db";
import { AccessError, InputError } from "./errors";
import { publishLesson, saveDraftLesson, unpublishLesson } from "./lessons";
import { answerQuestion, getAttemptResult, latestFinishedAttemptId, startAttempt, startRetry } from "./quiz";

const lcg = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
// The fixture's right option text starts with "Right", the others with "Wrong".
const rightAt = (q: QuizQuestion) => q.options.findIndex((o) => o.startsWith("Right"));
const wrongAt = (q: QuizQuestion) => q.options.findIndex((o) => o.startsWith("Wrong"));

async function world() {
  const db = openDb(":memory:");
  const teacher = await createTeacher(db, { name: "Ms Hoxha", email: "t@x.co", password: "password1" });
  const cls = createClass(db, teacher, { subject: "biology", name: "8A Biology" });
  const { user: mira } = await createStudent(db, { name: "Mira", password: "password1" });
  const { user: leon } = await createStudent(db, { name: "Leon", password: "password1" });
  const { user: outsider } = await createStudent(db, { name: "Dren", password: "password1" });
  joinClass(db, mira, cls.joinCode);
  joinClass(db, leon, cls.joinCode);
  const lessonId = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
  publishLesson(db, teacher, lessonId);
  return { db, teacher, mira, leon, outsider, lessonId };
}

function answerAll(db: Db, student: SessionUser, view: AttemptView, wrongOn: string[] = []) {
  let last!: ReturnType<typeof answerQuestion>;
  for (const q of view.questions) {
    last = answerQuestion(db, student, view.attemptId, q.id, wrongOn.includes(q.id) ? wrongAt(q) : rightAt(q));
  }
  return last;
}

describe("starting a quiz", () => {
  it("sends no answer key and no explanation", async () => {
    const { db, mira, lessonId } = await world();
    const view = startAttempt(db, mira, lessonId, lcg(3));
    const json = JSON.stringify(view);
    expect(json).not.toContain("correctIndex");
    expect(json).not.toContain("explanation");
    expect(json).not.toContain("Because of topic");
    expect(view.answered).toEqual({});
    expect(view.total).toBe(5);
    expect(view.isFirst).toBe(true);
    for (const q of view.questions) {
      expect(q.options).toHaveLength(4);
      expect(rightAt(q)).toBeGreaterThanOrEqual(0);
    }
  });

  it("shuffles the options, so the right one is not always first", async () => {
    const { db, teacher, mira, leon } = await world();
    const positions = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) {
      const student = seed % 2 ? mira : leon;
      const lessonId = saveDraftLesson(db, teacher, 1, makeLesson(), 5);
      publishLesson(db, teacher, lessonId);
      positions.add(rightAt(startAttempt(db, student, lessonId, lcg(seed)).questions[0]));
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it("resumes the same attempt with the same order and the answers so far", async () => {
    const { db, mira, lessonId } = await world();
    const view = startAttempt(db, mira, lessonId, lcg(5));
    answerQuestion(db, mira, view.attemptId, view.questions[0].id, rightAt(view.questions[0]));
    answerQuestion(db, mira, view.attemptId, view.questions[1].id, wrongAt(view.questions[1]));
    const again = startAttempt(db, mira, lessonId, lcg(99));
    expect(again.attemptId).toBe(view.attemptId);
    expect(again.questions).toEqual(view.questions);
    expect(Object.keys(again.answered)).toEqual([view.questions[0].id, view.questions[1].id]);
    expect(again.answered[view.questions[1].id].correct).toBe(false);
  });
});

describe("answering", () => {
  it("returns feedback in the shuffled positions and locks the answer", async () => {
    const { db, mira, lessonId } = await world();
    const view = startAttempt(db, mira, lessonId, lcg(7));
    const q = view.questions[0];
    const first = answerQuestion(db, mira, view.attemptId, q.id, wrongAt(q));
    expect(first.feedback.correct).toBe(false);
    expect(first.feedback.chosenIndex).toBe(wrongAt(q));
    expect(q.options[first.feedback.correctIndex]).toMatch(/^Right/);
    expect(first.feedback.explanation).toMatch(/^Because of topic/);
    expect(first.finished).toBe(false);
    const again = answerQuestion(db, mira, view.attemptId, q.id, rightAt(q));
    expect(again.feedback).toEqual(first.feedback);
    expect(Object.keys(startAttempt(db, mira, lessonId).answered)).toEqual([q.id]);
  });

  it("rejects a question that is not in the quiz and an option that does not exist", async () => {
    const { db, mira, lessonId } = await world();
    const view = startAttempt(db, mira, lessonId, lcg(7));
    expect(() => answerQuestion(db, mira, view.attemptId, "q99", 0)).toThrow(InputError);
    for (const bad of [-1, 4, 1.5, Number.NaN]) {
      expect(() => answerQuestion(db, mira, view.attemptId, view.questions[0].id, bad)).toThrow(InputError);
    }
  });
});

describe("results", () => {
  it("scores the attempt and lists missed questions with the page that teaches them", async () => {
    const { db, mira, lessonId } = await world();
    const view = startAttempt(db, mira, lessonId, lcg(11));
    const wrong = view.questions.slice(0, 2).map((q) => q.id);
    expect(() => getAttemptResult(db, mira, view.attemptId)).toThrow(InputError);
    const last = answerAll(db, mira, view, wrong);
    expect(last.finished).toBe(true);
    const result = getAttemptResult(db, mira, view.attemptId);
    expect(result).toMatchObject({ lessonId, lessonTitle: "Test Lesson", isFirst: true, correct: 3, total: 5 });
    expect(result.missed.map((m) => m.id).sort()).toEqual([...wrong].sort());
    for (const m of result.missed) {
      expect(m.yourAnswer).toMatch(/^Wrong/);
      expect(m.rightAnswer).toMatch(/^Right/);
      expect(m.pageNumber).toBe(Number(m.id.slice(1)));
      expect(m.pageTitle).toBe(`Topic ${m.pageNumber}`);
    }
    expect(latestFinishedAttemptId(db, mira.id, lessonId)).toBe(view.attemptId);
    expect(latestFinishedAttemptId(db, 999, lessonId)).toBeNull();
  });

  it("keeps a finished first attempt as the only graded one; later attempts are practice", async () => {
    const { db, mira, lessonId } = await world();
    const first = startAttempt(db, mira, lessonId, lcg(2));
    answerAll(db, mira, first, [first.questions[0].id]);
    const practice = startAttempt(db, mira, lessonId, lcg(3));
    expect(practice.attemptId).not.toBe(first.attemptId);
    expect(practice.isFirst).toBe(false);
    answerAll(db, mira, practice);
    expect(getAttemptResult(db, mira, practice.attemptId)).toMatchObject({ isFirst: false, correct: 5 });
    const graded = db.prepare("SELECT id, score FROM attempts WHERE student_id = ? AND is_first = 1").all(mira.id);
    expect(graded).toEqual([{ id: first.attemptId, score: 4 }]);
  });
});

describe("retry", () => {
  it("replays only the questions missed in the latest finished attempt as practice", async () => {
    const { db, mira, lessonId } = await world();
    expect(() => startRetry(db, mira, lessonId)).toThrow("Take the quiz first");
    const first = startAttempt(db, mira, lessonId, lcg(4));
    const missed = first.questions.slice(0, 2).map((q) => q.id);
    answerAll(db, mira, first, missed);
    const retry = startRetry(db, mira, lessonId, lcg(8));
    expect(retry.isFirst).toBe(false);
    expect(retry.questions.map((q) => q.id).sort()).toEqual([...missed].sort());
    answerAll(db, mira, retry);
    expect(() => startRetry(db, mira, lessonId)).toThrow("Nothing to retry");
  });
});

describe("who may take a quiz", () => {
  it("says not found to a student outside the class, a teacher, and an unpublished lesson", async () => {
    const { db, teacher, mira, outsider, lessonId } = await world();
    expect(() => startAttempt(db, outsider, lessonId)).toThrow(AccessError);
    expect(() => startAttempt(db, teacher, lessonId)).toThrow(AccessError);
    expect(() => startAttempt(db, mira, 999)).toThrow(AccessError);
    unpublishLesson(db, teacher, lessonId);
    expect(() => startAttempt(db, mira, lessonId)).toThrow(AccessError);
  });

  it("keeps one student's attempt private from another, even inside the same class", async () => {
    const { db, mira, leon, lessonId } = await world();
    const view = startAttempt(db, mira, lessonId, lcg(6));
    answerAll(db, mira, view);
    const q = view.questions[0];
    expect(() => answerQuestion(db, leon, view.attemptId, q.id, 0)).toThrow(AccessError);
    expect(() => getAttemptResult(db, leon, view.attemptId)).toThrow(AccessError);
    expect(() => getAttemptResult(db, mira, 999)).toThrow(AccessError);
    expect(startAttempt(db, leon, lessonId).attemptId).not.toBe(view.attemptId);
  });
});
