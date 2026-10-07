// src/app-components/ClassUpload.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { LessonSkeleton } from "@/components/LessonSkeleton";
import { ERROR_MESSAGES } from "@/lib/errors";
import { ACCEPT, precheckFile } from "@/lib/file-kind";

const STATUS_LINES = ["Reading your slides", "Finding the key ideas", "Writing the lesson pages", "Writing your quiz"];

export function ClassUpload({ classId }: { classId: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setWorking(file.name);
    const problem = await precheckFile(file);
    if (problem) {
      setWorking(null);
      return setError(ERROR_MESSAGES[problem]);
    }
    const body = new FormData();
    body.set("file", file);
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/lessons`, { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.lessonId) throw new Error(data?.error?.message ?? ERROR_MESSAGES.ai_unavailable);
      router.push(`/teacher/lessons/${data.lessonId}`);
    } catch (e) {
      setWorking(null);
      setError(e instanceof Error ? e.message : ERROR_MESSAGES.ai_unavailable);
    }
  }

  if (working) return <Building fileName={working} />;

  return (
    <div>
      <Button onClick={() => inputRef.current?.click()}>Upload slides</Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        aria-label="Slides file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <p className="mt-3 text-[0.9375rem] text-ink-soft">
        PDF or PowerPoint, up to 20 MB and 60 slides. You can edit everything before students see it.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-incorrect">
          {error}
        </p>
      )}
    </div>
  );
}

function Building({ fileName }: { fileName: string }) {
  const [activeLine, setActiveLine] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setActiveLine((n) => Math.min(n + 1, STATUS_LINES.length - 1)), 7000);
    return () => clearInterval(timer);
  }, []);
  const rows = 8;
  const filled = Math.max(0, Math.round(((activeLine + 1) / STATUS_LINES.length) * rows) - 2);
  return (
    <section aria-labelledby="building-title" className="w-full">
      <p className="text-ink-soft">{fileName}</p>
      <h2 id="building-title" className="mb-10 mt-2 font-serif text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold">
        Building your lesson
      </h2>
      <p aria-live="polite" className="sr-only">
        {STATUS_LINES[activeLine]}
      </p>
      <LessonSkeleton filled={filled} rows={rows} lines={STATUS_LINES} activeLine={activeLine} />
    </section>
  );
}
