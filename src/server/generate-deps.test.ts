// src/server/generate-deps.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateLesson } from "../lib/validate-lesson";
import { DEMO_DELAY_MS, generateDeps, isDemoMode } from "./generate-deps";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("generateDeps", () => {
  it("returns a valid sample lesson with no API key when SLIDEKICK_FAKE_AI is 1", async () => {
    vi.stubEnv("SLIDEKICK_FAKE_AI", "1");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const deps = generateDeps();
    expect(deps.hasKey).toBe(true);
    expect(isDemoMode()).toBe(false);
    const lesson = await deps.generate({ kind: "text", text: "anything" });
    expect(validateLesson(lesson).ok).toBe(true);
  });

  it("falls back to demo mode with the sample lesson when there is no key", async () => {
    vi.useFakeTimers();
    vi.stubEnv("SLIDEKICK_FAKE_AI", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(isDemoMode()).toBe(true);
    const deps = generateDeps();
    expect(deps.hasKey).toBe(true);
    const pending = deps.generate({ kind: "text", text: "anything" });
    await vi.advanceTimersByTimeAsync(DEMO_DELAY_MS);
    expect(validateLesson(await pending).ok).toBe(true);
  });

  it("is not in demo mode once a key is set", () => {
    vi.stubEnv("SLIDEKICK_FAKE_AI", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    expect(isDemoMode()).toBe(false);
    expect(generateDeps().hasKey).toBe(true);
  });
});
