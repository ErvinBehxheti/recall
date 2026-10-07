import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { buttonClass } from "@/components/Button";
import { isSubject, SUBJECT_LABELS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";
import { listStudentSubjects } from "@/server/classes";
import { getDb } from "@/server/db";
import { listSubjectLessons, type StudentLessonRow } from "@/server/student";

const progressText = (l: StudentLessonRow) =>
  l.progress === "done" && l.score
    ? `${l.score.correct} / ${l.score.total}`
    : { "not-started": "Not started", read: "Read", "in-progress": "In progress", done: "Done" }[l.progress];

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const user = await requireUser("student");
  const { subject } = await params;
  if (!isSubject(subject)) notFound();
  const mine = listStudentSubjects(getDb(), user).find((s) => s.subject === subject)!;
  const lessons = mine.classes.length ? listSubjectLessons(getDb(), user, subject) : [];
  return (
    <PageShell user={user} width="max-w-4xl">
      <PageTitle>{SUBJECT_LABELS[subject]}</PageTitle>
      {mine.classes.length === 0 ? (
        <>
          <p className="mt-6 max-w-[48ch] text-[1.125rem]">You have not joined a {SUBJECT_LABELS[subject]} class yet.</p>
          <Link href="/join" className={buttonClass("primary", "mt-8")}>
            Enter a class code
          </Link>
        </>
      ) : lessons.length === 0 ? (
        <p className="mt-6 max-w-[48ch] text-[1.125rem]">Your teacher has not published a lesson yet.</p>
      ) : (
        <ul className="mt-10 grid gap-1">
          {lessons.map((l) => (
            <li key={l.id}>
              <Link
                href={`/learn/lessons/${l.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 rounded-[4px] px-4 py-4 hover:bg-paper-raised"
              >
                <span>
                  <span className="font-serif text-[1.375rem] font-semibold">{l.title}</span>
                  <span className="block text-ink-soft">
                    {l.className}, {l.pageCount} pages, {l.questionCount} questions
                  </span>
                </span>
                <span className={l.progress === "done" ? "font-semibold" : "text-ink-soft"}>{progressText(l)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
