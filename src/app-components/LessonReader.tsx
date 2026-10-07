// src/app-components/LessonReader.tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/Button";
import { LessonPageView } from "@/components/LessonPageView";
import type { Card } from "@/lib/lesson-schema";
import { cardSpeechText } from "@/lib/speech";
import { ReadAloudButton } from "./ReadAloudButton";
import { useAnimatedValue } from "./useAnimatedValue";
import { useKey } from "./useKey";

const SWIPE_THRESHOLD_PX = 60;

type Props = { lessonId: number; cards: Card[]; page: number; language: string; reviewAttempt: number | null };

export function LessonReader({ lessonId, cards, page, language, reviewAttempt }: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const pointerStart = useRef<number | null>(null);

  const total = cards.length;
  const base = `/learn/lessons/${lessonId}`;
  const review = reviewAttempt !== null;
  const nextHref = page < total ? `${base}/pages/${page + 1}` : `${base}/quiz`;
  const backHref = page > 1 ? `${base}/pages/${page - 1}` : null;
  const canNavigate = !review;

  useKey("ArrowRight", () => router.push(nextHref), canNavigate);
  useKey("ArrowLeft", () => backHref && router.push(backHref), canNavigate && backHref !== null);

  // Reaching the last page counts as having read the lesson.
  useEffect(() => {
    if (!review && page === total) void fetch(`/api/learn/lessons/${lessonId}/read`, { method: "POST" }).catch(() => {});
  }, [review, page, total, lessonId]);

  const card = cards[page - 1];

  return (
    <div
      className="@container"
      onPointerDown={(e) => {
        if (e.pointerType === "touch") pointerStart.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (pointerStart.current === null || !canNavigate) return;
        const dx = e.clientX - pointerStart.current;
        pointerStart.current = null;
        if (dx < -SWIPE_THRESHOLD_PX) router.push(nextHref);
        if (dx > SWIPE_THRESHOLD_PX && backHref) router.push(backHref);
      }}
    >
      {review && <p className="mb-8 text-[1.0625rem] text-ink-soft @2xl:pl-32">You missed a question about this page.</p>}
      <motion.div
        key={page}
        lang={language}
        initial={reduceMotion ? false : { opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <PageWithSwipe card={card} pageNumber={page} totalPages={total} />
      </motion.div>

      <nav aria-label="Lesson pages" className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 @2xl:pl-32">
        {review ? (
          <Link href={`${base}/results?attempt=${reviewAttempt}`} className={buttonClass("primary")}>
            Back to results
          </Link>
        ) : (
          <Link href={nextHref} className={buttonClass("primary")}>
            {page < total ? "Next page" : "Finish lesson"}
          </Link>
        )}
        {!review && backHref && (
          <Link href={backHref} className={buttonClass("quiet")}>
            Back
          </Link>
        )}
        <ReadAloudButton key={page} text={cardSpeechText(card)} lang={language} />
      </nav>
    </div>
  );
}

function PageWithSwipe({ card, pageNumber, totalPages }: { card: Card; pageNumber: number; totalPages: number }) {
  const swipe = useAnimatedValue(1, 650, 250);
  return <LessonPageView card={card} pageNumber={pageNumber} totalPages={totalPages} highlightProgress={swipe} />;
}
