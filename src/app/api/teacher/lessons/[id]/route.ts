// src/app/api/teacher/lessons/[id]/route.ts
import { getApiUser, jsonError } from "@/server/api";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { deleteLesson, saveEdits } from "@/server/lessons";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const teacher = await getApiUser("teacher");
    const lessonId = parseId((await params).id);
    const body = await request.json().catch(() => null);
    saveEdits(getDb(), teacher, lessonId, body);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const teacher = await getApiUser("teacher");
    deleteLesson(getDb(), teacher, parseId((await params).id));
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
