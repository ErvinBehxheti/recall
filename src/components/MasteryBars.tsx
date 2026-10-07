import type { TopicMastery } from "@/lib/class-report";

type Props = { topics: TopicMastery[]; grow: number; highlightCardId?: string };

export function MasteryBars({ topics, grow, highlightCardId }: Props) {
  return (
    <ol role="list" className="grid gap-5">
      {topics.map((t) => {
        const weak = t.cardId === highlightCardId;
        return (
          <li key={t.cardId} className="grid grid-cols-[2rem_minmax(0,1fr)_3rem] items-baseline gap-x-3 gap-y-1.5 sm:grid-cols-[2rem_minmax(0,16rem)_minmax(0,1fr)_3rem]">
            <span className="font-serif text-ink-soft tabular-nums">{t.pageNumber}</span>
            <span className="leading-snug">
              {t.title}
              {weak && <span className="block text-[0.875rem] text-incorrect">Needs re-teaching</span>}
            </span>
            <span className="col-span-3 col-start-1 row-start-2 h-2 self-center rounded-sm bg-rule sm:col-span-1 sm:col-start-3 sm:row-start-1">
              <span
                className={`block h-full rounded-sm ${weak ? "bg-incorrect" : "bg-ink"}`}
                style={{ width: `${t.percent * Math.min(1, Math.max(0, grow))}%` }}
              />
            </span>
            <span className="text-right tabular-nums sm:col-start-4">{`${t.percent}%`}</span>
          </li>
        );
      })}
    </ol>
  );
}
