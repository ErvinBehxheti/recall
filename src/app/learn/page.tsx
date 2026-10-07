import Link from "next/link";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { buttonClass } from "@/components/Button";
import { SUBJECT_LABELS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { listSubjectProgress } from "@/server/student";

export default async function LearnHome() {
  const user = await requireUser("student");
  const subjects = listSubjectProgress(getDb(), user);
  return (
    <PageShell user={user} width="max-w-4xl">
      <PageTitle>Your subjects</PageTitle>
      <ul className="mt-10 grid gap-1">
        {subjects.map(({ subject, classes, lessonCount, doneCount }) => (
          <li key={subject}>
            <Link
              href={`/learn/${subject}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 rounded-[4px] px-4 py-4 hover:bg-paper-raised"
            >
              <span className="font-serif text-[1.5rem] font-semibold">{SUBJECT_LABELS[subject]}</span>
              <span className="text-ink-soft">
                {classes.length === 0
                  ? "Enter a class code"
                  : lessonCount === 0
                    ? "No lessons yet"
                    : `${doneCount} of ${lessonCount} done`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/join" className={buttonClass("quiet", "mt-8")}>
        Join another class
      </Link>
    </PageShell>
  );
}
