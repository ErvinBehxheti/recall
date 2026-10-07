import { makeCreateMessage } from "@/lib/anthropic-client";
import { ERROR_MESSAGES, ERROR_STATUS } from "@/lib/errors";
import { generateLesson, parseEffort } from "@/lib/generate-lesson";
import { handleGenerate } from "@/lib/handle-generate";
import { verifySession } from "@/server/auth";

export const runtime = "nodejs";
export const maxDuration = 150;

export async function POST(request: Request) {
  const user = await verifySession();
  if (user?.role !== "teacher") {
    return Response.json(
      { error: { code: "unauthorized", message: ERROR_MESSAGES.unauthorized } },
      { status: ERROR_STATUS.unauthorized },
    );
  }
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const effort = parseEffort(process.env.LESSON_EFFORT);
  return handleGenerate(request, {
    hasKey: apiKey.length > 0,
    generate: (source) => generateLesson(source, { createMessage: makeCreateMessage(apiKey), effort }),
  });
}
