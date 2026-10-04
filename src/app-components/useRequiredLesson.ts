"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLessonStore } from "@/lib/lesson-store";
import type { LessonState } from "@/lib/lesson-state";

/** The current lesson, or null while loading. Sends the visitor home when there is no lesson in this tab. */
export function useRequiredLesson(): LessonState | null {
  const { ready, state } = useLessonStore();
  const router = useRouter();
  useEffect(() => {
    if (ready && !state) router.replace("/");
  }, [ready, state, router]);
  return ready ? state : null;
}
