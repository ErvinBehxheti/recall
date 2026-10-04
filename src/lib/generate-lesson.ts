import Anthropic from "@anthropic-ai/sdk";
import { LessonError } from "./errors";
import { lessonJsonSchema, type Lesson } from "./lesson-schema";
import { LESSON_INSTRUCTION, LESSON_SYSTEM_PROMPT } from "./lesson-prompt";
import { validateLesson } from "./validate-lesson";

export const LESSON_MODEL = "claude-opus-5-5";
export const DEADLINE_MS = 120_000;
export const MIN_RETRY_WINDOW_MS = 45_000;

export type Effort = "low" | "medium" | "high";
export type LessonSource = { kind: "pdf"; base64: string } | { kind: "text"; text: string };
export type ModelReply = { stop_reason: string | null; content: { type: string; text?: string }[] };

export function parseEffort(value: string | undefined): Effort {
  const v = value?.toLowerCase();
  return v === "low" || v === "high" ? v : "medium";
}

export function buildLessonRequest(source: LessonSource, effort: Effort) {
  const content =
    source.kind === "pdf"
      ? [
          {
            type: "document" as const,
            source: { type: "base64" as const, media_type: "application/pdf" as const, data: source.base64 },
          },
          { type: "text" as const, text: LESSON_INSTRUCTION },
        ]
      : [{ type: "text" as const, text: `<slides>\n${source.text}\n</slides>\n\n${LESSON_INSTRUCTION}` }];
  return {
    model: LESSON_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default" as const,
    system: LESSON_SYSTEM_PROMPT,
    output_config: { effort, format: { type: "json_schema" as const, schema: lessonJsonSchema() } },
    messages: [{ role: "user" as const, content }],
  };
}

export type LessonRequest = ReturnType<typeof buildLessonRequest>;
export type CreateMessage = (params: LessonRequest, options: { signal: AbortSignal }) => Promise<ModelReply>;
export type GenerateOptions = { createMessage: CreateMessage; effort?: Effort; now?: () => number };

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function callWithDeadline(createMessage: CreateMessage, request: LessonRequest, ms: number): Promise<ModelReply> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await createMessage(request, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new LessonError("timeout");
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      throw new LessonError("no_key");
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Claude API error:", error.status, error.message);
      throw new LessonError("ai_unavailable");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateLesson(
  source: LessonSource,
  { createMessage, effort = "medium", now = Date.now }: GenerateOptions,
): Promise<Lesson> {
  const deadline = now() + DEADLINE_MS;
  const request = buildLessonRequest(source, effort);
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - now();
    if (attempt > 0 && remaining < MIN_RETRY_WINDOW_MS) break;
    const reply = await callWithDeadline(createMessage, request, remaining);
    if (reply.stop_reason === "refusal") throw new LessonError("refused");
    if (reply.stop_reason === "max_tokens") continue;
    const text = reply.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    const result = validateLesson(parseJson(text));
    if (result.ok) return result.lesson;
    console.warn("Lesson failed validation:", result.problems.slice(0, 5));
  }
  throw new LessonError("invalid_output");
}
