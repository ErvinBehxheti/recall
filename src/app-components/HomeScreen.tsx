// src/app-components/HomeScreen.tsx
import Link from "next/link";
import { buttonClass } from "@/components/Button";
import { LessonPageView } from "@/components/LessonPageView";
import { BRAND } from "@/config/brand";
import { DEFAULT_DEMO_SLUG, getDemo } from "@/demo";
import { PageShell } from "./PageShell";

const demo = getDemo(DEFAULT_DEMO_SLUG)!;
const SAMPLE_CARD_INDEX = 3;

export function HomeScreen() {
  return (
    <PageShell>
      <div className="grid items-center gap-14 pt-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <h1 className="max-w-[17ch] font-serif text-[clamp(2.4rem,4.4vw,3.6rem)] font-semibold leading-[1.06] tracking-[-0.02em]">
            Turn tonight&apos;s slides into a lesson your class actually remembers.
          </h1>
          <p className="mt-6 max-w-[50ch] text-[1.25rem] leading-relaxed text-ink-soft">
            {BRAND.name} rewrites any deck into short pages students study at their own pace, then quizzes each of them
            privately and sends every wrong answer back to the page that teaches it. You see where the class got stuck.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/signup" className={buttonClass("primary")}>
              Get started
            </Link>
            <Link href="/login" className={buttonClass("quiet")}>
              Log in
            </Link>
          </div>
          <p className="mt-7 text-[0.9375rem] text-ink-soft">
            Works with PDF and PowerPoint. Ready in under a minute. Students join with a class code from their teacher.
          </p>
        </div>

        <figure className="relative mx-auto w-full max-w-[34rem]">
          <div aria-hidden className="-rotate-[1.2deg] rounded-[2px] border border-rule bg-sheet px-7 py-7 sm:px-9 sm:py-8">
            <LessonPageView
              card={demo.lesson.cards[SAMPLE_CARD_INDEX]}
              pageNumber={SAMPLE_CARD_INDEX + 1}
              totalPages={demo.lesson.cards.length}
              highlightProgress={1}
            />
          </div>
          <figcaption className="mt-5 text-center text-[0.875rem] text-ink-soft">
            A page from a lesson on {demo.lesson.title.toLowerCase()}.
          </figcaption>
        </figure>
      </div>
    </PageShell>
  );
}
