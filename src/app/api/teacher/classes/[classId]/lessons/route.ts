// src/app/api/teacher/classes/[classId]/lessons/route.ts
import { handleGenerate } from "@/lib/handle-generate";
import type { Lesson } from "@/lib/lesson-schema";
import { getApiUser, jsonError } from "@/server/api";
import { getTeacherClass } from "@/server/classes";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { generateDeps } from "@/server/generate-deps";
import { saveDraftLesson } from "@/server/lessons";

export const runtime = "nodejs";
export const maxDuration = 150;

export async function POST(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const teacher = await getApiUser("teacher");
    const classId = parseId((await params).classId);
    // Check ownership before spending any AI credit.
    getTeacherClass(getDb(), teacher, classId);
    const generated = await handleGenerate(request, generateDeps());
    if (!generated.ok) return generated;
    const { lesson, slideCount } = (await generated.json()) as { lesson: Lesson; slideCount: number };
    const lessonId = saveDraftLesson(getDb(), teacher, classId, lesson, slideCount);
    return Response.json({ lessonId });
  } catch (error) {
    return jsonError(error);
  }
}
