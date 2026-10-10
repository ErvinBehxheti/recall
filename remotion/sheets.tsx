// remotion/sheets.tsx
// Everything that lies on the desk. Real app components are used wherever they are pure; the stateful
// screens are screenshots of the running app (see scripts/capture-video-assets.mts).
import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { Button, buttonClass } from "@/components/Button";
import { HighlightSwipe } from "@/components/HighlightSwipe";
import { LessonPageView } from "@/components/LessonPageView";
import { LessonSkeleton } from "@/components/LessonSkeleton";
import { MasteryBars } from "@/components/MasteryBars";
import { QuizQuestionView } from "@/components/QuizQuestionView";
import { ScoreView } from "@/components/ScoreView";
import { StatsLine } from "@/components/StatsLine";
import { getDemo } from "@/demo";
import { estimateMinutes } from "@/lib/estimate";
import { insightParts, type ClassReport, type StudentRow } from "@/lib/class-report";
import { verdict } from "@/lib/scoring";
import { ramp } from "./ease";
import { MORE, SHEET as E } from "./events";
import { COLORS, PAGE_SWIPE, FINALE_SWIPE_START, RECTS, SHEETS, SLIDES, VIEWPORT, WEAK_PAGE, LINK, pageBox, type Box } from "./layout";
import { Marker } from "./Marker";
import report from "./generated/report.json";

const demo = getDemo("photosynthesis")!;
const lesson = demo.lesson;
const stats = report as unknown as ClassReport;
export const TOTAL_PAGES = lesson.cards.length;

const linear = (t: number) => t;

type SheetProps = { box: Box; frame: number; appear?: number; padding?: number; children: ReactNode };

/** A sheet of paper on the desk: lighter than the desk, a thin rule at its edge, no shadow. */
export function Sheet({ box, frame, appear, padding = 0, children }: SheetProps) {
  if (appear !== undefined && frame < appear) return null;
  const style: CSSProperties = {
    position: "absolute",
    left: box.x - box.w / 2,
    top: box.y - box.h / 2,
    width: box.w,
    height: box.h,
    background: COLORS.sheet,
    border: `3px solid ${COLORS.rule}`,
    borderRadius: 4,
    boxSizing: "border-box",
    overflow: "hidden",
    padding,
    opacity: appear === undefined ? 1 : ramp(frame, appear, appear + 15),
  };
  return <div style={style}>{children}</div>;
}

const Shot = ({ name }: { name: string }) => (
  <Img src={staticFile(`video/${name}`)} style={{ width: "100%", height: "100%", display: "block" }} />
);

/** How many sheet pixels one screenshot pixel covers. */
const shotScale = (box: Box) => box.w / VIEWPORT.width;

/** One lesson page on the ribbon. */
export function LessonPageSheet({ n, frame }: { n: number; frame: number }) {
  const swipe = PAGE_SWIPE[n];
  const [from, to] = swipe ?? [FINALE_SWIPE_START + (n - 1) * 6, FINALE_SWIPE_START + (n - 1) * 6 + 20];
  return (
    <Sheet box={pageBox(n)} frame={frame} padding={48}>
      <LessonPageView card={lesson.cards[n - 1]} pageNumber={n} totalPages={TOTAL_PAGES} highlightProgress={ramp(frame, from, to)} />
    </Sheet>
  );
}

/** Teacher: the new class with its code. The code gets a highlighter swipe and a slide drops onto Upload. */
export function TeacherClassSheet({ frame, appear }: { frame: number; appear: number }) {
  const box = SHEETS.teacherClass;
  const k = shotScale(box);
  const code = RECTS.joinCode;
  const button = RECTS.uploadButton;
  const fall = ramp(frame, ...E.drop);
  const cardW = 270;
  const cardH = cardW * 0.5625;
  const cardLeft = (button.x + button.width / 2) * k - cardW / 2;
  const cardTop = (button.y + button.height / 2) * k - cardH / 2 - (1 - fall) * 760;
  return (
    <Sheet box={box} frame={frame} appear={appear}>
      <Shot name="teacher-class.png" />
      <Marker
        progress={ramp(frame, ...E.codeMarker)}
        style={{ left: code.x * k - 14, top: (code.y + code.height * 0.14) * k, width: code.width * k + 28, height: code.height * k * 0.72 }}
      />
      {frame >= E.drop[0] && frame < E.drop[1] + 24 && (
        <Img
          src={staticFile(`video/${SLIDES[0]}`)}
          style={{
            position: "absolute",
            left: cardLeft,
            top: cardTop,
            width: cardW,
            height: cardH,
            border: `3px solid ${COLORS.inkSoft}`,
            transform: `rotate(${-5 * (1 - fall)}deg)`,
            opacity: 1 - ramp(frame, E.drop[1] + 10, E.drop[1] + 22),
          }}
        />
      )}
    </Sheet>
  );
}

/** The loading rows fade to half and back every 1.6s (48 frames), as in the app, but from the frame number. */
const pulse = (frame: number) => 1 - 0.25 * (1 - Math.cos((2 * Math.PI * frame) / 48));

const STATUS_LINES = ["Reading your slides", "Finding the key ideas", "Writing the lesson pages", "Writing your quiz"];

/** Teacher: the lesson taking shape while the status lines tick. */
export function UploadSheet({ frame, appear }: { frame: number; appear: number }) {
  const activeLine = Math.max(0, Math.min(STATUS_LINES.length, Math.floor((frame - E.statusFrom) / E.statusStep)));
  const done = activeLine >= STATUS_LINES.length;
  const filled = done ? 8 : Math.max(0, Math.round(((activeLine + 1) / STATUS_LINES.length) * 8) - 2);
  return (
    <Sheet box={SHEETS.upload} frame={frame} appear={appear} padding={64}>
      <div style={{ zoom: 1.3, "--pulse": pulse(frame) } as CSSProperties}>
        <p className="text-ink-soft">photosynthesis.pdf</p>
        <h2 className="mb-10 mt-2 font-serif text-[2.5rem] font-semibold">{done ? "Your lesson is ready" : "Building your lesson"}</h2>
        <LessonSkeleton filled={filled} rows={8} lines={STATUS_LINES} activeLine={activeLine} />
        {done && (
          <div className="mt-8">
            <StatsLine minutes={estimateMinutes(lesson)} pages={lesson.cards.length} questions={lesson.quiz.length} />
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** Teacher: the quiz editor with a question being fixed, then published. */
export function ReviewSheet({ frame, appear }: { frame: number; appear: number }) {
  const box = SHEETS.review;
  return (
    <Sheet box={box} frame={frame} appear={appear}>
      <Shot name="teacher-review.png" />
      {frame >= E.published[0] && (
        <div
          style={{
            position: "absolute",
            right: 28,
            top: 30,
            padding: "12px 28px",
            background: COLORS.paper,
            border: `3px solid ${COLORS.rule}`,
            borderRadius: 4,
            opacity: ramp(frame, ...E.published),
          }}
          className="font-serif text-[52px] font-semibold text-ink"
        >
          <HighlightSwipe progress={ramp(frame, ...E.publishedSwipe)}>Published</HighlightSwipe>
        </div>
      )}
    </Sheet>
  );
}

export function StudentHomeSheet({ frame, appear }: { frame: number; appear: number }) {
  return (
    <Sheet box={SHEETS.studentHome} frame={frame} appear={appear}>
      <Shot name="student-home.png" />
    </Sheet>
  );
}

/** Student: the class code is typed into the join screen. */
export function JoinSheet({ frame, appear }: { frame: number; appear: number }) {
  const box = SHEETS.join;
  const k = shotScale(box);
  const input = RECTS.codeInput;
  // The code is revealed left to right, about as fast as a student types it.
  const typed = ramp(frame, E.typing[0], E.typing[1], linear);
  const textStart = input.x + 17;
  const textWidth = 88;
  const coverLeft = textStart + typed * textWidth;
  return (
    <Sheet box={box} frame={frame} appear={appear}>
      <Shot name="student-join.png" />
      {typed < 1 && (
        <div
          style={{
            position: "absolute",
            left: coverLeft * k,
            top: (input.y + 6) * k,
            width: (input.x + input.width - 4 - coverLeft) * k,
            height: (input.height - 12) * k,
            background: COLORS.sheet,
          }}
        />
      )}
    </Sheet>
  );
}

const WRONG_OPTION = 0;
const quizQuestion = lesson.quiz[2];

/** Student: the weak question. A wrong answer goes brick red and the right one green. */
export function QuizSheet({ frame, appear }: { frame: number; appear: number }) {
  const selected = frame >= E.quizSelect ? WRONG_OPTION : null;
  const revealed = frame >= E.quizReveal;
  return (
    <Sheet box={SHEETS.quiz} frame={frame} appear={appear} padding={80}>
      <div style={{ zoom: 1.3 }}>
        <QuizQuestionView question={quizQuestion} number={3} total={lesson.quiz.length} selectedIndex={selected} revealed={revealed} />
        {revealed && <Button className="mt-8">Next question</Button>}
      </div>
    </Sheet>
  );
}

const missedCard = lesson.cards[WEAK_PAGE - 1];

/** Student: the score and the link that sends them back to the page that teaches the missed answer. */
export function StudentResultsSheet({ frame, appear }: { frame: number; appear: number }) {
  const total = lesson.quiz.length;
  const correct = total - 1;
  const shown = Math.round(ramp(frame, ...E.scoreCount) * correct);
  const box = SHEETS.studentResults;
  return (
    <Sheet box={box} frame={frame} appear={appear} padding={64}>
      <div style={{ zoom: 1.1 }}>
        <p className="mb-4 text-[1.0625rem] text-ink-soft">{lesson.title} quiz</p>
        <ScoreView correct={correct} total={total} shown={shown} verdict={verdict(correct, total)} />
        <section className="mt-12 max-w-3xl">
          <h2 className="font-serif text-[1.625rem] font-semibold">Pages to review</h2>
          <ul className="mt-5 grid gap-8">
            <li>
              <p className="font-serif text-[1.25rem] leading-snug">{quizQuestion.question}</p>
              <p className="mt-2">
                <span className="text-incorrect">Your answer:</span> {quizQuestion.options[WRONG_OPTION]}
              </p>
              <p className="mt-1">
                <span className="text-correct">Right answer:</span> {quizQuestion.options[quizQuestion.correctIndex]}
              </p>
              <span className={buttonClass("quiet", "mt-3")}>
                Review page {WEAK_PAGE}: {missedCard.title}
              </span>
            </li>
          </ul>
        </section>
      </div>
      <Marker
        progress={ramp(frame, ...E.linkMarker)}
        style={{ left: LINK.x - 8, top: LINK.y, width: 268, height: 34 }}
      />
    </Sheet>
  );
}

const STATUS_TEXT: Record<StudentRow["status"], string> = {
  finished: "Finished",
  "in-progress": "In progress",
  "not-started": "Not started",
};

/** Teacher: the real report. Students tick in, bars grow, the weakest page turns red, the insight types out. */
export function TeacherResultsSheet({ frame, appear }: { frame: number; appear: number }) {
  const grow = ramp(frame, ...E.barsGrow);
  const rowsShown = Math.max(0, Math.floor((frame - E.rowsFrom) / E.rowStep) + 1);
  const parts = insightParts(stats);
  const length = parts.before.length + parts.highlight.length + parts.after.length;
  const typed = Math.floor(length * ramp(frame, E.insightType[0], E.insightType[1], linear));
  const before = parts.before.slice(0, typed);
  const highlight = parts.highlight.slice(0, Math.max(0, typed - parts.before.length));
  const after = parts.after.slice(0, Math.max(0, typed - parts.before.length - parts.highlight.length));
  return (
    <Sheet box={SHEETS.teacherResults} frame={frame} appear={appear} padding={56}>
      <p style={{ position: "absolute", right: 44, top: 30 }} className="text-[28px] font-semibold text-ink-soft">
        Demo class
      </p>
      <div style={{ zoom: 1.4 }}>
        <div className="grid grid-cols-[1.05fr_1fr] gap-10">
          <div>
            <p className="min-h-[5.5rem] max-w-[34ch] font-serif text-[2.25rem] leading-snug">
              {before}
              {highlight && <HighlightSwipe progress={ramp(frame, ...E.insightSwipe)}>{highlight}</HighlightSwipe>}
              {after}
            </p>
            <div className="mt-5 h-[3.4rem]">
              {frame >= E.reteach && <span className={buttonClass("primary")}>Re-teach page {stats.weakest.pageNumber}</span>}
            </div>
            <h2 className="mt-8 font-serif text-[1.5rem] font-semibold">Topic mastery</h2>
            <div className="mt-5">
              <MasteryBars topics={stats.topics} grow={grow} highlightCardId={stats.weakest.cardId} />
            </div>
          </div>
          <div>
            <h2 className="font-serif text-[1.5rem] font-semibold">Students</h2>
            <table className="mt-3 w-full border-separate border-spacing-y-1.5 text-left text-[1.0625rem]">
              <thead className="text-[0.9375rem] text-ink-soft">
                <tr>
                  <th scope="col" className="pr-3 font-normal">Student</th>
                  <th scope="col" className="pr-3 font-normal">First attempt</th>
                  <th scope="col" className="pr-3 font-normal">Status</th>
                  <th scope="col" className="font-normal">Weakest topic</th>
                </tr>
              </thead>
              <tbody>
                {stats.rows.map((r, i) => {
                  const done = r.status === "finished";
                  return (
                    <tr key={r.name} style={{ visibility: i < rowsShown ? "visible" : "hidden" }}>
                      <th scope="row" className="pr-3 font-semibold">{r.name}</th>
                      <td className="pr-3 tabular-nums">{done ? `${r.correctCount} / ${r.total}` : "Not yet"}</td>
                      <td className="pr-3 text-ink-soft">{STATUS_TEXT[r.status]}</td>
                      <td className="text-ink-soft">{done ? (r.weakestTitle ?? "None") : "Not yet"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-6 text-[0.9375rem] text-ink-soft">
          Based on {stats.finished} of {stats.enrolled} students who finished the quiz. Class average {stats.classAverage}%. Only each
          student&apos;s first attempt counts.
        </p>
      </div>
    </Sheet>
  );
}

type Rect = { x: number; y: number; width: number; height: number };

/** A highlighter stroke over one thing in a screenshot. `rect` is in screenshot pixels, `box` is the sheet. */
function Stroke({ box, rect, frame, swipe }: { box: Box; rect: Rect; frame: number; swipe: readonly [number, number] }) {
  const k = shotScale(box);
  return (
    <Marker
      progress={ramp(frame, swipe[0], swipe[1])}
      style={{ left: rect.x * k - 10, top: (rect.y + rect.height * 0.14) * k, width: rect.width * k + 20, height: rect.height * k * 0.72 }}
    />
  );
}

/** Teacher: the class page with the new lesson as a draft, which turns into published. */
export function TeacherLessonsSheet({ frame, appear }: { frame: number; appear: number }) {
  const box = SHEETS.teacherLessons;
  return (
    <Sheet box={box} frame={frame} appear={appear}>
      <Shot name="teacher-lessons-draft.png" />
      <div style={{ position: "absolute", inset: 0, opacity: ramp(frame, ...MORE.draftFade) }}>
        <Shot name="teacher-lessons-published.png" />
      </div>
      <Stroke box={box} rect={RECTS.lessonStatus} frame={frame} swipe={MORE.statusSwipe} />
    </Sheet>
  );
}

/** Teacher: the editor, where every page is plain text the teacher can change. */
export function TeacherEditorSheet({ frame, appear }: { frame: number; appear: number }) {
  const box = SHEETS.teacherEditor;
  return (
    <Sheet box={box} frame={frame} appear={appear}>
      <Shot name="teacher-editor.png" />
      <Stroke box={box} rect={RECTS.page1Title} frame={frame} swipe={MORE.titleSwipe} />
    </Sheet>
  );
}

/** Student: the lesson list with the score from the first attempt. */
export function StudentSubjectSheet({ frame, appear }: { frame: number; appear: number }) {
  const box = SHEETS.studentSubject;
  return (
    <Sheet box={box} frame={frame} appear={appear}>
      <Shot name="student-subject.png" />
      <Stroke box={box} rect={RECTS.subjectScore} frame={frame} swipe={MORE.scoreSwipe} />
    </Sheet>
  );
}

/** Student: the sign-up form. Only a first name and a password. */
export function SignupSheet({ frame, appear }: { frame: number; appear: number }) {
  const box = SHEETS.signup;
  return (
    <Sheet box={box} frame={frame} appear={appear}>
      <Shot name="signup-student.png" />
      <Stroke box={box} rect={RECTS.signupName} frame={frame} swipe={MORE.nameSwipe} />
    </Sheet>
  );
}

type NoteProps = { box: Box; frame: number; appear: number; label: string; before: string; mark: string; after: string; swipe: readonly [number, number] };

/** A sheet of one big sentence with one phrase highlighted. */
export function NoteSheet({ box, frame, appear, label, before, mark, after, swipe }: NoteProps) {
  return (
    <Sheet box={box} frame={frame} appear={appear} padding={110}>
      <p className="text-ink-soft" style={{ fontSize: 40 }}>
        {label}
      </p>
      <p className="mt-8 font-serif font-semibold text-ink" style={{ fontSize: 92, lineHeight: 1.22 }}>
        {before}
        <HighlightSwipe progress={ramp(frame, ...swipe)}>{mark}</HighlightSwipe>
        {after}
      </p>
    </Sheet>
  );
}
