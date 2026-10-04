"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { HighlightSwipe } from "@/components/HighlightSwipe";
import { ProgressBar } from "@/components/ProgressBar";
import { QuizQuestionView } from "@/components/QuizQuestionView";
import { useLessonStore } from "@/lib/lesson-store";
import { activeQuestions } from "@/lib/lesson-state";
import { nextQuestionIndex } from "@/lib/scoring";
import { SiteHeader } from "./SiteHeader";
import { useAnimatedValue } from "./useAnimatedValue";
import { useKey } from "./useKey";
import { useRequiredLesson } from "./useRequiredLesson";

export function QuizScreen() {
  const state = useRequiredLesson();
  const { answer } = useLessonStore();
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const questions = state ? activeQuestions(state) : [];
  const answers = state?.answers ?? {};
  const answered = questions.filter((q) => answers[q.id] !== undefined).length;
  const revealedIndex = questions.findIndex((q) => q.id === revealedId);
  // A refresh resumes at the first unanswered question (answers live in sessionStorage).
  const currentIndex = revealedIndex >= 0 ? revealedIndex : nextQuestionIndex(questions, answers);
  const current = currentIndex >= 0 ? questions[currentIndex] : null;
  const showIntro = !started && answered === 0;
  const finished = state !== null && current === null;
  const isLast = current !== null && answered >= questions.length - (revealedId ? 0 : 1);
  const isRetry = state !== null && state.activeQuestionIds.length < state.lesson.quiz.length;

  useEffect(() => {
    if (finished) router.replace("/results");
  }, [finished, router]);

  function choose(index: number) {
    if (!current || revealedId || showIntro) return;
    answer(current.id, index);
    setRevealedId(current.id);
  }

  function next() {
    if (!revealedId) return;
    if (isLast) router.push("/results");
    else setRevealedId(null);
  }

  const answering = current !== null && !revealedId && !showIntro;
  useKey("1", () => choose(0), answering);
  useKey("2", () => choose(1), answering);
  useKey("3", () => choose(2), answering);
  useKey("4", () => choose(3), answering);
  useKey("Enter", () => (showIntro ? setStarted(true) : next()), showIntro || revealedId !== null);
  useKey("ArrowRight", next, revealedId !== null);

  if (!state || !current) return null;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <ProgressBar value={showIntro ? 0 : answered / questions.length} label="Quiz progress" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-14 pt-10 sm:px-8 sm:pt-16">
        {showIntro ? (
          <QuizIntro count={questions.length} retry={isRetry} onStart={() => setStarted(true)} />
        ) : (
          <>
            <QuizQuestionView
              key={current.id}
              question={current}
              number={currentIndex + 1}
              total={questions.length}
              selectedIndex={answers[current.id] ?? null}
              revealed={revealedId === current.id}
              onSelect={choose}
            />
            {revealedId && (
              <Button className="mt-8" onClick={next} autoFocus>
                {isLast ? "See results" : "Next question"}
              </Button>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function QuizIntro({ count, retry, onStart }: { count: number; retry: boolean; onStart: () => void }) {
  const swipe = useAnimatedValue(1, 800, 200);
  return (
    <section className="max-w-2xl">
      <h1 className="font-serif text-[clamp(2.5rem,6vw,4.25rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
        <HighlightSwipe progress={swipe}>{retry ? "Second try" : "Quiz unlocked"}</HighlightSwipe>
      </h1>
      <p className="mt-6 font-serif text-[1.375rem] leading-relaxed">
        {retry
          ? `${count} ${count === 1 ? "question" : "questions"} you missed. Take another shot.`
          : `${count} questions. Every wrong answer links back to the page that teaches it.`}
      </p>
      <Button className="mt-9" onClick={onStart}>
        Start quiz
      </Button>
      <p className="mt-4 text-[0.9375rem] text-ink-soft">Tip: answer with the 1 to 4 keys, then press Enter.</p>
    </section>
  );
}
