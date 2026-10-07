// src/app/teacher/lessons/[id]/page.tsx  (Task 15 adds the "See results" link to the published view)
import Link from "next/link";
import { LessonEditor } from "@/app-components/LessonEditor";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { UnpublishButton } from "@/app-components/UnpublishButton";
import { buttonClass } from "@/components/Button";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { orNotFound } from "@/server/guard";
import { getTeacherLesson } from "@/server/lessons";

export default async function LessonReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("teacher");
  const { id } = await params;
  const stored = orNotFound(() => getTeacherLesson(getDb(), user, parseId(id)));
  const published = stored.status === "published";
  const { lesson } = stored;
  return (
    <PageShell user={user} width="max-w-4xl">
      <Link href={`/teacher/classes/${stored.classId}`} className={buttonClass("quiet", "text-[0.9375rem]")}>
        Back to {stored.className}
      </Link>
      <p className="mt-8 text-ink-soft">
        {lesson.subject}, {published ? "published" : "draft"}
      </p>
      <PageTitle>{lesson.title}</PageTitle>

      {published ? (
        <>
          <p className="mt-4 max-w-[52ch] text-[1.125rem]">
            Students in {stored.className} can open this lesson. It is read-only while it is published.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
            <Link href={`/teacher/lessons/${stored.id}/results`} className={buttonClass("primary")}>
              See results
            </Link>
            <UnpublishButton lessonId={stored.id} />
          </div>
          <ol className="mt-12 grid max-w-3xl gap-8">
            {lesson.cards.map((card, i) => (
              <li key={card.id} id={`page-${i + 1}`}>
                <h2 className="font-serif text-[1.375rem] font-semibold">
                  {i + 1}. {card.title}
                </h2>
                <p className="mt-2 text-[1.0625rem] leading-relaxed">{card.explanation}</p>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <LessonEditor lessonId={stored.id} classId={stored.classId} initial={lesson} />
      )}
    </PageShell>
  );
}
