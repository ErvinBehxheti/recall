"use client";

import Link from "next/link";
import { SiteHeader } from "@/app-components/SiteHeader";
import { useRequiredLesson } from "@/app-components/useRequiredLesson";
import { buttonClass } from "@/components/Button";
import { StatsLine } from "@/components/StatsLine";
import { estimateMinutes } from "@/lib/estimate";

const pad = (n: number) => String(n).padStart(2, "0");

export default function LessonOverviewPage() {
  const state = useRequiredLesson();
  if (!state) return null;
  const { lesson, origin } = state;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-10 sm:px-8 sm:pt-16">
        <p className="text-[1.0625rem] text-ink-soft">
          {lesson.subject}
          {origin === "demo" && ", sample lesson"}
        </p>
        <h1 className="mt-2 font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
          {lesson.title}
        </h1>
        <div className="mt-4">
          <StatsLine minutes={estimateMinutes(lesson)} pages={lesson.cards.length} questions={lesson.quiz.length} />
        </div>
        <Link href="/lesson/1" className={buttonClass("primary", "mt-8")}>
          Start lesson
        </Link>

        <h2 className="mt-16 font-serif text-[1.375rem] font-semibold">What you will learn</h2>
        <ol className="mt-4 gap-x-12 sm:columns-2">
          {lesson.cards.map((card, i) => (
            <li key={card.id} className="break-inside-avoid">
              <Link
                href={`/lesson/${i + 1}`}
                className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline rounded-[2px] py-2.5 text-[1.0625rem] hover:bg-paper-raised"
              >
                <span className="font-serif text-ink-soft tabular-nums">{pad(i + 1)}</span>
                <span>{card.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
