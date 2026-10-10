// remotion/layout.ts
// Where everything sits on the desk, and where the camera is at every frame.
// Desk units are pixels; the ribbon of lesson pages runs along y = 0.
import { interpolate } from "remotion";
import { inOut } from "./ease";
import capture from "./generated/capture.json";

export const COLORS = {
  desk: "#EFE8DA",
  sheet: "#FBF8F2",
  rule: "#D9D0BF",
  ink: "#1B2233",
  inkSoft: "#4A5163",
  paper: "#F6F1E7",
  highlight: "#F2D04B",
  incorrect: "#B4443A",
} as const;

/** Content sits this many pixels above the screen centre, leaving room for captions below. */
export const LIFT = 70;

export const VIEWPORT = capture.viewport;
export const RECTS = capture.rects;
export const SLIDES = capture.slides;

export type Box = { x: number; y: number; w: number; h: number };

export const PAGE = { w: 1100, h: 720, pitch: 1250 };
export const pageBox = (n: number): Box => ({ x: (n - 4.5) * PAGE.pitch, y: 0, w: PAGE.w, h: PAGE.h });

export const SHEETS = {
  teacherClass: { x: -1800, y: -1500, w: 1600, h: 900 },
  upload: { x: 0, y: -1500, w: 1600, h: 900 },
  review: { x: 1800, y: -1500, w: 1600, h: 900 },
  teacherResults: { x: 3600, y: -1500, w: 1700, h: 960 },
  // The second pass: more of the teacher's side above the first row, the student side and two rules below it.
  teacherLessons: { x: 3600, y: -2900, w: 1600, h: 900 },
  teacherEditor: { x: 1800, y: -2900, w: 1600, h: 900 },
  studentSubject: { x: -4400, y: 2900, w: 1600, h: 900 },
  notePrivate: { x: -1800, y: 2900, w: 1600, h: 900 },
  signup: { x: 500, y: 2900, w: 1600, h: 900 },
  noteFair: { x: 2800, y: 2900, w: 1600, h: 900 },
  studentHome: { x: -4400, y: 1500, w: 1600, h: 900 },
  join: { x: -2600, y: 1500, w: 1600, h: 900 },
  quiz: { x: -200, y: 1500, w: 1600, h: 900 },
  studentResults: { x: 1700, y: 1500, w: 1600, h: 900 },
} satisfies Record<string, Box>;

/** Frames at which each sheet starts to appear on the desk. */
export const APPEAR = {
  teacher: 380,
  student: 860,
  quiz: 1270,
  studentResults: 1290,
  teacherResults: 1700,
  teacherMore: 2040,
  studentMore: 2700,
} as const;

/** The "Review page 4" link on the student results sheet, in sheet pixels from its top left. */
export const LINK = { x: 64, y: 584 };

/** The page the wrong answer sends the student back to. */
export const WEAK_PAGE = 4;

/** Frames in which each lesson page's "Remember this" gets its highlighter swipe. */
export const PAGE_SWIPE: Record<number, [number, number]> = {
  1: [1130, 1155],
  2: [1185, 1208],
  3: [1235, 1255],
  4: [1690, 1730],
};
/** Pages that were never read get their swipe as the camera pulls back over the whole desk. */
export const FINALE_SWIPE_START = 4280;

export type Stop = { arrive: number; depart: number; x: number; y: number; s: number; dip?: number };

export const STOPS: Stop[] = [
  { arrive: 0, depart: 372, x: 0, y: 0, s: 0.19 },
  { arrive: 470, depart: 600, x: SHEETS.teacherClass.x, y: SHEETS.teacherClass.y, s: 0.95 },
  { arrive: 650, depart: 745, x: SHEETS.upload.x, y: SHEETS.upload.y, s: 1.0 },
  { arrive: 790, depart: 880, x: SHEETS.review.x, y: SHEETS.review.y, s: 1.0 },
  { arrive: 950, depart: 1000, x: SHEETS.studentHome.x, y: SHEETS.studentHome.y, s: 0.95, dip: 0.32 },
  { arrive: 1030, depart: 1085, x: SHEETS.join.x, y: SHEETS.join.y, s: 1.1 },
  { arrive: 1125, depart: 1165, x: pageBox(1).x, y: 0, s: 1.25 },
  { arrive: 1180, depart: 1215, x: pageBox(2).x, y: 0, s: 1.25 },
  { arrive: 1230, depart: 1260, x: pageBox(3).x, y: 0, s: 1.25 },
  { arrive: 1310, depart: 1450, x: SHEETS.quiz.x, y: SHEETS.quiz.y, s: 1.0 },
  { arrive: 1500, depart: 1590, x: SHEETS.studentResults.x, y: SHEETS.studentResults.y, s: 1.0 },
  { arrive: 1670, depart: 1760, x: pageBox(WEAK_PAGE).x, y: 0, s: 1.25, dip: 0.3 },
  { arrive: 1830, depart: 2010, x: SHEETS.teacherResults.x, y: SHEETS.teacherResults.y, s: 0.95, dip: 0.28 },
  { arrive: 2090, depart: 2330, x: SHEETS.teacherLessons.x, y: SHEETS.teacherLessons.y, s: 0.95 },
  { arrive: 2380, depart: 2640, x: SHEETS.teacherEditor.x, y: SHEETS.teacherEditor.y, s: 0.95 },
  { arrive: 2760, depart: 3000, x: SHEETS.studentSubject.x, y: SHEETS.studentSubject.y, s: 0.95, dip: 0.3 },
  { arrive: 3040, depart: 3260, x: SHEETS.notePrivate.x, y: SHEETS.notePrivate.y, s: 1.0 },
  { arrive: 3300, depart: 3520, x: SHEETS.signup.x, y: SHEETS.signup.y, s: 0.95 },
  { arrive: 3560, depart: 3780, x: SHEETS.noteFair.x, y: SHEETS.noteFair.y, s: 1.0 },
  { arrive: 3880, depart: 4260, x: 3900, y: -1610, s: 1.15, dip: 0.3 },
  { arrive: 4360, depart: 4390, x: -140, y: 0, s: 0.135 },
];

// Position and zoom are separate channels so a long move can dip the zoom out and back in
// without the position stopping halfway.
const posFrames: number[] = [];
const xs: number[] = [];
const ys: number[] = [];
const scaleFrames: number[] = [];
const scaleLn: number[] = [];
STOPS.forEach((stop, i) => {
  const prev = STOPS[i - 1];
  if (prev && stop.dip) {
    scaleFrames.push((prev.depart + stop.arrive) / 2);
    scaleLn.push(Math.log(stop.dip));
  }
  for (const f of [stop.arrive, stop.depart]) {
    posFrames.push(f);
    xs.push(stop.x);
    ys.push(stop.y);
    scaleFrames.push(f);
    scaleLn.push(Math.log(stop.s));
  }
});

const options = { easing: inOut, extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export function cameraAt(frame: number): { x: number; y: number; s: number } {
  return {
    x: interpolate(frame, posFrames, xs, options),
    y: interpolate(frame, posFrames, ys, options),
    s: Math.exp(interpolate(frame, scaleFrames, scaleLn, options)),
  };
}
