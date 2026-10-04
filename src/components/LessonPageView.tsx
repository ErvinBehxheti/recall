import type { Card } from "@/lib/lesson-schema";
import { HighlightSwipe } from "./HighlightSwipe";

type Props = { card: Card; pageNumber: number; totalPages: number; highlightProgress: number };

const pad = (n: number) => String(n).padStart(2, "0");

/** One lesson page, set like a textbook page: page number hanging in the margin. */
export function LessonPageView({ card, pageNumber, totalPages, highlightProgress }: Props) {
  return (
    <article className="grid gap-x-10 gap-y-3 md:grid-cols-[5.5rem_minmax(0,1fr)]">
      <div className="flex items-baseline gap-2 md:block">
        <p aria-hidden className="font-serif text-[clamp(3rem,7vw,5rem)] leading-none text-ink-soft/45 tabular-nums">
          {pad(pageNumber)}
        </p>
        <p className="text-[0.875rem] text-ink-soft md:mt-2">
          <span className="sr-only">Page {pageNumber} </span>of {totalPages}
        </p>
      </div>

      <div className="max-w-[62ch]">
        <h1 className="font-serif text-[clamp(1.9rem,4vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.01em]">
          {card.title}
        </h1>
        <p className="mt-6 font-serif text-[1.25rem] leading-[1.7]">{card.explanation}</p>
        <ul className="mt-6 space-y-2.5">
          {card.keyPoints.map((point) => (
            <li key={point} className="grid grid-cols-[1.25rem_minmax(0,1fr)] text-[1.0625rem] leading-relaxed">
              <span aria-hidden className="mt-[0.8em] h-[2px] w-2.5 rounded-sm bg-ink-soft/60" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <p className="mt-9 font-serif text-[1.375rem] leading-[1.6]">
          <span className="text-ink-soft">Remember this: </span>
          <HighlightSwipe progress={highlightProgress}>{card.rememberThis}</HighlightSwipe>
        </p>
      </div>
    </article>
  );
}
