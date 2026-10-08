// remotion/timing.ts
// Every beat and the end-card text live here, so cuts can be moved to follow a music track.
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 2250; // 75 seconds

/** Shown on the end card. Replace with the presenters' first names. */
export const PRESENTERS = "Name and Name";

export const BEATS = {
  hook: [0, 210],
  swipe: [210, 372],
  teacher: [372, 880],
  students: [880, 1260],
  twist: [1260, 1760],
  results: [1760, 2010],
  close: [2010, 2250],
} as const;
