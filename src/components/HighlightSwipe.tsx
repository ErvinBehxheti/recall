// A hand-drawn marker stroke with uneven edges, drawn behind the text from left to right.
const STROKE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 40' preserveAspectRatio='none'%3E" +
  "%3Cpath d='M2 11C24 6 61 9 92 6s70 1 106 4l-1 21c-31 4-63 1-95 3S27 35 3 31z' fill='%23F2D04B' fill-opacity='.9'/%3E%3C/svg%3E\")";

type Props = { progress: number; children: React.ReactNode; className?: string };

/**
 * Pure: the caller drives `progress` from 0 to 1. Uses a background with box-decoration-break so
 * the stroke follows text that wraps onto several lines.
 */
export function HighlightSwipe({ progress, children, className = "" }: Props) {
  const p = Math.min(1, Math.max(0, progress));
  return (
    <span
      className={className}
      style={{
        backgroundImage: STROKE,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "0 70%",
        backgroundSize: `${p * 100}% 82%`,
        WebkitBoxDecorationBreak: "clone",
        boxDecorationBreak: "clone",
        padding: "0 0.18em",
        margin: "0 -0.18em",
      }}
    >
      {children}
    </span>
  );
}
