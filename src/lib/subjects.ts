// src/lib/subjects.ts
export const SUBJECTS = ["biology", "chemistry", "math", "albanian", "english"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_LABELS: Record<Subject, string> = {
  biology: "Biology",
  chemistry: "Chemistry",
  math: "Math",
  albanian: "Albanian",
  english: "English",
};

export const isSubject = (value: unknown): value is Subject =>
  typeof value === "string" && (SUBJECTS as readonly string[]).includes(value);
