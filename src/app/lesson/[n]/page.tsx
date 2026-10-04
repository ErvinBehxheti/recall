import { Suspense } from "react";
import { LessonPageScreen } from "@/app-components/LessonPageScreen";

export default function LessonPage() {
  return (
    <Suspense>
      <LessonPageScreen />
    </Suspense>
  );
}
