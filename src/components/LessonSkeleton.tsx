type Props = { filled: number; rows: number; lines: string[]; activeLine: number };

/** The lesson taking shape: placeholder rows become solid as the status lines advance. */
export function LessonSkeleton({ filled, rows, lines, activeLine }: Props) {
  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-16">
      <div aria-hidden className="space-y-5">
        <div className="h-9 w-2/3 rounded-[2px] bg-paper-raised" />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-4">
            <div className={`h-6 rounded-[2px] ${i < filled ? "bg-ink-soft/35" : "skeleton-pulse bg-paper-raised"}`} />
            <div
              className={`h-3.5 rounded-[2px] ${i < filled ? "bg-ink-soft/35" : "skeleton-pulse bg-paper-raised"}`}
              style={{ width: `${55 + ((i * 37) % 40)}%` }}
            />
          </div>
        ))}
      </div>
      <ol role="list" className="space-y-3 self-end text-[1.0625rem]">
        {lines.map((line, i) => (
          <li key={line} className={i < activeLine ? "text-ink-soft" : i === activeLine ? "font-semibold text-ink" : "text-ink-soft/50"}>
            {line}
          </li>
        ))}
      </ol>
    </div>
  );
}
