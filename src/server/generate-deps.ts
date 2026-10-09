// src/server/generate-deps.ts
import { DEFAULT_DEMO_SLUG, getDemo } from "../demo";
import { makeCreateMessage } from "../lib/anthropic-client";
import { generateLesson, parseEffort } from "../lib/generate-lesson";
import type { HandlerDeps } from "../lib/handle-generate";

/** How long demo mode shows "Building your lesson" before the sample lesson opens. */
export const DEMO_DELAY_MS = 4000;

const sampleLesson = () => structuredClone(getDemo(DEFAULT_DEMO_SLUG)!.lesson);

/** No API key on this laptop: every upload becomes the sample lesson, and the class page says so. */
export function isDemoMode(): boolean {
  return process.env.SLIDEKICK_FAKE_AI !== "1" && (process.env.ANTHROPIC_API_KEY ?? "").length === 0;
}

/** SLIDEKICK_FAKE_AI=1 returns the sample lesson at once without calling Claude. The end-to-end tests set it. */
export function generateDeps(): HandlerDeps {
  if (process.env.SLIDEKICK_FAKE_AI === "1") {
    return { hasKey: true, generate: async () => sampleLesson() };
  }
  if (isDemoMode()) {
    return {
      hasKey: true,
      generate: async () => {
        await new Promise((resolve) => setTimeout(resolve, DEMO_DELAY_MS));
        return sampleLesson();
      },
    };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const effort = parseEffort(process.env.LESSON_EFFORT);
  return {
    hasKey: true,
    generate: (source) => generateLesson(source, { createMessage: makeCreateMessage(apiKey), effort }),
  };
}
