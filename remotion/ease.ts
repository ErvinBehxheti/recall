// remotion/ease.ts
import { Easing, interpolate } from "remotion";

/** Gentle in and out. Nothing in this video overshoots or bounces. */
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);
/** Fast start, soft landing: for things that arrive. */
export const arrive = Easing.bezier(0.22, 1, 0.36, 1);

/** 0 before `from`, 1 after `to`, eased in between. */
export function ramp(frame: number, from: number, to: number, easing: (t: number) => number = inOut): number {
  return interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}
