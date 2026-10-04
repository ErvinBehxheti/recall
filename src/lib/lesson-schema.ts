import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const CardSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  explanation: z.string(),
  keyPoints: z.array(z.string()),
  rememberThis: z.string(),
});

export const QuestionSchema = z.strictObject({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
  cardId: z.string(),
});

export const LessonSchema = z.strictObject({
  title: z.string(),
  subject: z.string(),
  cards: z.array(CardSchema),
  quiz: z.array(QuestionSchema),
});

export type Card = z.infer<typeof CardSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Lesson = z.infer<typeof LessonSchema>;

export const LIMITS = { minCards: 4, maxCards: 15, minQuestions: 5, maxQuestions: 10, options: 4 } as const;

/**
 * JSON schema for Claude structured output. The SDK helper moves keywords the API does not accept
 * (like numeric bounds) into descriptions. Counts are enforced by validateLesson, not here.
 */
export function lessonJsonSchema(): Record<string, unknown> {
  return zodOutputFormat(LessonSchema).schema as Record<string, unknown>;
}
