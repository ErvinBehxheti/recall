import type { Question } from "@/lib/lesson-schema";

type Props = {
  question: Question;
  number: number;
  total: number;
  selectedIndex: number | null;
  revealed: boolean;
  onSelect?: (index: number) => void;
};

type OptionState = "idle" | "selected" | "right" | "wrong" | "dim";

function optionState(index: number, question: Question, selectedIndex: number | null, revealed: boolean): OptionState {
  if (!revealed) return index === selectedIndex ? "selected" : "idle";
  if (index === question.correctIndex) return "right";
  if (index === selectedIndex) return "wrong";
  return "dim";
}

const STATE_CLASS: Record<OptionState, string> = {
  idle: "bg-paper-raised hover:bg-[#e6dccb]",
  selected: "bg-ink text-paper",
  right: "bg-correct text-paper",
  wrong: "bg-incorrect text-paper",
  dim: "bg-paper-raised text-ink-soft",
};

const STATE_NOTE: Partial<Record<OptionState, string>> = { right: "Correct answer", wrong: "Your answer" };

export function QuizQuestionView({ question, number, total, selectedIndex, revealed, onSelect }: Props) {
  const headingId = `question-${question.id}`;
  const gotItRight = selectedIndex === question.correctIndex;
  return (
    <div>
      <p className="text-ink-soft">
        Question {number} of {total}
      </p>
      <h1 id={headingId} className="mt-3 max-w-[30ch] font-serif text-[clamp(1.6rem,3.4vw,2.35rem)] font-semibold leading-[1.2]">
        {question.question}
      </h1>
      <ol role="list" aria-labelledby={headingId} className="mt-8 grid max-w-[44rem] gap-2.5">
        {question.options.map((option, i) => {
          const state = optionState(i, question, selectedIndex, revealed);
          return (
            <li key={option}>
              <button
                type="button"
                data-state={state}
                disabled={revealed}
                onClick={() => onSelect?.(i)}
                className={`flex w-full items-baseline gap-4 rounded-[4px] px-5 py-4 text-left text-[1.125rem] leading-snug disabled:cursor-default ${STATE_CLASS[state]}`}
              >
                <span aria-hidden className="w-4 shrink-0 font-serif tabular-nums opacity-60">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">{option}</span>
                {STATE_NOTE[state] && <span className="shrink-0 text-[0.875rem]">{STATE_NOTE[state]}</span>}
              </button>
            </li>
          );
        })}
      </ol>
      {revealed && (
        <p role="status" className="mt-6 max-w-[60ch] font-serif text-[1.25rem] leading-relaxed">
          <strong className={gotItRight ? "text-correct" : "text-incorrect"}>{gotItRight ? "Right." : "Not quite."}</strong>{" "}
          {question.explanation}
        </p>
      )}
    </div>
  );
}
