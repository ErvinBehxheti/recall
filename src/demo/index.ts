import type { Lesson } from "@/lib/lesson-schema";
import photosynthesis from "./photosynthesis.json";
import ww1Causes from "./ww1-causes.json";

export type DemoLesson = { slug: string; label: string; slideCount: number; source: "ai" | "placeholder"; lesson: Lesson };

type DemoFile = { source: string; slideCount: number; lesson: Lesson };

const make = (slug: string, label: string, file: DemoFile): DemoLesson => ({
  slug,
  label,
  slideCount: file.slideCount,
  source: file.source === "ai" ? "ai" : "placeholder",
  lesson: file.lesson,
});

export const DEMOS: DemoLesson[] = [
  make("photosynthesis", "Photosynthesis · Biology", photosynthesis as DemoFile),
  make("ww1-causes", "Causes of World War I · History", ww1Causes as DemoFile),
];

export const DEFAULT_DEMO_SLUG = "photosynthesis";

export function getDemo(slug: string): DemoLesson | undefined {
  return DEMOS.find((d) => d.slug === slug);
}
