// remotion/Desk.tsx
import { AbsoluteFill } from "remotion";
import { evolvePath } from "@remotion/paths";
import { ramp } from "./ease";
import { INK } from "./events";
import { APPEAR, COLORS, LIFT, LINK, SHEETS, WEAK_PAGE, cameraAt, pageBox } from "./layout";
import {
  JoinSheet,
  LessonPageSheet,
  QuizSheet,
  ReviewSheet,
  StudentHomeSheet,
  StudentResultsSheet,
  TOTAL_PAGES,
  TeacherClassSheet,
  TeacherResultsSheet,
  UploadSheet,
} from "./sheets";

/** From the "Review page 4" link on the student's results to the sentence that teaches the missed answer. */
function inkPath(): string {
  const sheet = SHEETS.studentResults;
  const start = { x: sheet.x - sheet.w / 2 + LINK.x + 40, y: sheet.y - sheet.h / 2 + LINK.y + 16 };
  const page = pageBox(WEAK_PAGE);
  // Ends just under the highlighted sentence, so the thread points at it without covering the words.
  const end = { x: page.x - page.w / 2 + 176 + 330, y: page.y - page.h / 2 + 530 };
  return `M ${start.x} ${start.y} C ${start.x - 900} ${start.y - 300}, ${end.x + 1300} ${end.y + 900}, ${end.x} ${end.y}`;
}
const INK_PATH = inkPath();

/** The thread that is drawn from the wrong answer back to the page. It stays on the desk afterwards. */
function InkLine({ frame }: { frame: number }) {
  const progress = ramp(frame, ...INK);
  if (progress === 0) return null;
  const { strokeDasharray, strokeDashoffset } = evolvePath(progress, INK_PATH);
  return (
    <svg style={{ position: "absolute", left: -6000, top: -3000, width: 12000, height: 6000, overflow: "visible" }} viewBox="-6000 -3000 12000 6000">
      <path
        d={INK_PATH}
        fill="none"
        stroke={COLORS.ink}
        strokeWidth={14}
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
      />
    </svg>
  );
}

/** The whole product laid out on one desk. The camera is the only thing that moves between scenes. */
export function Desk({ frame }: { frame: number }) {
  const cam = cameraAt(frame);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 540 - LIFT,
          transformOrigin: "0 0",
          transform: `scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)`,
        }}
      >
        {Array.from({ length: TOTAL_PAGES }, (_, i) => (
          <LessonPageSheet key={i} n={i + 1} frame={frame} />
        ))}
        <TeacherClassSheet frame={frame} appear={APPEAR.teacher} />
        <UploadSheet frame={frame} appear={APPEAR.teacher} />
        <ReviewSheet frame={frame} appear={APPEAR.teacher} />
        <StudentHomeSheet frame={frame} appear={APPEAR.student} />
        <JoinSheet frame={frame} appear={APPEAR.student} />
        <QuizSheet frame={frame} appear={APPEAR.quiz} />
        <StudentResultsSheet frame={frame} appear={APPEAR.studentResults} />
        <TeacherResultsSheet frame={frame} appear={APPEAR.teacherResults} />
        <InkLine frame={frame} />
      </div>
    </AbsoluteFill>
  );
}
