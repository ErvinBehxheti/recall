import { describe, expect, it } from "vitest";
import { DEFAULT_DEMO_SLUG, DEMOS, getDemo } from "./index";
import { validateLesson } from "@/lib/validate-lesson";

describe("demo lessons", () => {
  it("has the default sample", () => {
    expect(getDemo(DEFAULT_DEMO_SLUG)?.lesson.title).toBe("Photosynthesis");
    expect(DEMOS.map((d) => d.slug)).toEqual(["photosynthesis", "ww1-causes"]);
  });

  for (const demo of DEMOS) {
    it(`${demo.slug} passes validation unchanged (already sanitized)`, () => {
      const result = validateLesson(demo.lesson);
      expect(result.ok, result.ok ? "" : result.problems.join("; ")).toBe(true);
      if (result.ok) expect(result.lesson).toEqual(demo.lesson);
    });

    it(`${demo.slug} spreads correct answers across at least 3 positions`, () => {
      expect(new Set(demo.lesson.quiz.map((q) => q.correctIndex)).size).toBeGreaterThanOrEqual(3);
    });
  }
});
