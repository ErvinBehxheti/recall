import type { Card } from "@/lib/lesson-schema";
import { HighlightSwipe } from "./HighlightSwipe";

type Props = { card: Card; pageNumber: number; totalPages: number; highlightProgress: number };

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * One lesson page, set like a textbook page with the page number hanging in the margin.
 * Sizes follow its container, so it works full screen, as a small hero sample, and in the video.
 */
export function LessonPageView({ card, pageNumber, totalPages, highlightProgress }: Props) {
  return (
    <div className="@container">
      <article className="grid gap-x-10 gap-y-3 @2xl:grid-cols-[5.5rem_minmax(0,1fr)]">
        <div className="flex items-baseline gap-2 @2xl:block">
          <p aria-hidden className="font-serif text-[clamp(2.75rem,10cqi,5rem)] leading-none text-ink-soft/45 tabular-nums">
            {pad(pageNumber)}
          </p>
          <p className="text-[0.875rem] text-ink-soft @2xl:mt-2">
            <span className="sr-only">Page {pageNumber} </span>of {totalPages}
          </p>
        </div>

        <div className="max-w-[62ch]">
          <h1 className="font-serif text-[clamp(1.75rem,5cqi,2.75rem)] font-semibold leading-[1.15] tracking-[-0.01em]">
            {card.title}
          </h1>
          <p className="mt-5 font-serif text-[clamp(1.05rem,3.4cqi,1.25rem)] leading-[1.7] @2xl:mt-6">{card.explanation}</p>
          <ul className="mt-5 space-y-2 @2xl:mt-6 @2xl:space-y-2.5">
            {card.keyPoints.map((point) => (
              <li key={point} className="grid grid-cols-[1.25rem_minmax(0,1fr)] text-[clamp(0.95rem,3cqi,1.0625rem)] leading-relaxed">
                <span aria-hidden className="mt-[0.8em] h-[2px] w-2.5 rounded-sm bg-ink-soft/60" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="mt-7 font-serif text-[clamp(1.15rem,3.8cqi,1.375rem)] leading-[1.6] @2xl:mt-9">
            <span className="text-ink-soft">Remember this: </span>
            <HighlightSwipe progress={highlightProgress}>{card.rememberThis}</HighlightSwipe>
          </p>
        </div>
      </article>
    </div>
  );
}
