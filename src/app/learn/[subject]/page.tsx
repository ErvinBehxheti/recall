// src/app/learn/[subject]/page.tsx  (lessons arrive in Task 12)
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { buttonClass } from "@/components/Button";
import { isSubject, SUBJECT_LABELS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";
import { listStudentSubjects } from "@/server/classes";
import { getDb } from "@/server/db";

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const user = await requireUser("student");
  const { subject } = await params;
  if (!isSubject(subject)) notFound();
  const mine = listStudentSubjects(getDb(), user).find((s) => s.subject === subject)!;
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
      ) : (
        <p className="mt-4 text-ink-soft">{mine.classes.map((c) => c.name).join(", ")}</p>
      )}
    </PageShell>
  );
}
