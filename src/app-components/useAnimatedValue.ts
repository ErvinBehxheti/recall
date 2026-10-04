"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/** Animates from 0 to `target` once on mount (or when `target` changes). Reduced motion gets `target` at once. */
export function useAnimatedValue(target: number, durationMs: number, delayMs = 0): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const controls = animate(0, target, {
      duration: durationMs / 1000,
      delay: delayMs / 1000,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setValue,
    });
    return () => controls.stop();
  }, [target, durationMs, delayMs, reduceMotion]);

  return reduceMotion ? target : value;
}
