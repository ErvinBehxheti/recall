// src/app-components/ResultsView.tsx
"use client";

import Link from "next/link";
import { buttonClass } from "@/components/Button";
import { HighlightSwipe } from "@/components/HighlightSwipe";
import { MasteryBars } from "@/components/MasteryBars";
import { insightParts, type ClassReport, type StudentRow } from "@/lib/class-report";
import { useAnimatedValue } from "./useAnimatedValue";

const STATUS_TEXT: Record<StudentRow["status"], string> = {
  finished: "Finished",
  "in-progress": "In progress",
  "not-started": "Not started",
};

export function ResultsView({ lessonId, report }: { lessonId: number; report: ClassReport }) {
  const grow = useAnimatedValue(1, 700, 200);
  const swipe = useAnimatedValue(1, 800, 500);
  const insight = insightParts(report);

  return (
    <>
      <section aria-labelledby="insight" className="mt-10 max-w-3xl">
        <h2 id="insight" className="sr-only">
          What to do next
        </h2>
        <p className="font-serif text-[clamp(1.5rem,3.2vw,2.25rem)] leading-snug">
          {insight.before}
          {insight.highlight && <HighlightSwipe progress={swipe}>{insight.highlight}</HighlightSwipe>}
          {insight.after}
        </p>
        <Link href={`/teacher/lessons/${lessonId}#page-${report.weakest.pageNumber}`} className={buttonClass("primary", "mt-6")}>
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

      <section aria-labelledby="students-title" className="mt-16 max-w-4xl">
        <h2 id="students-title" className="font-serif text-[1.5rem] font-semibold">
          Students
        </h2>
        <table className="mt-5 w-full border-separate border-spacing-y-2 text-left text-[1.0625rem]">
          <thead className="text-[0.9375rem] text-ink-soft">
            <tr>
              <th scope="col" className="pr-4 font-normal">
                Student
              </th>
              <th scope="col" className="pr-4 font-normal">
                First attempt
              </th>
              <th scope="col" className="pr-4 font-normal">
                Status
              </th>
              <th scope="col" className="font-normal">
                Weakest topic
              </th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r, i) => {
              const done = r.status === "finished";
              return (
                <tr key={i}>
                  <th scope="row" className="pr-4 font-semibold">
                    {r.name}
                  </th>
                  <td className="pr-4 tabular-nums">{done ? `${r.correctCount} / ${r.total}` : "Not yet"}</td>
                  <td className="pr-4 text-ink-soft">{STATUS_TEXT[r.status]}</td>
                  <td className="text-ink-soft">{done ? (r.weakestTitle ?? "None") : "Not yet"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <p className="mt-16 text-[0.9375rem] text-ink-soft">
        Based on {report.finished} of {report.enrolled} students who finished the quiz. Class average {report.classAverage}%.
        Only each student&apos;s first attempt counts.
      </p>
    </>
  );
}
