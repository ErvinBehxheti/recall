// src/app/learn/lessons/[id]/pages/[n]/page.tsx
import { redirect } from "next/navigation";
import { AppHeader } from "@/app-components/AppHeader";
import { LessonReader } from "@/app-components/LessonReader";
import { ProgressBar } from "@/components/ProgressBar";
import { parsePageParam } from "@/lib/pages";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { orNotFound } from "@/server/guard";
import { getStudentLesson } from "@/server/student";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; n: string }>;
  searchParams: Promise<{ review?: string; attempt?: string }>;
}) {
  const user = await requireUser("student");
  const [{ id, n }, { review, attempt }] = await Promise.all([params, searchParams]);
  const lesson = orNotFound(() => getStudentLesson(getDb(), user, parseId(id)));
  const page = parsePageParam(n, lesson.cards.length);
  if (page === null) redirect(`/learn/lessons/${lesson.id}/pages/1`);
  const reviewAttempt = review === "1" && Number.isInteger(Number(attempt)) ? Number(attempt) : null;
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={user} />
      <ProgressBar value={page / lesson.cards.length} label="Lesson progress" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-14 pt-10 sm:px-8 sm:pt-14">
        <LessonReader
          lessonId={lesson.id}
          cards={lesson.cards}
          page={page}
          language={lesson.language}
          reviewAttempt={reviewAttempt}
        />
      </main>
    </div>
  );
}
