import { describe, expect, it } from "vitest";
import { buildClassReport, CLASS_NAMES, weakCardIndex } from "./sample-class";
import { makeLesson } from "./test-fixtures";

describe("buildClassReport", () => {
  const lesson = makeLesson();

  it("is deterministic for the same lesson", () => {
    expect(buildClassReport(lesson)).toEqual(buildClassReport(structuredClone(lesson)));
  });

  it("changes when the lesson changes", () => {
    const other = makeLesson({ title: "Another Lesson" });
    expect(buildClassReport(other)).not.toEqual(buildClassReport(lesson));
  });

  it("never picks the first card as the weak card", () => {
    for (const title of ["A", "B", "C", "D", "E", "F", "G", "H"]) {
      expect(weakCardIndex(makeLesson({ title }))).toBeGreaterThan(0);
    }
  });

  it("makes the weak card the lowest topic and writes the insight from data", () => {
    const report = buildClassReport(lesson);
    const weak = lesson.cards[weakCardIndex(lesson)];
    expect(report.weakest.cardId).toBe(weak.id);
    expect(Math.min(...report.topics.map((t) => t.percent))).toBe(report.weakest.percent);
    expect(report.insight).toBe(`${report.weakest.struggling} of ${CLASS_NAMES.length} students struggled with ${weak.title}.`);
    expect(report.action).toBe(`Re-teach page ${report.weakest.pageNumber}.`);
  });

  it("lists 4 students who need help, lowest average first", () => {
    const { needHelp } = buildClassReport(lesson);
    expect(needHelp).toHaveLength(4);
    const averages = needHelp.map((s) => s.average);
    expect([...averages].sort((a, b) => a - b)).toEqual(averages);
  });

  it("keeps the struggling count believable, roughly half the class", () => {
    for (const title of ["Test Lesson", "A", "B", "C", "D", "E"]) {
      const { weakest } = buildClassReport(makeLesson({ title }));
      expect(weakest.struggling).toBeGreaterThanOrEqual(8);
      expect(weakest.struggling).toBeLessThanOrEqual(20);
      expect(weakest.percent).toBeLessThan(60);
    }
  });

  it("keeps every percent between 0 and 100", () => {
    for (const t of buildClassReport(lesson).topics) {
      expect(t.percent).toBeGreaterThanOrEqual(0);
      expect(t.percent).toBeLessThanOrEqual(100);
    }
  });
});
