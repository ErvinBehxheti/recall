// remotion/Marker.tsx
import type { CSSProperties } from "react";

// The same uneven marker stroke the app's HighlightSwipe uses, as a free-standing overlay.
// Multiply blending lets it sit on top of a screenshot while the text underneath stays dark,
// like a real highlighter.
const STROKE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 40' preserveAspectRatio='none'%3E" +
  "%3Cpath d='M2 11C24 6 61 9 92 6s70 1 106 4l-1 21c-31 4-63 1-95 3S27 35 3 31z' fill='%23F2D04B' fill-opacity='.95'/%3E%3C/svg%3E\")";

type Props = { progress: number; style: CSSProperties };

/** `style` places and sizes the stroke (left, top, width, height); `progress` draws it left to right. */
export function Marker({ progress, style }: Props) {
  const p = Math.min(1, Math.max(0, progress));
  if (p === 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        backgroundImage: STROKE,
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        mixBlendMode: "multiply",
        clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
        ...style,
      }}
    />
  );
}
