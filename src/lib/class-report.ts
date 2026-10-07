// src/lib/class-report.ts
import type { Card } from "./lesson-schema";

export const STRUGGLE_THRESHOLD = 60;

export type TopicMastery = { cardId: string; pageNumber: number; title: string; percent: number; struggling: number };
export type StudentStatus = "not-started" | "in-progress" | "finished";
export type ReportStudent = { name: string; status: StudentStatus; correct: Record<string, boolean> };
export type StudentRow = {
  name: string;
  status: StudentStatus;
  correctCount: number;
  total: number;
  percent: number | null;
  weakestTitle: string | null;
};
export type ClassReport = {
  enrolled: number;
  finished: number;
  classAverage: number;
  topics: TopicMastery[];
  weakest: TopicMastery;
  insight: string;
  action: string;
  rows: StudentRow[];
};
export type ReportInput = { cards: Card[]; questions: { id: string; cardId: string }[]; students: ReportStudent[] };

const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const bare = (title: string) => title.replace(/[.?!:]+$/, "");
const RANK: Record<ReportStudent["status"], number> = { finished: 0, "in-progress": 1, "not-started": 2 };

/** The insight sentence split around the weakest topic's title, so the title can be highlighted in place. */
export function insightParts(report: Pick<ClassReport, "insight" | "weakest">): { before: string; highlight: string; after: string } {
  const highlight = bare(report.weakest.title);
  const at = report.insight.indexOf(highlight);
  if (at === -1) return { before: report.insight, highlight: "", after: "" };
  return { before: report.insight.slice(0, at), highlight, after: report.insight.slice(at + highlight.length) };
}

/** Only finished students feed the page averages. Returns null when there is nothing to average. */
export function buildClassReport({ cards, questions, students }: ReportInput): ClassReport | null {
  const finished = students.filter((s) => s.status === "finished");
  if (finished.length === 0) return null;

  const byCard = new Map<string, string[]>();
  for (const q of questions) byCard.set(q.cardId, [...(byCard.get(q.cardId) ?? []), q.id]);
  const cardPercent = (s: ReportStudent, cardId: string): number | null => {
    const ids = byCard.get(cardId);
    if (!ids?.length) return null;
    return (ids.filter((id) => s.correct[id]).length / ids.length) * 100;
  };

  const topics: TopicMastery[] = [];
  cards.forEach((card, i) => {
    const values = finished.map((s) => cardPercent(s, card.id)).filter((v): v is number => v !== null);
    if (values.length === 0) return;
    topics.push({
      cardId: card.id,
      pageNumber: i + 1,
      title: card.title,
      percent: Math.round(average(values)),
      struggling: values.filter((v) => v < STRUGGLE_THRESHOLD).length,
    });
  });
  if (topics.length === 0) return null;
  const weakest = topics.reduce((low, t) => (t.percent < low.percent ? t : low));

  const rows: StudentRow[] = students.map((s) => {
    const correctCount = questions.filter((q) => s.correct[q.id]).length;
    const isFinished = s.status === "finished";
    let weakestTitle: string | null = null;
    if (isFinished) {
      let low = 100;
      for (const card of cards) {
        const value = cardPercent(s, card.id);
        if (value !== null && value < low) {
          low = value;
          weakestTitle = card.title;
        }
      }
    }
    return {
      name: s.name,
      status: s.status,
      correctCount,
      total: questions.length,
      percent: isFinished ? Math.round((correctCount / questions.length) * 100) : null,
      weakestTitle,
    };
  });
  rows.sort((a, b) => RANK[a.status] - RANK[b.status] || (a.percent ?? 0) - (b.percent ?? 0) || a.name.localeCompare(b.name));

  const n = finished.length;
  const insight =
    weakest.percent < STRUGGLE_THRESHOLD
      ? `${weakest.struggling} of ${n} ${n === 1 ? "student" : "students"} struggled with ${bare(weakest.title)}.`
      : `The class is solid on every topic. Lowest: ${bare(weakest.title)} at ${weakest.percent}%.`;

  return {
    enrolled: students.length,
    finished: n,
    classAverage: Math.round(average(rows.filter((r) => r.percent !== null).map((r) => r.percent!))),
    topics,
    weakest,
    insight,
    action: `Re-teach page ${weakest.pageNumber}.`,
    rows,
  };
}
