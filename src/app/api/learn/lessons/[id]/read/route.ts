// src/app/api/learn/lessons/[id]/read/route.ts
import { getApiUser, jsonError } from "@/server/api";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { markRead } from "@/server/student";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await getApiUser("student");
    markRead(getDb(), student, parseId((await params).id));
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
