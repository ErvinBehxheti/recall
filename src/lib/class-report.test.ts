// src/lib/class-report.test.ts
import { describe, expect, it } from "vitest";
import { buildClassReport, insightParts, type ReportStudent } from "./class-report";

const card = (id: string, title: string) => ({ id, title, explanation: "e", keyPoints: ["k"], rememberThis: "r" });
const cards = [card("c1", "Topic 1"), card("c2", "Topic 2"), card("c3", "Topic 3")];
const questions = [
  { id: "q1", cardId: "c1" },
  { id: "q2", cardId: "c1" },
  { id: "q3", cardId: "c2" },
  { id: "q4", cardId: "c3" },
];
const student = (name: string, status: ReportStudent["status"], correct: Record<string, boolean>): ReportStudent => ({ name, status, correct });

const classOfFive = [
  student("Ana", "finished", { q1: true, q2: true, q3: true, q4: true }),
  student("Bora", "finished", { q1: true, q2: false, q3: false, q4: true }),
  student("Cena", "finished", { q1: true, q2: true, q3: false, q4: false }),
  student("Dren", "in-progress", { q1: true }),
  student("Era", "not-started", {}),
];

describe("buildClassReport", () => {
  it("averages finished students per page and finds the weakest", () => {
    const report = buildClassReport({ cards, questions, students: classOfFive })!;
    expect(report.topics).toEqual([
      { cardId: "c1", pageNumber: 1, title: "Topic 1", percent: 83, struggling: 1 },
      { cardId: "c2", pageNumber: 2, title: "Topic 2", percent: 33, struggling: 2 },
      { cardId: "c3", pageNumber: 3, title: "Topic 3", percent: 67, struggling: 1 },
    ]);
    expect(report.weakest.cardId).toBe("c2");
    expect(report).toMatchObject({
      enrolled: 5,
      finished: 3,
      classAverage: 67,
      insight: "2 of 3 students struggled with Topic 2.",
      action: "Re-teach page 2.",
    });
  });

  it("lists every student: finished ones who need help first, then in progress, then not started", () => {
    const { rows } = buildClassReport({ cards, questions, students: classOfFive })!;
    expect(rows.map((r) => [r.name, r.status, r.percent, r.weakestTitle])).toEqual([
      ["Bora", "finished", 50, "Topic 2"],
      ["Cena", "finished", 50, "Topic 2"],
      ["Ana", "finished", 100, null],
      ["Dren", "in-progress", null, null],
      ["Era", "not-started", null, null],
    ]);
    expect(rows[3]).toMatchObject({ correctCount: 1, total: 4 });
  });

  it("returns null while nobody has finished, with no students, or with no questions", () => {
    expect(buildClassReport({ cards, questions, students: [] })).toBeNull();
    expect(buildClassReport({ cards, questions, students: [student("Dren", "in-progress", { q1: true }), student("Era", "not-started", {})] })).toBeNull();
    expect(buildClassReport({ cards, questions: [], students: [student("Ana", "finished", {})] })).toBeNull();
  });

  it("says the class is solid when every page is above the threshold", () => {
    const report = buildClassReport({ cards, questions, students: [student("Ana", "finished", { q1: true, q2: true, q3: true, q4: true })] })!;
    expect(report.insight).toBe("The class is solid on every topic. Lowest: Topic 1 at 100%.");
  });

  it("uses the singular for one student", () => {
    const report = buildClassReport({ cards, questions, students: [student("Ana", "finished", { q1: true, q2: true, q3: false, q4: true })] })!;
    expect(report.insight).toBe("1 of 1 student struggled with Topic 2.");
  });

  it("skips pages that have no questions but keeps page numbers by position", () => {
    const withIntro = [card("c1", "Topic 1"), card("cx", "Intro"), card("c2", "Topic 2")];
    const qs = [
      { id: "q1", cardId: "c1" },
      { id: "q3", cardId: "c2" },
    ];
    const report = buildClassReport({ cards: withIntro, questions: qs, students: [student("Ana", "finished", { q1: true, q3: false })] })!;
    expect(report.topics.map((t) => [t.pageNumber, t.title])).toEqual([
      [1, "Topic 1"],
      [3, "Topic 2"],
    ]);
  });
});

describe("insightParts", () => {
  it("splits the sentence around the weakest title so it can be highlighted", () => {
    const report = buildClassReport({ cards, questions, students: classOfFive })!;
    expect(insightParts(report)).toEqual({ before: "2 of 3 students struggled with ", highlight: "Topic 2", after: "." });
  });
});
