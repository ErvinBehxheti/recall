// src/app-components/QuizRunner.tsx
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { HighlightSwipe } from "@/components/HighlightSwipe";
import { ProgressBar } from "@/components/ProgressBar";
import { QuizQuestionView } from "@/components/QuizQuestionView";
import type { AttemptView, Feedback } from "@/lib/quiz-types";
import { useAnimatedValue } from "./useAnimatedValue";
import { useKey } from "./useKey";

type Props = { lessonId: number; questionCount: number; retry: boolean; language: string };

const FAILED = "Something went wrong. Try again.";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.message ?? FAILED);
  return data as T;
}

export function QuizRunner({ lessonId, questionCount, retry, language }: Props) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const questions = attempt?.questions ?? [];
  const answeredCount = questions.filter((q) => feedback[q.id]).length;
  const revealedIndex = questions.findIndex((q) => q.id === revealedId);
  // A reload resumes at the first question without an answer.
  const currentIndex = revealedIndex >= 0 ? revealedIndex : questions.findIndex((q) => !feedback[q.id]);
  const current = currentIndex >= 0 ? questions[currentIndex] : null;
  const isLast = revealedId !== null && answeredCount >= questions.length;
  const resultsHref = attempt ? `/learn/lessons/${lessonId}/results?attempt=${attempt.attemptId}` : "";

  async function run(job: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      await job();
    } catch (e) {
      setError(e instanceof Error ? e.message : FAILED);
    } finally {
      busy.current = false;
    }
  }

  const start = () =>
    run(async () => {
      const data = await post<{ attempt: AttemptView }>(`/api/learn/lessons/${lessonId}/attempts`, { mode: retry ? "retry" : "start" });
      setAttempt(data.attempt);
      setFeedback(data.attempt.answered);
    });

  const choose = (index: number) =>
    run(async () => {
      if (!attempt || !current || revealedId) return;
      const data = await post<{ feedback: Feedback }>(`/api/learn/attempts/${attempt.attemptId}/answers`, { qid: current.id, index });
      setFeedback((f) => ({ ...f, [current.id]: data.feedback }));
      setRevealedId(current.id);
    });

  function next() {
    if (!revealedId) return;
    if (isLast) router.push(resultsHref);
    else setRevealedId(null);
  }

  const intro = attempt === null;
  const answering = current !== null && revealedId === null && !intro;
  useKey("1", () => void choose(0), answering);
  useKey("2", () => void choose(1), answering);
  useKey("3", () => void choose(2), answering);
  useKey("4", () => void choose(3), answering);
  useKey("Enter", () => (intro ? void start() : next()), intro || revealedId !== null);
  useKey("ArrowRight", next, revealedId !== null);

  return (
    <>
      <ProgressBar value={intro || questions.length === 0 ? 0 : answeredCount / questions.length} label="Quiz progress" />
      <main lang={language} className="mx-auto w-full max-w-6xl flex-1 px-5 pb-14 pt-10 sm:px-8 sm:pt-16">
        {intro ? (
          <QuizIntro count={questionCount} retry={retry} onStart={() => void start()} />
        ) : current === null ? (
          <Button onClick={() => router.push(resultsHref)}>See results</Button>
        ) : (
          <>
            <QuizQuestionView
              key={current.id}
              question={{
                id: current.id,
                question: current.question,
                options: current.options,
                cardId: "",
                correctIndex: feedback[current.id]?.correctIndex ?? -1,
                explanation: feedback[current.id]?.explanation ?? "",
              }}
              number={currentIndex + 1}
              total={questions.length}
              selectedIndex={feedback[current.id]?.chosenIndex ?? null}
              revealed={revealedId === current.id}
              onSelect={(i) => void choose(i)}
            />
            {revealedId && (
              <Button className="mt-8" onClick={next} autoFocus>
                {isLast ? "See results" : "Next question"}
              </Button>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="mt-6 text-incorrect">
            {error}
          </p>
        )}
      </main>
    </>
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
          ? "The questions you missed. Take another shot. This one is practice."
          : `${count} questions. Every wrong answer links back to the page that teaches it.`}
      </p>
      <Button className="mt-9" onClick={onStart}>
        Start quiz
      </Button>
      <p className="mt-4 text-[0.9375rem] text-ink-soft">Tip: answer with the 1 to 4 keys, then press Enter.</p>
    </section>
  );
}
