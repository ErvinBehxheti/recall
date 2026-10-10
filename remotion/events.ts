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

/**
 * Chapters added after the class results (frames 2010 to 4260): the teacher's controls, the student side
 * and two rules. The first 2010 frames are untouched, so the stage script's pinned lines still match.
 */
export const MORE = {
  draftFade: [2210, 2240],
  statusSwipe: [2252, 2282],
  titleSwipe: [2450, 2490],
  scoreSwipe: [2840, 2880],
  privateSwipe: [3125, 3170],
  nameSwipe: [3350, 3390],
  fairSwipe: [3640, 3690],
} as const;

/** The camera starts to pull back over the whole desk here. */
export const PULL_START = 4260;

/** The end card. The pull-back takes 100 frames and the card begins 18 frames after it ends. */
export const END = { from: 4378, wordmark: [4400, 4436], subject: [4430, 4456] } as const;

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
  { from: 2100, to: 2200, text: "Every lesson starts as a draft." },
  { from: 2204, to: 2370, text: "Students see it after you publish." },
  { from: 2395, to: 2510, text: "Change any page." },
  { from: 2514, to: 2650, text: "Fix any answer." },
  { from: 2770, to: 2890, text: "Students see their lessons." },
  { from: 2894, to: 3000, text: "And how they are doing." },
  { from: 3310, to: 3420, text: "Students need a first name." },
  { from: 3424, to: 3520, text: "No email. No phone number." },
  { from: 3895, to: 4010, text: "Every student. Every topic." },
  { from: 4014, to: 4180, text: "So the teacher knows what to re-teach." },
];
