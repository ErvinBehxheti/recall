// src/app/teacher/lessons/[id]/results/page.tsx
import Link from "next/link";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { ResultsView } from "@/app-components/ResultsView";
import { buttonClass } from "@/components/Button";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { orNotFound } from "@/server/guard";
import { getLessonResults } from "@/server/results";

export default async function LessonResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("teacher");
  const { id } = await params;
  const { stored, enrolled, report } = orNotFound(() => getLessonResults(getDb(), user, parseId(id)));
  return (
    <PageShell user={user} width="max-w-4xl">
      <Link href={`/teacher/lessons/${stored.id}`} className={buttonClass("quiet", "text-[0.9375rem]")}>
        Back to the lesson
      </Link>
      <p className="mt-8 text-ink-soft">{stored.className}, results</p>
      <PageTitle>{stored.lesson.title}</PageTitle>
      {report ? (
        <ResultsView lessonId={stored.id} report={report} />
      ) : (
        <p className="mt-8 max-w-[52ch] text-[1.125rem] leading-relaxed">
          {stored.status === "draft"
            ? "This lesson is a draft. Publish it so students can take the quiz."
            : `No results yet. ${enrolled} ${enrolled === 1 ? "student has" : "students have"} joined ${stored.className}. Results appear here as soon as someone finishes the quiz.`}
        </p>
      )}
    </PageShell>
  );
}
