import Link from "next/link";
import { ClassUpload } from "@/app-components/ClassUpload";
import { PageShell, PageTitle, SectionTitle } from "@/app-components/PageShell";
import { SUBJECT_LABELS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";
import { getTeacherClass, listClassStudents } from "@/server/classes";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { orNotFound } from "@/server/guard";
import { listClassLessons } from "@/server/lessons";

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("teacher");
  const { id } = await params;
  const cls = orNotFound(() => getTeacherClass(getDb(), user, parseId(id)));
  const students = listClassStudents(getDb(), user, cls.id);
  const lessons = listClassLessons(getDb(), user, cls.id);
  return (
    <PageShell user={user}>
      <p className="text-ink-soft">{SUBJECT_LABELS[cls.subject]}</p>
      <PageTitle>{cls.name}</PageTitle>

      <section aria-labelledby="lessons-title" className="mt-12 max-w-3xl">
        <SectionTitle id="lessons-title">Lessons</SectionTitle>
        <div className="mt-5">
          <ClassUpload classId={cls.id} />
        </div>
        {lessons.length > 0 && (
          <ul className="mt-8 grid gap-1">
            {lessons.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/teacher/lessons/${l.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 rounded-[4px] px-4 py-3 hover:bg-paper-raised"
                >
                  <span>
                    <span className="font-serif text-[1.25rem] font-semibold">{l.title}</span>
                    <span className="block text-ink-soft">
                      {l.pageCount} pages, {l.questionCount} questions
                    </span>
                  </span>
                  <span className={l.status === "published" ? "font-semibold" : "text-ink-soft"}>
                    {l.status === "published" ? "Published" : "Draft"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="code-title" className="mt-14">
        <h2 id="code-title" className="text-ink-soft">
          Class code
        </h2>
        <p data-testid="join-code" className="mt-1 font-serif text-[clamp(2.5rem,7vw,4rem)] font-semibold tracking-[0.12em]">
          {cls.joinCode}
        </p>
        <p className="mt-2 max-w-[48ch] text-ink-soft">Students enter this code after they sign up.</p>
      </section>

      <section aria-labelledby="students-title" className="mt-14 max-w-3xl">
        <SectionTitle id="students-title">
          {students.length} {students.length === 1 ? "student" : "students"}
        </SectionTitle>
        {students.length > 0 && (
          <ul className="mt-3 grid gap-1 text-[1.0625rem]">
            {students.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
