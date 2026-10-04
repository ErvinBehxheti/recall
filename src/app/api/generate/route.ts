import { makeCreateMessage } from "@/lib/anthropic-client";
import { generateLesson, parseEffort } from "@/lib/generate-lesson";
import { handleGenerate } from "@/lib/handle-generate";

export const runtime = "nodejs";
export const maxDuration = 150;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const effort = parseEffort(process.env.LESSON_EFFORT);
  return handleGenerate(request, {
    hasKey: apiKey.length > 0,
    generate: (source) => generateLesson(source, { createMessage: makeCreateMessage(apiKey), effort }),
  });
}
