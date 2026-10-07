// src/server/generate-deps.ts
import { DEFAULT_DEMO_SLUG, getDemo } from "../demo";
import { makeCreateMessage } from "../lib/anthropic-client";
import { generateLesson, parseEffort } from "../lib/generate-lesson";
import type { HandlerDeps } from "../lib/handle-generate";

/** SLIDEKICK_FAKE_AI=1 returns the sample lesson without calling Claude. The end-to-end tests set it. */
export function generateDeps(): HandlerDeps {
  if (process.env.SLIDEKICK_FAKE_AI === "1") {
    return { hasKey: true, generate: async () => structuredClone(getDemo(DEFAULT_DEMO_SLUG)!.lesson) };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const effort = parseEffort(process.env.LESSON_EFFORT);
  return {
    hasKey: apiKey.length > 0,
    generate: (source) => generateLesson(source, { createMessage: makeCreateMessage(apiKey), effort }),
  };
}
