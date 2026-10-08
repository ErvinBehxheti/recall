// remotion/Caption.tsx
import { arrive, ramp } from "./ease";
import { CAPTIONS } from "./events";
import { COLORS } from "./layout";

export function Caption({ frame }: { frame: number }) {
  const line = CAPTIONS.find((c) => frame >= c.from && frame < c.to);
  if (!line) return null;
  const p = ramp(frame, line.from, line.from + 7, arrive);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 58, display: "flex", justifyContent: "center" }}>
      <p
        className="font-serif font-semibold"
        style={{
          maxWidth: 1560,
          padding: "16px 44px",
          background: COLORS.paper,
          color: COLORS.ink,
          fontSize: 64,
          lineHeight: 1.2,
          textAlign: "center",
          borderRadius: 4,
          border: `3px solid ${COLORS.rule}`,
          transform: `translateY(${(1 - p) * 22}px)`,
          opacity: p,
        }}
      >
        {line.text}
      </p>
    </div>
  );
}
