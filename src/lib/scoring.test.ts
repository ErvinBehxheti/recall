import { describe, expect, it } from "vitest";
import { findCard, nextQuestionIndex, scoreQuiz, verdict } from "./scoring";
import { makeLesson } from "./test-fixtures";

const lesson = makeLesson();

describe("scoreQuiz", () => {
  it("counts correct answers and lists missed questions, treating unanswered as missed", () => {
    const answers = { q1: 0, q2: 1, q3: 0 };
    const score = scoreQuiz(lesson.quiz, answers);
    expect(score.correct).toBe(2);
    expect(score.total).toBe(5);
    expect(score.missed.map((q) => q.id)).toEqual(["q2", "q4", "q5"]);
  });
});

describe("findCard", () => {
  it("returns the card and its 1-based page number", () => {
    expect(findCard(lesson, "c3")).toEqual({ card: lesson.cards[2], pageNumber: 3 });
    expect(findCard(lesson, "nope")).toBeNull();
  });
});

describe("nextQuestionIndex", () => {
  it("returns the first unanswered question, or -1 when all are answered", () => {
    expect(nextQuestionIndex(lesson.quiz, {})).toBe(0);
    expect(nextQuestionIndex(lesson.quiz, { q1: 0, q2: 3 })).toBe(2);
    expect(nextQuestionIndex(lesson.quiz, { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 })).toBe(-1);
  });
});

describe("verdict", () => {
  it("has a line for every band and never uses em dashes", () => {
    const lines = [verdict(6, 6), verdict(5, 6), verdict(3, 6), verdict(1, 6), verdict(0, 0)];
    expect(new Set(lines).size).toBe(4);
    for (const line of lines) expect(line).not.toMatch(/—/);
  });
});
