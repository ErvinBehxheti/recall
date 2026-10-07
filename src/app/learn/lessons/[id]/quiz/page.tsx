// src/app/learn/lessons/[id]/quiz/page.tsx
import { AppHeader } from "@/app-components/AppHeader";
import { QuizRunner } from "@/app-components/QuizRunner";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { orNotFound } from "@/server/guard";
import { getStudentLesson } from "@/server/student";

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ retry?: string }>;
}) {
  const user = await requireUser("student");
  const [{ id }, { retry }] = await Promise.all([params, searchParams]);
  const lesson = orNotFound(() => getStudentLesson(getDb(), user, parseId(id)));
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={user} />
      <QuizRunner lessonId={lesson.id} questionCount={lesson.questionCount} retry={retry === "1"} language={lesson.language} />
    </div>
  );
}
