// src/app/learn/lessons/[id]/page.tsx
import Link from "next/link";
import { PageShell } from "@/app-components/PageShell";
import { buttonClass } from "@/components/Button";
import { StatsLine } from "@/components/StatsLine";
import { SUBJECT_LABELS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { orNotFound } from "@/server/guard";
import { latestFinishedAttemptId } from "@/server/quiz";
import { getStudentLesson } from "@/server/student";

const pad = (n: number) => String(n).padStart(2, "0");

export default async function LessonOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("student");
  const { id } = await params;
  const lesson = orNotFound(() => getStudentLesson(getDb(), user, parseId(id)));
  const base = `/learn/lessons/${lesson.id}`;
  const finished = latestFinishedAttemptId(getDb(), user.id, lesson.id);
  return (
    <PageShell user={user}>
      <Link href={`/learn/${lesson.subject}`} className={buttonClass("quiet", "text-[0.9375rem]")}>
        Back to {SUBJECT_LABELS[lesson.subject]}
      </Link>
      <p className="mt-8 text-[1.0625rem] text-ink-soft">
        {SUBJECT_LABELS[lesson.subject]}, {lesson.className}
      </p>
      <h1
        lang={lesson.language}
        className="mt-2 font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.02em]"
      >
        {lesson.title}
      </h1>
      <div className="mt-4">
        <StatsLine minutes={lesson.minutes} pages={lesson.cards.length} questions={lesson.questionCount} />
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
        {finished ? (
          <>
            <Link href={`${base}/results?attempt=${finished}`} className={buttonClass("primary")}>
              See your result
            </Link>
            <Link href={`${base}/pages/1`} className={buttonClass("quiet")}>
              Read the lesson again
            </Link>
            <Link href={`${base}/quiz`} className={buttonClass("quiet")}>
              Practice the quiz
            </Link>
          </>
        ) : (
          <Link href={`${base}/pages/1`} className={buttonClass("primary")}>
            Start lesson
          </Link>
        )}
      </div>

      <h2 className="mt-16 font-serif text-[1.375rem] font-semibold">What you will learn</h2>
      <ol lang={lesson.language} className="mt-4 gap-x-12 sm:columns-2">
        {lesson.cards.map((card, i) => (
          <li key={card.id} className="break-inside-avoid">
            <Link
              href={`${base}/pages/${i + 1}`}
              className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline rounded-[2px] py-2.5 text-[1.0625rem] hover:bg-paper-raised"
            >
              <span className="font-serif tabular-nums text-ink-soft">{pad(i + 1)}</span>
              <span>{card.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </PageShell>
  );
}
