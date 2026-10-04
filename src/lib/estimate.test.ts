import { describe, expect, it } from "vitest";
import { countWords, estimateMinutes, lessonWordCount } from "./estimate";
import { makeLesson } from "./test-fixtures";

describe("estimate", () => {
  it("counts words on whitespace", () => {
    expect(countWords("  one two\nthree ")).toBe(3);
    expect(countWords("   ")).toBe(0);
  });
  it("estimates minutes from words at 120 wpm plus half a minute per question", () => {
    const lesson = makeLesson();
    const words = lessonWordCount(lesson);
    expect(estimateMinutes(lesson)).toBe(Math.ceil(words / 120 + lesson.quiz.length * 0.5));
  });
  it("never returns less than 1", () => {
    const tiny = makeLesson({ quiz: [] });
    tiny.cards = tiny.cards.map((c) => ({ ...c, title: "", explanation: "", keyPoints: [], rememberThis: "" }));
    expect(estimateMinutes(tiny)).toBe(1);
  });
});
