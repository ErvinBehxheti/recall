"use client";

import Link from "next/link";
import { buttonClass } from "@/components/Button";
import { HighlightSwipe } from "@/components/HighlightSwipe";
import { MasteryBars } from "@/components/MasteryBars";
import { buildClassReport } from "@/lib/sample-class";
import { SiteHeader } from "./SiteHeader";
import { useAnimatedValue } from "./useAnimatedValue";
import { useRequiredLesson } from "./useRequiredLesson";

export function TeacherScreen() {
  const state = useRequiredLesson();
  const grow = useAnimatedValue(1, 700, 200);
  const swipe = useAnimatedValue(1, 800, 500);
  if (!state) return null;

  const { lesson } = state;
  const report = buildClassReport(lesson);
  const weakTitle = report.weakest.title.replace(/[.?!:]+$/, "");
  const [insightLead] = report.insight.split(weakTitle);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        <Link href="/results" className={buttonClass("quiet", "text-[0.9375rem]")}>
          Back to results
        </Link>

        <div className="mt-8 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <h1 className="font-serif text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-tight tracking-[-0.01em]">
            {lesson.title}
          </h1>
          <p className="rounded-[2px] bg-paper-raised px-2.5 py-1 text-[0.875rem] text-ink-soft">
            Preview with sample class data
          </p>
        </div>

        <section aria-labelledby="insight" className="mt-10 max-w-3xl">
          <h2 id="insight" className="sr-only">
            What to do next
          </h2>
          <p className="font-serif text-[clamp(1.5rem,3.2vw,2.25rem)] leading-snug">
            {report.insight.includes(weakTitle) ? (
              <>
                {insightLead}
                <HighlightSwipe progress={swipe}>{weakTitle}</HighlightSwipe>.
              </>
            ) : (
              report.insight
            )}
          </p>
          <Link
            href={`/lesson/${report.weakest.pageNumber}?review=1`}
            className={buttonClass("primary", "mt-6")}
          >
            Re-teach page {report.weakest.pageNumber}
          </Link>
        </section>

        <section aria-labelledby="mastery-title" className="mt-16 max-w-4xl">
          <h2 id="mastery-title" className="font-serif text-[1.5rem] font-semibold">
            Topic mastery
          </h2>
          <div className="mt-6">
            <MasteryBars topics={report.topics} grow={grow} highlightCardId={report.weakest.cardId} />
          </div>
        </section>

        <section aria-labelledby="help-title" className="mt-16 max-w-4xl">
          <h2 id="help-title" className="font-serif text-[1.5rem] font-semibold">
            Students who need help
          </h2>
          <ul className="mt-5 grid gap-3">
            {report.needHelp.map((s) => (
              <li key={s.name} className="grid grid-cols-[minmax(0,8rem)_4rem_minmax(0,1fr)] items-baseline gap-x-4 text-[1.0625rem]">
                <span className="font-semibold">{s.name}</span>
                <span className="tabular-nums text-ink-soft">{`${s.average}%`}</span>
                <span className="text-ink-soft">Weakest: {s.weakestTitle}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-16 text-[0.9375rem] text-ink-soft">
          Class of {report.classSize}, average {report.classAverage}%.
        </p>
      </main>
    </div>
  );
}
