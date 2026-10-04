import type { Lesson } from "./lesson-schema";

export const CLASS_NAMES = [
  "Arta", "Liam", "Sofia", "Noah", "Amira", "Leon", "Mia", "Yusuf", "Elena", "Kai",
  "Zara", "Luka", "Ines", "Omar", "Nora", "Mateo", "Lea", "Dren", "Hana", "Jonas",
  "Aisha", "Ben", "Vera", "Rron", "Maya", "Theo",
] as const;

export const STRUGGLE_THRESHOLD = 60;

export type TopicMastery = { cardId: string; pageNumber: number; title: string; percent: number; struggling: number };
export type StudentResult = { name: string; average: number; weakestTitle: string };
export type ClassReport = {
  classSize: number;
  classAverage: number;
  topics: TopicMastery[];
  weakest: TopicMastery;
  needHelp: StudentResult[];
  insight: string;
  action: string;
};

/** FNV-1a 32-bit. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (const ch of text) {
    hash ^= ch.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lessonSeed(lesson: Lesson): number {
  return hashString(`${lesson.title}|${lesson.cards.map((c) => `${c.id}:${c.title}`).join("|")}`);
}

/** A seeded pick among cards 2..n so the insight never points at the intro page. */
export function weakCardIndex(lesson: Lesson): number {
  const n = lesson.cards.length;
  return n < 2 ? 0 : 1 + (lessonSeed(lesson) % (n - 1));
}

const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const clamp = (v: number) => Math.min(100, Math.max(5, Math.round(v)));
const bare = (title: string) => title.replace(/[.?!:]+$/, "");

/** The insight sentence split around the weakest topic's title, so the title can be highlighted in place. */
export function insightParts(report: ClassReport): { before: string; highlight: string; after: string } {
  const highlight = bare(report.weakest.title);
  const at = report.insight.indexOf(highlight);
  if (at === -1) return { before: report.insight, highlight: "", after: "" };
  return { before: report.insight.slice(0, at), highlight, after: report.insight.slice(at + highlight.length) };
}

export function buildClassReport(lesson: Lesson): ClassReport {
  const rng = mulberry32(lessonSeed(lesson));
  const weak = weakCardIndex(lesson);

  const students = CLASS_NAMES.map((name) => {
    const ability = 55 + rng() * 40;
    const scores = lesson.cards.map((_, i) => clamp(ability + (rng() - 0.5) * 30 - (i === weak ? 20 : 0)));
    return { name, scores };
  });

  const topics: TopicMastery[] = lesson.cards.map((card, i) => {
    const values = students.map((s) => s.scores[i]);
    return {
      cardId: card.id,
      pageNumber: i + 1,
      title: card.title,
      percent: Math.round(average(values)),
      struggling: values.filter((v) => v < STRUGGLE_THRESHOLD).length,
    };
  });

  const weakest = topics.reduce((low, t) => (t.percent < low.percent ? t : low));

  const needHelp = students
    .map((s) => ({
      name: s.name,
      average: Math.round(average(s.scores)),
      weakestTitle: lesson.cards[s.scores.indexOf(Math.min(...s.scores))].title,
    }))
    .sort((a, b) => a.average - b.average || a.name.localeCompare(b.name))
    .slice(0, 4);

  const insight =
    weakest.percent < STRUGGLE_THRESHOLD
      ? `${weakest.struggling} of ${CLASS_NAMES.length} students struggled with ${bare(weakest.title)}.`
      : `The class is solid on every topic. Lowest: ${bare(weakest.title)} at ${weakest.percent}%.`;

  return {
    classSize: CLASS_NAMES.length,
    classAverage: Math.round(average(topics.map((t) => t.percent))),
    topics,
    weakest,
    needHelp,
    insight,
    action: `Re-teach page ${weakest.pageNumber}.`,
  };
}
