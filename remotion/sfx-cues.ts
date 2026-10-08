// remotion/sfx-cues.ts
// What the sound design plays and when. Every time comes from events.ts, layout.ts or the camera stops,
// so a moment that moves in the picture moves its sound too. Gains are relative (0 to 1) and are meant to
// be tuned here: scripts/make-sfx.mts turns these cues into out/sfx.wav.
import { mulberry32 } from "../src/lib/random";
import { END, INK, OPENING, PLATES, SHEET, SLIDE_COUNT, SLIDE_FALL, WIPE, CAPTIONS, slideSpawn } from "./events";
import { FINALE_SWIPE_START, PAGE_SWIPE, STOPS } from "./layout";
import { DURATION, FPS } from "./timing";

export type Voice =
  | "riser" // tension under the pile
  | "slam" // a line of text landing, or a stamp
  | "land" // a slide landing on the pile
  | "sweep" // the big highlighter wipe
  | "scritch" // a marker or pen on paper
  | "tick" // a row or a count
  | "key" // a typed letter or a click
  | "thock" // a caption or a button
  | "whoosh" // the camera moving
  | "wrong" // the wrong answer
  | "swell" // the bars growing
  | "resolve"; // the last low note

export type Cue = {
  /** Frame at which the sound starts. */
  frame: number;
  voice: Voice;
  /** Loudness relative to the other cues, 0 to 1. */
  gain: number;
  /** -1 left, 0 centre, 1 right. */
  pan?: number;
  /** Length for the voices that stretch to fit a moment. */
  seconds?: number;
  /** Picks one of a few flavours of the same voice. */
  variant?: number;
  /** Frequency in Hz for ticks. */
  pitch?: number;
  /** A long, dramatic camera move. */
  big?: boolean;
};

const sec = (frames: number) => frames / FPS;
const span = (pair: readonly [number, number]) => sec(pair[1] - pair[0]);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function buildCues(): Cue[] {
  const cues: Cue[] = [];

  // The hook: tension under the pile, a slam for each line of text, a slide landing every few frames.
  cues.push({ frame: 4, voice: "riser", gain: 0.5, seconds: sec(WIPE.from - 4 - 2) });
  const slamGain = [0.95, 0.9, 1];
  PLATES.forEach((plate, i) => cues.push({ frame: Math.max(0, plate.from), voice: "slam", gain: slamGain[i] ?? 0.9 }));
  const pan = mulberry32(2026);
  for (let i = 0; i < SLIDE_COUNT; i++) {
    const frame = slideSpawn(i) + SLIDE_FALL - 2;
    if (frame < 0) continue;
    cues.push({ frame, voice: "land", gain: 0.3 + (0.35 * i) / (SLIDE_COUNT - 1), variant: i % 3, pan: (pan() - 0.5) * 1.2 });
  }

  // The highlighter wipes the pile into order, and the name lands.
  cues.push({ frame: WIPE.from - 4, voice: "sweep", gain: 0.8, seconds: sec(WIPE.to - WIPE.from + 8) });
  cues.push({ frame: WIPE.to + 2, voice: "slam", gain: 0.55 });

  // Marker strokes: one scritch for every highlighter swipe, as long as the swipe.
  const strokes: [readonly [number, number], number][] = [
    [OPENING.wordmark, 0.25],
    [OPENING.tagline, 0.22],
    [SHEET.codeMarker, 0.22],
    [SHEET.publishedSwipe, 0.22],
    [SHEET.linkMarker, 0.22],
    [SHEET.insightSwipe, 0.22],
    [END.wordmark, 0.28],
    [END.subject, 0.26],
    ...Object.values(PAGE_SWIPE).map((pair): [readonly [number, number], number] => [pair, 0.2]),
  ];
  for (const [pair, gain] of strokes) cues.push({ frame: pair[0], voice: "scritch", gain, seconds: span(pair) });
  // The pages nobody read light up one after another as the camera pulls back.
  const wave = [5, 6, 7, 8].map((n) => FINALE_SWIPE_START + (n - 1) * 6);
  cues.push({ frame: wave[0], voice: "scritch", gain: 0.16, seconds: sec(wave[wave.length - 1] + 20 - wave[0]) });
  // The ink thread, drawn by pen.
  cues.push({ frame: INK[0], voice: "scritch", gain: 0.3, seconds: span(INK), pan: 0.3 });

  // The teacher's side.
  cues.push({ frame: SHEET.drop[1], voice: "land", gain: 0.75, variant: 1 });
  for (let k = 1; k <= 4; k++) cues.push({ frame: SHEET.statusFrom + SHEET.statusStep * k, voice: "tick", gain: 0.22, pitch: 880 });
  cues.push({ frame: SHEET.published[0] + 4, voice: "slam", gain: 0.5 });

  // The student typing the class code, answering, and getting it wrong.
  for (let k = 0; k < 6; k++) {
    const frame = SHEET.typing[0] + Math.round((k * (SHEET.typing[1] - SHEET.typing[0])) / 6);
    cues.push({ frame, voice: "key", gain: 0.28, pan: -0.25 });
  }
  cues.push({ frame: SHEET.quizSelect, voice: "key", gain: 0.35, pan: 0.1 });
  cues.push({ frame: SHEET.quizReveal, voice: "wrong", gain: 0.85 });
  for (let k = 0; k < 5; k++) {
    const frame = SHEET.scoreCount[0] + Math.round(((k + 0.5) * (SHEET.scoreCount[1] - SHEET.scoreCount[0])) / 5);
    cues.push({ frame, voice: "tick", gain: 0.26, pitch: 900 + 90 * k });
  }

  // The teacher's results: students tick in, bars grow, the insight types out.
  for (let i = 0; i < 12; i++) cues.push({ frame: SHEET.rowsFrom + SHEET.rowStep * i, voice: "tick", gain: 0.2, pitch: 1250 + 22 * i, pan: 0.35 });
  cues.push({ frame: SHEET.barsGrow[0], voice: "swell", gain: 0.22, seconds: span(SHEET.barsGrow) });
  for (let k = 0; k < 12; k++) {
    const frame = SHEET.insightType[0] + Math.round((k * (SHEET.insightType[1] - SHEET.insightType[0])) / 12);
    cues.push({ frame, voice: "key", gain: 0.12, pan: 0.3 });
  }
  cues.push({ frame: SHEET.reteach, voice: "thock", gain: 0.35 });

  // Every caption lands softly.
  for (const caption of CAPTIONS) cues.push({ frame: caption.from + 1, voice: "thock", gain: 0.3 });

  // The camera: a breath of air for every move, bigger for the long ones.
  STOPS.forEach((next, i) => {
    const prev = STOPS[i - 1];
    if (!prev) return;
    const distance = Math.hypot(next.x - prev.x, next.y - prev.y);
    const zoom = Math.abs(Math.log(next.s / prev.s));
    const big = Boolean(next.dip) || zoom > 1 || distance > 3000;
    cues.push({
      frame: prev.depart,
      voice: "whoosh",
      gain: clamp(0.1 + distance / 9000 + 0.12 * zoom, 0.1, 0.6),
      seconds: sec(next.arrive - prev.depart),
      pan: clamp((next.x - prev.x) / 6000, -0.5, 0.5),
      big,
    });
  });

  // The last low note, as the end card settles.
  cues.push({ frame: END.subject[0] + 8, voice: "resolve", gain: 0.55 });

  return cues.sort((a, b) => a.frame - b.frame);
}

/** Cheap checks that a cue edit did not push a sound outside the video. */
export function checkCues(cues: Cue[]): void {
  for (const cue of cues) {
    if (!Number.isFinite(cue.frame) || cue.frame < 0 || cue.frame >= DURATION) throw new Error(`Cue outside the video: ${JSON.stringify(cue)}`);
    if (!(cue.gain > 0 && cue.gain <= 1)) throw new Error(`Cue gain must be between 0 and 1: ${JSON.stringify(cue)}`);
    if (cue.seconds !== undefined && !(cue.seconds > 0)) throw new Error(`Cue length must be positive: ${JSON.stringify(cue)}`);
  }
}
