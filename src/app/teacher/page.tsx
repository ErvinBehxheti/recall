// src/app/teacher/page.tsx  (replaces the placeholder; attention lines arrive in Task 15)
import Link from "next/link";
import { PageShell, PageTitle, SectionTitle } from "@/app-components/PageShell";
import { buttonClass } from "@/components/Button";
import { SUBJECT_LABELS, SUBJECTS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";
import { listTeacherClasses } from "@/server/classes";
import { getDb } from "@/server/db";
import { listAttention } from "@/server/results";

export default async function TeacherHome() {
  const user = await requireUser("teacher");
  const classes = listTeacherClasses(getDb(), user);
  const attention = listAttention(getDb(), user);
  return (
    <PageShell user={user}>
      <PageTitle>Your classes</PageTitle>
      <Link href="/teacher/classes/new" className={buttonClass("primary", "mt-8")}>
        Create class
      </Link>
      {SUBJECTS.map((subject) => {
        const mine = classes.filter((c) => c.subject === subject);
        return (
          <section key={subject} aria-labelledby={`subject-${subject}`} className="mt-12 max-w-3xl">
            <SectionTitle id={`subject-${subject}`}>{SUBJECT_LABELS[subject]}</SectionTitle>
            {mine.length === 0 ? (
              <p className="mt-2 text-ink-soft">No class yet.</p>
            ) : (
              <ul className="mt-3 grid gap-1">
                {mine.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/teacher/classes/${c.id}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 rounded-[4px] px-4 py-3 hover:bg-paper-raised"
                    >
                      <span className="text-[1.125rem] font-semibold">{c.name}</span>
                      <span className="text-ink-soft">
                        {c.studentCount} {c.studentCount === 1 ? "student" : "students"}, {c.lessonCount}{" "}
                        {c.lessonCount === 1 ? "lesson" : "lessons"}
                      </span>
                    </Link>
                    {attention
                      .filter((a) => a.classId === c.id)
                      .map((a) => (
                        <Link
                          key={a.lessonId}
                          href={`/teacher/lessons/${a.lessonId}/results`}
                          className="block rounded-[4px] px-4 pb-2 text-incorrect hover:underline"
                        >
                          {a.lessonTitle}: page {a.pageNumber} needs re-teaching.
                        </Link>
                      ))}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </PageShell>
  );
}
