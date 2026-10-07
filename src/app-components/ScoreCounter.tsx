// src/app-components/ScoreCounter.tsx
"use client";

import { ScoreView } from "@/components/ScoreView";
import { useAnimatedValue } from "./useAnimatedValue";

export function ScoreCounter({ correct, total, verdict }: { correct: number; total: number; verdict: string }) {
  const shown = Math.round(useAnimatedValue(correct, 900, 150));
  return <ScoreView correct={correct} total={total} shown={shown} verdict={verdict} />;
}
