// src/app/api/learn/attempts/[id]/answers/route.ts
import { getApiUser, jsonError } from "@/server/api";
import { getDb } from "@/server/db";
import { InputError, parseId } from "@/server/errors";
import { answerQuestion } from "@/server/quiz";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await getApiUser("student");
    const attemptId = parseId((await params).id);
    const body = (await request.json().catch(() => null)) as { qid?: unknown; index?: unknown } | null;
    if (typeof body?.qid !== "string" || typeof body.index !== "number") throw new InputError("Pick one of the options.");
    return Response.json(answerQuestion(getDb(), student, attemptId, body.qid, body.index));
  } catch (error) {
    return jsonError(error);
  }
}
