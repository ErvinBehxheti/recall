// src/lib/quiz-types.ts
// Shapes that cross from the server to the quiz screen. Nothing here can carry a hidden answer.
export type QuizQuestion = { id: string; question: string; options: string[] };

/** Indexes are positions in the shuffled options the student was shown. */
export type Feedback = { chosenIndex: number; correctIndex: number; correct: boolean; explanation: string };

export type AttemptView = {
  attemptId: number;
  lessonId: number;
  isFirst: boolean;
  total: number;
  questions: QuizQuestion[];
  answered: Record<string, Feedback>;
};

export type MissedQuestion = {
  id: string;
  question: string;
  yourAnswer: string;
  rightAnswer: string;
  pageNumber: number | null;
  pageTitle: string | null;
};

export type AttemptResult = {
  attemptId: number;
  lessonId: number;
  lessonTitle: string;
  isFirst: boolean;
  correct: number;
  total: number;
  missed: MissedQuestion[];
};
