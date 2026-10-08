// remotion/Hook.tsx
// The first 13 seconds: a pile of real slides, one highlighter stroke that turns it into order, the name.
import { Img, interpolate, random, staticFile } from "remotion";
import { HighlightSwipe } from "@/components/HighlightSwipe";
import { Wordmark } from "@/components/Wordmark";
import { BRAND } from "@/config/brand";
import { arrive, inOut, ramp } from "./ease";
import { OPENING, PLATES, SLIDE_COUNT, SLIDE_FALL, WIPE, slideSpawn } from "./events";
import { COLORS, SLIDES } from "./layout";

export const WIPE_FROM = WIPE.from;
export const WIPE_TO = WIPE.to;

/** The leading edge of the highlighter, in screen pixels. Left of it is order, right of it is the pile. */
export function wipeEdge(frame: number): number {
  return interpolate(frame, [WIPE_FROM, WIPE_TO], [-200, 2120], { easing: inOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

const gauss = (seed: string) => (random(`${seed}a`) + random(`${seed}b`) + random(`${seed}c`) - 1.5) / 0.75;

// Real slides in a stable shuffled order, repeated to make 40.
const ORDER = [...SLIDES.keys()].sort((a, b) => random(`order-${a}`) - random(`order-${b}`));
const PILE = Array.from({ length: SLIDE_COUNT }, (_, i) => {
  const w = 380 * (0.9 + 0.35 * random(`w${i}`));
  return {
    src: SLIDES[ORDER[i % ORDER.length]],
    x: 960 + gauss(`x${i}`) * 430,
    y: 540 + gauss(`y${i}`) * 230,
    w,
    h: w * 0.5625,
    rotate: (random(`r${i}`) - 0.5) * 24,
    // The cadence speeds up: the first slides land slowly, the last ones almost together.
    spawn: slideSpawn(i),
  };
});

function Plate({ frame, from, to, text, animFrom }: (typeof PLATES)[number] & { frame: number }) {
  if (frame < from || frame >= to) return null;
  const p = ramp(frame, animFrom, animFrom + 7, arrive);
  return (
    <div
      className="font-serif font-bold"
      style={{
        position: "absolute",
        left: 960,
        top: 540,
        transform: `translate(-50%, calc(-50% + ${(1 - p) * 40}px))`,
        opacity: p,
        padding: "30px 72px",
        background: COLORS.ink,
        color: COLORS.paper,
        fontSize: 156,
        lineHeight: 1.1,
        whiteSpace: "nowrap",
        borderRadius: 4,
      }}
    >
      {text}
    </div>
  );
}

/** The pile and its three lines of text. Clipped to the right of the highlighter. */
export function Chaos({ frame }: { frame: number }) {
  const edge = Math.max(0, wipeEdge(frame));
  return (
    <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${edge}px)` }}>
      {PILE.map((s, i) => {
        if (frame < s.spawn) return null;
        const p = ramp(frame, s.spawn, s.spawn + SLIDE_FALL, arrive);
        return (
          <Img
            key={i}
            src={staticFile(`video/${s.src}`)}
            style={{
              position: "absolute",
              left: s.x - s.w / 2,
              top: s.y - s.h / 2 - (1 - p) * (s.y + 420),
              width: s.w,
              height: s.h,
              transform: `rotate(${s.rotate + (1 - p) * 10}deg)`,
              border: "2px solid rgba(74, 81, 99, 0.55)",
              borderRadius: 2,
              background: COLORS.sheet,
            }}
          />
        );
      })}
      {PLATES.map((plate) => (
        <Plate key={plate.text} frame={frame} {...plate} />
      ))}
    </div>
  );
}

// A marker stroke 360px wide with ragged edges, as tall as the screen.
const BAND_H = 1180;
const BAND_W = 360;
const BAND_PATH = (() => {
  const left: string[] = [];
  const right: string[] = [];
  for (let y = -40, i = 0; y <= BAND_H; y += 60, i++) {
    left.push(`${24 + random(`bl${i}`) * 26} ${y}`);
    right.push(`${BAND_W - 24 - random(`br${i}`) * 26} ${y}`);
  }
  return `M ${left.join(" L ")} L ${right.reverse().join(" L ")} Z`;
})();

/** The highlighter itself, riding the wipe edge. */
export function Band({ frame }: { frame: number }) {
  if (frame < WIPE_FROM - 12 || frame > WIPE_TO + 6) return null;
  const edge = wipeEdge(frame);
  return (
    <svg
      width={BAND_W}
      height={BAND_H}
      viewBox={`0 0 ${BAND_W} ${BAND_H}`}
      style={{ position: "absolute", left: edge - BAND_W / 2, top: -50 }}
    >
      <path d={BAND_PATH} fill={COLORS.highlight} />
    </svg>
  );
}

/** The name and the promise, on top of the ordered desk. */
export function Opening({ frame }: { frame: number }) {
  if (frame < 288 || frame > 395) return null;
  const visible = ramp(frame, 288, 298) * (1 - ramp(frame, 372, 392));
  const at = BRAND.tagline.indexOf("Lesson");
  return (
    <div style={{ position: "absolute", inset: 0, opacity: visible }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, height: 170, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ transform: "scale(2.3)" }}>
          <Wordmark size="lg" highlightProgress={ramp(frame, ...OPENING.wordmark)} />
        </div>
      </div>
      <p
        className="font-serif font-semibold text-ink"
        style={{ position: "absolute", left: 0, right: 0, top: 740, textAlign: "center", fontSize: 84, opacity: ramp(frame, 322, 332) }}
      >
        {BRAND.tagline.slice(0, at)}
        <HighlightSwipe progress={ramp(frame, ...OPENING.tagline)}>{BRAND.tagline.slice(at)}</HighlightSwipe>
      </p>
    </div>
  );
}
