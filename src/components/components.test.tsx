// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LessonPageView } from "./LessonPageView";
import { MasteryBars } from "./MasteryBars";
import { ProgressBar } from "./ProgressBar";
import { QuizQuestionView } from "./QuizQuestionView";
import { ScoreView } from "./ScoreView";
import { StatsLine } from "./StatsLine";
import { makeLesson } from "@/lib/test-fixtures";

afterEach(cleanup);

const lesson = makeLesson();

describe("LessonPageView", () => {
  it("shows a padded page number, title and the remember line", () => {
    render(<LessonPageView card={lesson.cards[2]} pageNumber={3} totalPages={5} highlightProgress={1} />);
    expect(screen.getByText("03")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Topic 3");
    expect(screen.getByText("Remember topic 3.")).toBeTruthy();
    expect(screen.getByText("Point A3")).toBeTruthy();
  });
});

describe("QuizQuestionView", () => {
  const q = lesson.quiz[0];

  it("calls onSelect with the option index", () => {
    const onSelect = vi.fn();
    render(<QuizQuestionView question={q} number={1} total={5} selectedIndex={null} revealed={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Wrong A1/ }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("marks right and wrong after reveal with words as well as color, and disables options", () => {
    render(<QuizQuestionView question={q} number={1} total={5} selectedIndex={1} revealed onSelect={vi.fn()} />);
    const right = screen.getByRole("button", { name: /Right 1/ });
    const wrong = screen.getByRole("button", { name: /Wrong A1/ });
    expect(right.getAttribute("data-state")).toBe("right");
    expect(wrong.getAttribute("data-state")).toBe("wrong");
    expect(right.textContent).toContain("Correct answer");
    expect(wrong.textContent).toContain("Your answer");
    expect((wrong as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Not quite\./)).toBeTruthy();
  });

  it("says Right. when the pick is correct", () => {
    render(<QuizQuestionView question={q} number={1} total={5} selectedIndex={0} revealed onSelect={vi.fn()} />);
    expect(screen.getByText(/^Right\./)).toBeTruthy();
  });
});

describe("StatsLine", () => {
  it("formats the lesson stats as a plain sentence", () => {
    render(<StatsLine minutes={9} pages={8} questions={6} />);
    expect(screen.getByText("8 pages, 6 questions, about 9 minutes")).toBeTruthy();
  });
});

describe("ScoreView", () => {
  it("shows the animated count as one text node", () => {
    render(<ScoreView correct={5} total={6} shown={5} verdict="Strong work." />);
    expect(screen.getByText("5 / 6")).toBeTruthy();
  });
});

describe("ProgressBar", () => {
  it("exposes progress to assistive tech", () => {
    render(<ProgressBar value={0.5} label="Lesson progress" />);
    const bar = screen.getByRole("progressbar", { name: "Lesson progress" });
    expect(bar.getAttribute("aria-valuenow")).toBe("50");
  });
});

describe("MasteryBars", () => {
  it("labels the highlighted topic in words", () => {
    const topics = [
      { cardId: "c1", pageNumber: 1, title: "Topic 1", percent: 80, struggling: 2 },
      { cardId: "c2", pageNumber: 2, title: "Topic 2", percent: 52, struggling: 15 },
    ];
    render(<MasteryBars topics={topics} grow={1} highlightCardId="c2" />);
    expect(screen.getByText("Needs re-teaching")).toBeTruthy();
    expect(screen.getAllByText(/%$/).map((n) => n.textContent)).toEqual(["80%", "52%"]);
  });
});
