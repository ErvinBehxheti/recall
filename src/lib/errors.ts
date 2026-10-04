export const ERROR_CODES = [
  "no_key",
  "bad_type",
  "too_big",
  "too_many_slides",
  "empty",
  "timeout",
  "ai_unavailable",
  "invalid_output",
  "refused",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  no_key: "The AI isn't set up on this laptop yet.",
  bad_type: "That file type won't work. Use a PDF or PowerPoint file.",
  too_big: "That file is over 20 MB. Try exporting it as a PDF.",
  too_many_slides: "That deck has more than 60 slides. Try splitting it into two lessons.",
  empty: "We couldn't find any text in those slides. Try the PDF version.",
  timeout: "The AI took too long. Check the internet and try again.",
  ai_unavailable: "We couldn't reach the AI. Check the internet and try again.",
  invalid_output: "The AI's lesson came back incomplete. Try again.",
  refused: "The AI couldn't make a lesson from this file.",
};

export const ERROR_STATUS: Record<ErrorCode, number> = {
  no_key: 503,
  bad_type: 415,
  too_big: 413,
  too_many_slides: 422,
  empty: 422,
  timeout: 504,
  ai_unavailable: 502,
  invalid_output: 502,
  refused: 422,
};

export class LessonError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "LessonError";
    this.code = code;
  }
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && (ERROR_CODES as readonly string[]).includes(value);
}
