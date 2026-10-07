// src/app/api/learn/lessons/[id]/attempts/route.ts
import { getApiUser, jsonError } from "@/server/api";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { startAttempt, startRetry } from "@/server/quiz";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await getApiUser("student");
    const lessonId = parseId((await params).id);
    const body = (await request.json().catch(() => null)) as { mode?: unknown } | null;
    const attempt = body?.mode === "retry" ? startRetry(getDb(), student, lessonId) : startAttempt(getDb(), student, lessonId);
    return Response.json({ attempt });
  } catch (error) {
    return jsonError(error);
  }
}
