// remotion/events.ts
// The frame of every moment inside the video. The picture and the sound cues (remotion/sfx-cues.ts) both
// read these, so moving a moment here moves its sound with it. Pure data: no React, no Remotion.
// Frames are at 30fps. Pairs are [from, to].

/** The pile of slides at the start. */
export const SLIDE_COUNT = 40;
export const SLIDE_FALL = 14;
/** Frame at which slide `i` starts to fall. The cadence speeds up: the last slides land almost together. */
export const slideSpawn = (i: number): number => Math.round(190 * (1 - Math.pow(1 - i / (SLIDE_COUNT - 1), 1.35))) - 20;

/** The three lines over the pile. `animFrom` is when the line slams in. */
export const PLATES = [
  { from: 0, to: 66, text: "40 slides.", animFrom: -10 },
  { from: 66, to: 132, text: "Test on Friday.", animFrom: 66 },
  { from: 132, to: 230, text: "Where do you start?", animFrom: 132 },
];

/** The highlighter sweeping across the screen. */
export const WIPE = { from: 215, to: 290 };

/** The name and the promise that appear once the desk is in order. */
export const OPENING = { wordmark: [294, 324], tagline: [328, 350] } as const;

/** Moments inside the sheets on the desk. */
export const SHEET = {
  codeMarker: [482, 522],
  drop: [545, 576],
  statusFrom: 650,
  statusStep: 23,
  published: [846, 856],
  publishedSwipe: [852, 876],
  typing: [1042, 1076],
  quizSelect: 1345,
  quizReveal: 1365,
  scoreCount: [1505, 1535],
  linkMarker: [1548, 1572],
  rowsFrom: 1845,
  rowStep: 6,
  barsGrow: [1850, 1920],
  insightType: [1935, 1985],
  insightSwipe: [1975, 2000],
  reteach: 1995,
} as const;

/** The ink thread from the missed answer back to its page. */
export const INK = [1558, 1650] as const;

/** The end card. */
export const END = { from: 2128, wordmark: [2150, 2186], subject: [2180, 2206] } as const;

/** Captions at the bottom. Nothing is smaller than 56px, so the video works with the sound off. */
export const CAPTIONS = [
  { from: 476, to: 546, text: "Create a class. Share the code." },
  { from: 550, to: 748, text: "Upload your slides." },
  { from: 794, to: 884, text: "Fix any question. Publish." },
  { from: 1034, to: 1100, text: "Students join with the code." },
  { from: 1128, to: 1300, text: "One idea per page. At your own pace." },
  { from: 1372, to: 1498, text: "Wrong answer?" },
  { from: 1502, to: 1770, text: "Straight back to the page that teaches it." },
  { from: 1846, to: 2012, text: "Who got it. Which page lost them." },
];
