"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/Button";
import { LessonPageView } from "@/components/LessonPageView";
import { ProgressBar } from "@/components/ProgressBar";
import type { Card } from "@/lib/lesson-schema";
import { parsePageParam } from "@/lib/pages";
import { cardSpeechText } from "@/lib/speech";
import { ReadAloudButton } from "./ReadAloudButton";
import { SiteHeader } from "./SiteHeader";
import { useAnimatedValue } from "./useAnimatedValue";
import { useKey } from "./useKey";
import { useRequiredLesson } from "./useRequiredLesson";

const SWIPE_THRESHOLD_PX = 60;

// Remembers the last page shown so the next page can slide in from the direction of travel.
let lastPageShown = 0;

export function LessonPageScreen() {
  const state = useRequiredLesson();
  const params = useParams<{ n: string }>();
  const review = useSearchParams().get("review") === "1";
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const pointerStart = useRef<number | null>(null);

  const total = state?.lesson.cards.length ?? 0;
  const page = state ? parsePageParam(params.n, total) : null;

  useEffect(() => {
    if (state && page === null) router.replace("/lesson/1");
  }, [state, page, router]);

  const direction = page !== null && page < lastPageShown ? -1 : 1;
  useEffect(() => {
    if (page !== null) lastPageShown = page;
  }, [page]);

  const nextHref = page === null ? "/lesson" : page < total ? `/lesson/${page + 1}` : "/quiz";
  const backHref = page !== null && page > 1 ? `/lesson/${page - 1}` : null;
  const canNavigate = page !== null && !review;

  useKey("ArrowRight", () => router.push(nextHref), canNavigate);
  useKey("ArrowLeft", () => backHref && router.push(backHref), canNavigate && backHref !== null);

  if (!state || page === null) return null;
  const card = state.lesson.cards[page - 1];

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <ProgressBar value={page / total} label="Lesson progress" />
      <main
        className="@container mx-auto w-full max-w-6xl flex-1 px-5 pb-14 pt-10 sm:px-8 sm:pt-14"
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
        {review && (
          <p className="mb-8 text-[1.0625rem] text-ink-soft @2xl:pl-32">You missed a question about this page.</p>
        )}
        <motion.div
          key={page}
          initial={reduceMotion ? false : { opacity: 0, x: 18 * direction }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <PageWithSwipe card={card} pageNumber={page} totalPages={total} />
        </motion.div>

        <nav aria-label="Lesson pages" className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 @2xl:pl-32">
          {review ? (
            <Link href="/results" className={buttonClass("primary")}>
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
          <ReadAloudButton key={page} text={cardSpeechText(card)} />
        </nav>
      </main>
    </div>
  );
}

function PageWithSwipe({ card, pageNumber, totalPages }: { card: Card; pageNumber: number; totalPages: number }) {
  const swipe = useAnimatedValue(1, 650, 250);
  return <LessonPageView card={card} pageNumber={pageNumber} totalPages={totalPages} highlightProgress={swipe} />;
}
