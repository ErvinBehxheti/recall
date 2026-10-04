type Props = { value: number; label: string };

export function ProgressBar({ value, label }: Props) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-1 w-full bg-rule"
    >
      <div className="h-full bg-ink transition-[width] duration-200 ease-out" style={{ width: `${percent}%` }} />
    </div>
  );
}
