// src/app-components/LessonEditor.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { addCard, addQuestion, removeCard, removeQuestion, setOption, updateCard, updateQuestion } from "@/lib/lesson-edit";
import type { Lesson } from "@/lib/lesson-schema";

const CONTROL = "w-full rounded-[4px] border border-rule bg-sheet px-3 py-2 text-[1.0625rem]";
type Note = { text: string; bad: boolean };

async function send(url: string, method: string, body?: unknown): Promise<string | null> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.error?.message ?? "Something went wrong. Try again.";
}

export function LessonEditor({ lessonId, classId, initial }: { lessonId: number; classId: number; initial: Lesson }) {
  const router = useRouter();
  const [lesson, setLesson] = useState(initial);
  const [note, setNote] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(): Promise<boolean> {
    const error = await send(`/api/teacher/lessons/${lessonId}`, "PUT", lesson);
    setNote(error ? { text: error, bad: true } : { text: "Saved.", bad: false });
    return error === null;
  }

  async function run(job: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await job();
    } finally {
      setBusy(false);
    }
  }

  const publish = () =>
    run(async () => {
      if (!(await save())) return;
      const error = await send(`/api/teacher/lessons/${lessonId}/status`, "POST", { status: "published" });
      if (error) return setNote({ text: error, bad: true });
      router.refresh();
    });

  const remove = () =>
    run(async () => {
      if (!window.confirm("Delete this lesson? This cannot be undone.")) return;
      const error = await send(`/api/teacher/lessons/${lessonId}`, "DELETE");
      if (error) return setNote({ text: error, bad: true });
      router.push(`/teacher/classes/${classId}`);
    });

  return (
    <div className="mt-10 max-w-3xl">
      <div className="grid gap-1.5">
        <label htmlFor="lesson-title" className="font-semibold">
          Lesson title
        </label>
        <input
          id="lesson-title"
          className={CONTROL}
          value={lesson.title}
          onChange={(e) => setLesson({ ...lesson, title: e.target.value })}
        />
      </div>

      <h2 className="mt-14 font-serif text-[1.5rem] font-semibold">Pages</h2>
      <div className="mt-5 grid gap-10">
        {lesson.cards.map((card, i) => (
          <fieldset key={card.id} className="grid gap-3">
            <legend className="mb-2 font-serif text-[1.25rem] font-semibold">Page {i + 1}</legend>
            <input
              aria-label={`Page ${i + 1} title`}
              className={CONTROL}
              value={card.title}
              onChange={(e) => setLesson(updateCard(lesson, card.id, { title: e.target.value }))}
            />
            <textarea
              aria-label={`Page ${i + 1} explanation`}
              rows={4}
              className={CONTROL}
              value={card.explanation}
              onChange={(e) => setLesson(updateCard(lesson, card.id, { explanation: e.target.value }))}
            />
            <textarea
              aria-label={`Page ${i + 1} key points, one per line`}
              rows={3}
              className={CONTROL}
              value={card.keyPoints.join("\n")}
              onChange={(e) => setLesson(updateCard(lesson, card.id, { keyPoints: e.target.value.split("\n") }))}
            />
            <input
              aria-label={`Page ${i + 1} remember line`}
              className={CONTROL}
              value={card.rememberThis}
              onChange={(e) => setLesson(updateCard(lesson, card.id, { rememberThis: e.target.value }))}
            />
            <div>
              <Button variant="quiet" aria-label={`Remove page ${i + 1}`} onClick={() => setLesson(removeCard(lesson, card.id))}>
                Remove page
              </Button>
            </div>
          </fieldset>
        ))}
      </div>
      <div className="mt-6">
        <Button variant="quiet" onClick={() => setLesson(addCard(lesson))}>
          Add page
        </Button>
      </div>

      <h2 className="mt-14 font-serif text-[1.5rem] font-semibold">Quiz</h2>
      <p className="mt-2 text-ink-soft">Tick the correct option for each question. Students never see the answers before they answer.</p>
      <div className="mt-5 grid gap-10">
        {lesson.quiz.map((q, i) => {
          const n = i + 1;
          const pointsAtPage = lesson.cards.some((c) => c.id === q.cardId);
          return (
            <fieldset key={q.id} className="grid gap-3">
              <legend className="mb-2 font-serif text-[1.25rem] font-semibold">Question {n}</legend>
              <textarea
                aria-label={`Question ${n} text`}
                rows={2}
                className={CONTROL}
                value={q.question}
                onChange={(e) => setLesson(updateQuestion(lesson, q.id, { question: e.target.value }))}
              />
              {q.options.map((option, k) => (
                <div key={k} className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-3">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    aria-label={`Question ${n} option ${k + 1} is correct`}
                    checked={q.correctIndex === k}
                    onChange={() => setLesson(updateQuestion(lesson, q.id, { correctIndex: k }))}
                  />
                  <input
                    aria-label={`Question ${n} option ${k + 1}`}
                    className={CONTROL}
                    value={option}
                    onChange={(e) => setLesson(setOption(lesson, q.id, k, e.target.value))}
                  />
                </div>
              ))}
              <textarea
                aria-label={`Question ${n} explanation`}
                rows={2}
                className={CONTROL}
                value={q.explanation}
                onChange={(e) => setLesson(updateQuestion(lesson, q.id, { explanation: e.target.value }))}
              />
              <select
                aria-label={`Question ${n} teaches page`}
                className={CONTROL}
                value={q.cardId}
                onChange={(e) => setLesson(updateQuestion(lesson, q.id, { cardId: e.target.value }))}
              >
                {!pointsAtPage && <option value={q.cardId}>Choose a page</option>}
                {lesson.cards.map((c, p) => (
                  <option key={c.id} value={c.id}>{`Page ${p + 1}: ${c.title || "Untitled"}`}</option>
                ))}
              </select>
              <div>
                <Button variant="quiet" aria-label={`Remove question ${n}`} onClick={() => setLesson(removeQuestion(lesson, q.id))}>
                  Remove question
                </Button>
              </div>
            </fieldset>
          );
        })}
      </div>
      <div className="mt-6">
        <Button variant="quiet" onClick={() => setLesson(addQuestion(lesson))}>
          Add question
        </Button>
      </div>

      <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4">
        <Button onClick={publish} disabled={busy}>
          Publish
        </Button>
        <Button variant="quiet" onClick={() => run(async () => void (await save()))} disabled={busy}>
          Save draft
        </Button>
        <Button variant="quiet" onClick={remove} disabled={busy}>
          Delete lesson
        </Button>
      </div>
      {note && (
        <p role={note.bad ? "alert" : "status"} className={`mt-5 ${note.bad ? "text-incorrect" : "text-ink-soft"}`}>
          {note.text}
        </p>
      )}
    </div>
  );
}
