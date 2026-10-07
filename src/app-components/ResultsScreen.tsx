"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, buttonClass } from "@/components/Button";
import { ScoreView } from "@/components/ScoreView";
import { useLessonStore } from "@/lib/lesson-store";
import { activeQuestions } from "@/lib/lesson-state";
import { findCard, scoreQuiz, verdict } from "@/lib/scoring";
import { SiteHeader } from "./SiteHeader";
import { useAnimatedValue } from "./useAnimatedValue";
import { useRequiredLesson } from "./useRequiredLesson";

export function ResultsScreen() {
  const state = useRequiredLesson();
  const { retryMissed, clear } = useLessonStore();
  const router = useRouter();

  const complete = state !== null && activeQuestions(state).every((q) => state.answers[q.id] !== undefined);
  useEffect(() => {
    if (state && !complete) router.replace("/quiz");
  }, [state, complete, router]);

  const score = state ? scoreQuiz(state.lesson.quiz, state.answers) : null;
  const shown = Math.round(useAnimatedValue(score?.correct ?? 0, 900, 150));

  if (!state || !score || !complete) return null;
  const { lesson, answers } = state;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-10 sm:px-8 sm:pt-16">
        <p className="mb-4 text-[1.0625rem] text-ink-soft">{lesson.title} quiz</p>
        <ScoreView correct={score.correct} total={score.total} shown={shown} verdict={verdict(score.correct, score.total)} />

        {score.missed.length > 0 && (
          <section aria-labelledby="review-title" className="mt-14 max-w-3xl">
            <h2 id="review-title" className="font-serif text-[1.625rem] font-semibold">
              Pages to review
            </h2>
            <ul className="mt-6 grid gap-8">
              {score.missed.map((q) => {
                const found = findCard(lesson, q.cardId);
                const yours = answers[q.id];
                return (
                  <li key={q.id}>
                    <p className="font-serif text-[1.25rem] leading-snug">{q.question}</p>
                    {yours !== undefined && (
                      <p className="mt-2">
                        <span className="text-incorrect">Your answer:</span> {q.options[yours]}
                      </p>
                    )}
                    <p className="mt-1">
                      <span className="text-correct">Right answer:</span> {q.options[q.correctIndex]}
                    </p>
                    {found && (
                      <Link href={`/lesson/${found.pageNumber}?review=1`} className={buttonClass("quiet", "mt-3")}>
                        Review page {found.pageNumber}: {found.card.title}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4">
          {score.missed.length > 0 && (
            <Button
              onClick={() => {
                retryMissed();
                router.push("/quiz");
              }}
            >
              Retry missed questions
            </Button>
          )}
          <Link href="/sample-teacher" className={buttonClass(score.missed.length > 0 ? "quiet" : "primary")}>
            Teacher view
          </Link>
          <Button
            variant="quiet"
            onClick={() => {
              clear();
              router.push("/");
            }}
          >
            New lesson
          </Button>
        </div>
      </main>
    </div>
  );
}
