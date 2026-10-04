import { describe, expect, it } from "vitest";
import {
  activeQuestions,
  answerQuestion,
  newLessonState,
  parseStoredState,
  serializeState,
  startRetry,
} from "./lesson-state";
import { makeLesson } from "./test-fixtures";

const fresh = () => newLessonState(makeLesson(), 12, "demo");

describe("lesson state", () => {
  it("starts with every question active and no answers", () => {
    const s = fresh();
    expect(s.answers).toEqual({});
    expect(s.activeQuestionIds).toEqual(["q1", "q2", "q3", "q4", "q5"]);
  });

  it("round-trips through storage so a refresh keeps answers (Review Focus 4)", () => {
    const s = answerQuestion(answerQuestion(fresh(), "q1", 0), "q2", 3);
    expect(parseStoredState(serializeState(s))).toEqual(s);
  });

  it("returns null for missing, corrupt or invalid stored data (Review Focus 3)", () => {
    expect(parseStoredState(null)).toBeNull();
    expect(parseStoredState("{oops")).toBeNull();
    expect(parseStoredState(JSON.stringify({ version: 1, lesson: { title: 1 } }))).toBeNull();
  });

  it("drops answers and active ids that do not belong to the lesson", () => {
    const raw = JSON.parse(serializeState(fresh()));
    raw.answers = { q1: 2, ghost: 1, q2: "x" };
    raw.activeQuestionIds = ["ghost"];
    const parsed = parseStoredState(JSON.stringify(raw))!;
    expect(parsed.answers).toEqual({ q1: 2 });
    expect(parsed.activeQuestionIds).toEqual(["q1", "q2", "q3", "q4", "q5"]);
  });

  it("ignores answers to questions that are not active or out of range", () => {
    const s = fresh();
    expect(answerQuestion(s, "q1", 7)).toBe(s);
    expect(answerQuestion(s, "ghost", 0)).toBe(s);
  });

  it("retry keeps correct answers, clears missed ones and activates only the missed", () => {
    let s = fresh();
    const picks = [
      ["q1", 0],
      ["q2", 1],
      ["q3", 0],
      ["q4", 2],
      ["q5", 0],
    ] as const;
    for (const [id, pick] of picks) s = answerQuestion(s, id, pick);
    const retry = startRetry(s);
    expect(retry.activeQuestionIds).toEqual(["q2", "q4"]);
    expect(retry.answers).toEqual({ q1: 0, q3: 0, q5: 0 });
    expect(activeQuestions(retry).map((q) => q.id)).toEqual(["q2", "q4"]);
  });
});
