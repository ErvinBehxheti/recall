// src/lib/lesson-edit.test.ts
import { describe, expect, it } from "vitest";
import {
  addCard,
  addQuestion,
  nextId,
  removeCard,
  removeQuestion,
  setOption,
  updateCard,
  updateQuestion,
} from "./lesson-edit";
import { makeLesson } from "./test-fixtures";

describe("nextId", () => {
  it("never reuses an id that is taken", () => {
    expect(nextId("c", [])).toBe("c1");
    expect(nextId("c", ["c1", "c2"])).toBe("c3");
    expect(nextId("q", ["q2", "q3"])).toBe("q4");
    expect(nextId("c", ["c1", "c3"])).toBe("c4");
  });
});

describe("cards", () => {
  it("adds a blank page with a fresh id without touching the original", () => {
    const lesson = makeLesson();
    const next = addCard(lesson);
    expect(lesson.cards).toHaveLength(5);
    expect(next.cards).toHaveLength(6);
    expect(next.cards[5]).toEqual({ id: "c6", title: "", explanation: "", keyPoints: [""], rememberThis: "" });
  });

  it("removes and updates a page by id", () => {
    const lesson = makeLesson();
    expect(removeCard(lesson, "c2").cards.map((c) => c.id)).toEqual(["c1", "c3", "c4", "c5"]);
    const updated = updateCard(lesson, "c2", { title: "New title" });
    expect(updated.cards[1].title).toBe("New title");
    expect(updated.cards[0].title).toBe("Topic 1");
  });
});

describe("questions", () => {
  it("adds a blank question that points at the first page", () => {
    const next = addQuestion(makeLesson());
    expect(next.quiz).toHaveLength(6);
    expect(next.quiz[5]).toEqual({
      id: "q6",
      question: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
      cardId: "c1",
    });
  });

  it("removes, updates and sets one option without touching the others", () => {
    const lesson = makeLesson();
    expect(removeQuestion(lesson, "q1").quiz.map((q) => q.id)).toEqual(["q2", "q3", "q4", "q5"]);
    expect(updateQuestion(lesson, "q1", { correctIndex: 2 }).quiz[0].correctIndex).toBe(2);
    const changed = setOption(lesson, "q1", 1, "Edited");
    expect(changed.quiz[0].options).toEqual(["Right 1", "Edited", "Wrong B1", "Wrong C1"]);
    expect(changed.quiz[1].options).toEqual(lesson.quiz[1].options);
    expect(lesson.quiz[0].options[1]).toBe("Wrong A1");
  });
});
