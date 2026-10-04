type Props = { correct: number; total: number; shown: number; verdict: string };

/** `shown` is the animated count from 0 to `correct`; screen readers get the final score. */
export function ScoreView({ correct, total, shown, verdict }: Props) {
  return (
    <div>
      <p className="sr-only">
        You scored {correct} out of {total}.
      </p>
      <p aria-hidden className="font-serif text-[clamp(4.5rem,13vw,8.5rem)] font-semibold leading-none tracking-[-0.02em] tabular-nums">
        {`${shown} / ${total}`}
      </p>
      <p className="mt-5 max-w-[40ch] font-serif text-[1.5rem] leading-snug">{verdict}</p>
    </div>
  );
}
