// remotion/timing.ts
// Every beat and the end-card text live here, so cuts can be moved to follow a music track.
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 4500; // 150 seconds (2:30)

/** Shown on the end card: the presenters' first names. */
export const PRESENTERS = "Ensar, Diar and Omer";

export const BEATS = {
  hook: [0, 210],
  swipe: [210, 372],
  teacher: [372, 880],
  students: [880, 1260],
  twist: [1260, 1760],
  results: [1760, 2010],
  more: [2010, 4260],
  close: [4260, 4500],
} as const;
