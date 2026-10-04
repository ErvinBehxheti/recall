"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { LessonPageView } from "@/components/LessonPageView";
import { LessonSkeleton } from "@/components/LessonSkeleton";
import { BRAND } from "@/config/brand";
import { DEFAULT_DEMO_SLUG, DEMOS, getDemo } from "@/demo";
import { ERROR_MESSAGES, isErrorCode, type ErrorCode } from "@/lib/errors";
import { ACCEPT, precheckFile } from "@/lib/file-kind";
import { useLessonStore } from "@/lib/lesson-store";
import { SiteHeader } from "./SiteHeader";
import { uploadReducer, type UploadMode } from "./upload-state";
import { useAnimatedValue } from "./useAnimatedValue";
import { useKey } from "./useKey";

const DEMO_DURATION_MS = 5000;
const STEP_MS: Record<UploadMode, number> = { demo: 1200, ai: 7000 };

const heroDemo = getDemo(DEFAULT_DEMO_SLUG)!;
const heroCardIndex = 3;

export function UploadScreen() {
  const router = useRouter();
  const { setLesson } = useLessonStore();
  const [state, dispatch] = useReducer(uploadReducer, { phase: "idle" });
  const [showSamples, setShowSamples] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const demoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const request = useRef<AbortController>(undefined);
  const dragDepth = useRef(0);

  useEffect(
    () => () => {
      clearTimeout(demoTimer.current);
      request.current?.abort();
    },
    [],
  );

  function fail(code: ErrorCode) {
    busy.current = false;
    dispatch({ type: "fail", code });
  }

  function startDemo(slug: string) {
    const demo = getDemo(slug);
    if (!demo || busy.current) return;
    busy.current = true;
    dispatch({ type: "start", mode: "demo", fileName: `${demo.lesson.title} sample` });
    demoTimer.current = setTimeout(() => {
      setLesson(demo.lesson, demo.slideCount, "demo");
      router.push("/lesson");
    }, DEMO_DURATION_MS);
  }

  async function startFile(file: File) {
    if (busy.current) return;
    busy.current = true;
    dispatch({ type: "start", mode: "ai", fileName: file.name });

    const problem = await precheckFile(file);
    if (problem) return fail(problem);

    const body = new FormData();
    body.set("file", file);
    request.current = new AbortController();
    try {
      const res = await fetch("/api/generate", { method: "POST", body, signal: request.current.signal });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.lesson) {
        return fail(isErrorCode(data?.error?.code) ? data.error.code : "ai_unavailable");
      }
      setLesson(data.lesson, data.slideCount, "ai");
      router.push("/lesson");
    } catch {
      if (!request.current?.signal.aborted) fail("ai_unavailable");
    }
  }

  useKey("d", () => startDemo(DEFAULT_DEMO_SLUG), state.phase !== "generating");

  const dropHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes("Files")) e.preventDefault();
    },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void startFile(file);
    },
  };

  return (
    <div className="flex min-h-dvh flex-col" {...dropHandlers}>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 pb-12 pt-2 sm:px-8">
        {state.phase === "idle" && (
          <Hero
            showSamples={showSamples}
            onUpload={() => inputRef.current?.click()}
            onToggleSamples={() => setShowSamples((v) => !v)}
            onSample={startDemo}
          />
        )}
        {state.phase === "generating" && <Generating key={state.fileName} mode={state.mode} fileName={state.fileName} />}
        {state.phase === "error" && (
          <ErrorPanel
            code={state.code}
            onSample={() => startDemo(DEFAULT_DEMO_SLUG)}
            onRetry={() => dispatch({ type: "reset" })}
          />
        )}
      </main>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void startFile(file);
        }}
      />

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-paper/95">
          <p className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-semibold">Drop your slides</p>
        </div>
      )}
    </div>
  );
}

function Hero(props: {
  showSamples: boolean;
  onUpload: () => void;
  onToggleSamples: () => void;
  onSample: (slug: string) => void;
}) {
  const swipe = useAnimatedValue(1, 900, 700);
  return (
    <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div>
        <h1 className="max-w-[17ch] font-serif text-[clamp(2.4rem,4.4vw,3.6rem)] font-semibold leading-[1.06] tracking-[-0.02em]">
          Turn tonight&apos;s slides into a lesson your class actually remembers.
        </h1>
        <p className="mt-6 max-w-[50ch] text-[1.25rem] leading-relaxed text-ink-soft">
          {BRAND.name} rewrites any deck into short pages students study at their own pace, then quizzes them and sends
          every wrong answer back to the page that teaches it.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button onClick={props.onUpload}>Upload your slides</Button>
          <Button variant="quiet" aria-expanded={props.showSamples} onClick={props.onToggleSamples}>
            or try a sample lesson
          </Button>
        </div>
        {props.showSamples && (
          <ul className="mt-5 grid max-w-md gap-1">
            {DEMOS.map((demo) => (
              <li key={demo.slug}>
                <button
                  type="button"
                  onClick={() => props.onSample(demo.slug)}
                  className="flex w-full items-baseline justify-between gap-4 rounded-[4px] px-4 py-3 text-left hover:bg-paper-raised"
                >
                  <span className="font-serif text-[1.125rem] font-semibold">{demo.lesson.title}</span>
                  <span className="text-[0.9375rem] text-ink-soft">{demo.lesson.subject}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-7 text-[0.9375rem] text-ink-soft">
          Works with PDF and PowerPoint. Ready in under a minute. We don&apos;t keep your slides.
        </p>
      </div>

      <figure className="relative mx-auto w-full max-w-[34rem]">
        <div className="-rotate-[1.2deg] rounded-[2px] border border-rule bg-sheet px-7 py-7 sm:px-9 sm:py-8">
          <LessonPageView
            card={heroDemo.lesson.cards[heroCardIndex]}
            pageNumber={heroCardIndex + 1}
            totalPages={heroDemo.lesson.cards.length}
            highlightProgress={swipe}
          />
        </div>
        <figcaption className="mt-5 text-center text-[0.875rem] text-ink-soft">
          A page from the sample lesson on {heroDemo.lesson.title.toLowerCase()}.
        </figcaption>
      </figure>
    </div>
  );
}

const STATUS_LINES = ["Reading your slides", "Finding the key ideas", "Writing the lesson pages", "Writing your quiz"];

function Generating({ mode, fileName }: { mode: UploadMode; fileName: string }) {
  const [activeLine, setActiveLine] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setActiveLine((n) => Math.min(n + 1, STATUS_LINES.length - 1)), STEP_MS[mode]);
    return () => clearInterval(timer);
  }, [mode]);

  const rows = 8;
  const filled = Math.round(((activeLine + 1) / STATUS_LINES.length) * rows) - 2;
  return (
    <section aria-labelledby="generating-title" className="w-full">
      <p className="text-ink-soft">{fileName}</p>
      <h1 id="generating-title" className="mt-2 mb-10 font-serif text-[clamp(2rem,4vw,3rem)] font-semibold">
        Building your lesson
      </h1>
      <p aria-live="polite" className="sr-only">
        {STATUS_LINES[activeLine]}
      </p>
      <LessonSkeleton filled={Math.max(0, filled)} rows={rows} lines={STATUS_LINES} activeLine={activeLine} />
    </section>
  );
}

function ErrorPanel({ code, onSample, onRetry }: { code: ErrorCode; onSample: () => void; onRetry: () => void }) {
  return (
    <section role="alert" className="max-w-2xl">
      <h1 className="font-serif text-[clamp(1.9rem,4vw,2.75rem)] font-semibold leading-tight">{ERROR_MESSAGES[code]}</h1>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button onClick={onSample}>Try the sample lesson</Button>
        <Button variant="quiet" onClick={onRetry}>
          Try another file
        </Button>
      </div>
    </section>
  );
}
