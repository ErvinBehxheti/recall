// src/lib/lesson-prompt.test.ts
import { describe, expect, it } from "vitest";
import { LESSON_SYSTEM_PROMPT } from "./lesson-prompt";

describe("LESSON_SYSTEM_PROMPT", () => {
  it("asks for the lesson in the language of the slides", () => {
    expect(LESSON_SYSTEM_PROMPT).toContain("same language as the slides");
  });
});
