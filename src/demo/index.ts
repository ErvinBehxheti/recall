import type { Lesson } from "@/lib/lesson-schema";
import photosynthesis from "./photosynthesis.json";
import ww1Causes from "./ww1-causes.json";

export type DemoLesson = { slug: string; slideCount: number; source: "ai" | "placeholder"; lesson: Lesson };

type DemoFile = { source: string; slideCount: number; lesson: Lesson };

const make = (slug: string, file: DemoFile): DemoLesson => ({
  slug,
  slideCount: file.slideCount,
  source: file.source === "ai" ? "ai" : "placeholder",
  lesson: file.lesson,
});

export const DEMOS: DemoLesson[] = [
  make("photosynthesis", photosynthesis as DemoFile),
  make("ww1-causes", ww1Causes as DemoFile),
];

export const DEFAULT_DEMO_SLUG = "photosynthesis";

export function getDemo(slug: string): DemoLesson | undefined {
  return DEMOS.find((d) => d.slug === slug);
}
