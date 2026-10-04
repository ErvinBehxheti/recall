"use client";

import { useSyncExternalStore } from "react";
import type { Lesson } from "./lesson-schema";
import {
  answerQuestion,
  newLessonState,
  parseStoredState,
  serializeState,
  startRetry,
  STORAGE_KEY,
  type LessonOrigin,
  type LessonState,
} from "./lesson-state";

type Store = {
  ready: boolean;
  state: LessonState | null;
  setLesson: (lesson: Lesson, slideCount: number, origin: LessonOrigin) => void;
  answer: (questionId: string, optionIndex: number) => void;
  retryMissed: () => void;
  clear: () => void;
};

// `undefined` means "not read from sessionStorage yet" (always the case on the server).
let current: LessonState | null | undefined;
const listeners = new Set<() => void>();

function load(): LessonState | null {
  try {
    return parseStoredState(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function save(state: LessonState | null) {
  try {
    if (state) sessionStorage.setItem(STORAGE_KEY, serializeState(state));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode). The lesson still works for this page view.
  }
}

function getSnapshot(): LessonState | null {
  if (current === undefined) current = load();
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(next: (prev: LessonState | null) => LessonState | null) {
  current = next(getSnapshot());
  save(current);
  for (const listener of listeners) listener();
}

const actions = {
  setLesson: (lesson: Lesson, slideCount: number, origin: LessonOrigin) =>
    update(() => newLessonState(lesson, slideCount, origin)),
  answer: (id: string, index: number) => update((prev) => (prev ? answerQuestion(prev, id, index) : prev)),
  retryMissed: () => update((prev) => (prev ? startRetry(prev) : prev)),
  clear: () => update(() => null),
};

export function useLessonStore(): Store {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => undefined);
  return { ready: state !== undefined, state: state ?? null, ...actions };
}
