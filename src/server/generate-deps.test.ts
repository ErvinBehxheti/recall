// src/server/generate-deps.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateLesson } from "../lib/validate-lesson";
import { generateDeps } from "./generate-deps";

afterEach(() => vi.unstubAllEnvs());

describe("generateDeps", () => {
  it("returns a valid sample lesson with no API key when SLIDEKICK_FAKE_AI is 1", async () => {
    vi.stubEnv("SLIDEKICK_FAKE_AI", "1");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const deps = generateDeps();
    expect(deps.hasKey).toBe(true);
    const lesson = await deps.generate({ kind: "text", text: "anything" });
    expect(validateLesson(lesson).ok).toBe(true);
  });

  it("reports a missing key when the fake AI is off", () => {
    vi.stubEnv("SLIDEKICK_FAKE_AI", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(generateDeps().hasKey).toBe(false);
  });
});
