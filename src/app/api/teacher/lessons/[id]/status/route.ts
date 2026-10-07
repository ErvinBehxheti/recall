// src/app/api/teacher/lessons/[id]/status/route.ts
import { getApiUser, jsonError } from "@/server/api";
import { getDb } from "@/server/db";
import { InputError, parseId } from "@/server/errors";
import { publishLesson, unpublishLesson } from "@/server/lessons";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const teacher = await getApiUser("teacher");
    const lessonId = parseId((await params).id);
    const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
    if (body?.status === "published") publishLesson(getDb(), teacher, lessonId);
    else if (body?.status === "draft") unpublishLesson(getDb(), teacher, lessonId);
    else throw new InputError("Unknown status.");
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
