// src/app/learn/lessons/[id]/results/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/app-components/PageShell";
import { ScoreCounter } from "@/app-components/ScoreCounter";
import { buttonClass } from "@/components/Button";
import type { AttemptResult } from "@/lib/quiz-types";
import { verdict } from "@/lib/scoring";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { AccessError, InputError, parseId } from "@/server/errors";
import { orNotFound } from "@/server/guard";
import { getAttemptResult, latestFinishedAttemptId } from "@/server/quiz";
import { getStudentLesson } from "@/server/student";

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const user = await requireUser("student");
  const [{ id }, { attempt }] = await Promise.all([params, searchParams]);
  const lesson = orNotFound(() => getStudentLesson(getDb(), user, parseId(id)));
  const base = `/learn/lessons/${lesson.id}`;
  const attemptId = attempt ? Number(attempt) : latestFinishedAttemptId(getDb(), user.id, lesson.id);
  if (!attemptId) redirect(`${base}/quiz`);

  let result: AttemptResult;
  try {
    result = getAttemptResult(getDb(), user, attemptId);
  } catch (error) {
    if (error instanceof InputError) redirect(`${base}/quiz`);
    if (error instanceof AccessError) notFound();
    throw error;
  }
  if (result.lessonId !== lesson.id) notFound();

  return (
    <PageShell user={user}>
      <p lang={lesson.language} className="mb-4 text-[1.0625rem] text-ink-soft">
        {result.lessonTitle} quiz
      </p>
      <ScoreCounter correct={result.correct} total={result.total} verdict={verdict(result.correct, result.total)} />
      {!result.isFirst && (
        <p className="mt-4 text-ink-soft">This was practice. Your teacher sees your first attempt.</p>
      )}

      {result.missed.length > 0 && (
        <section aria-labelledby="review-title" lang={lesson.language} className="mt-14 max-w-3xl">
          <h2 id="review-title" className="font-serif text-[1.625rem] font-semibold">
            Pages to review
          </h2>
          <ul className="mt-6 grid gap-8">
            {result.missed.map((m) => (
              <li key={m.id}>
                <p className="font-serif text-[1.25rem] leading-snug">{m.question}</p>
                <p className="mt-2">
                  <span className="text-incorrect">Your answer:</span> {m.yourAnswer}
                </p>
                <p className="mt-1">
                  <span className="text-correct">Right answer:</span> {m.rightAnswer}
                </p>
                {m.pageNumber !== null && (
                  <Link
                    href={`${base}/pages/${m.pageNumber}?review=1&attempt=${result.attemptId}`}
                    className={buttonClass("quiet", "mt-3")}
                  >
                    Review page {m.pageNumber}: {m.pageTitle}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4">
        {result.missed.length > 0 && (
          <Link href={`${base}/quiz?retry=1`} className={buttonClass("primary")}>
            Retry missed questions
          </Link>
        )}
        <Link href={`/learn/${lesson.subject}`} className={buttonClass(result.missed.length > 0 ? "quiet" : "primary")}>
          Back to {lesson.className}
        </Link>
      </div>
    </PageShell>
  );
}
