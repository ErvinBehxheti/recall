import { describe, expect, it } from "vitest";
import { validateLesson } from "./validate-lesson";
import { lessonJsonSchema } from "./lesson-schema";
import { makeLesson } from "./test-fixtures";

describe("validateLesson", () => {
  it("accepts a well-formed lesson", () => {
    const result = validateLesson(makeLesson());
    expect(result.ok).toBe(true);
  });

  it("rejects non-objects and missing fields", () => {
    expect(validateLesson(null).ok).toBe(false);
    expect(validateLesson({ title: "x" }).ok).toBe(false);
  });

  it("rejects too few cards and too many questions", () => {
    const base = makeLesson();
    expect(validateLesson({ ...base, cards: base.cards.slice(0, 3) }).ok).toBe(false);
    const many = Array.from({ length: 11 }, (_, i) => ({ ...base.quiz[0], id: `q${i + 1}` }));
    expect(validateLesson({ ...base, quiz: many }).ok).toBe(false);
  });

  it("rejects a question pointing to a missing card", () => {
    const base = makeLesson();
    const quiz = base.quiz.map((q, i) => (i === 0 ? { ...q, cardId: "c99" } : q));
    const result = validateLesson({ ...base, quiz });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.join(" ")).toContain("c99");
  });

  it("rejects duplicate ids, wrong option counts, repeated options and bad correctIndex", () => {
    const base = makeLesson();
    const dupCards = base.cards.map((c, i) => (i === 1 ? { ...c, id: "c1" } : c));
    expect(validateLesson({ ...base, cards: dupCards }).ok).toBe(false);
    const threeOptions = base.quiz.map((q, i) => (i === 0 ? { ...q, options: q.options.slice(0, 3) } : q));
    expect(validateLesson({ ...base, quiz: threeOptions }).ok).toBe(false);
    const repeated = base.quiz.map((q, i) => (i === 0 ? { ...q, options: ["A", "a", "B", "C"] } : q));
    expect(validateLesson({ ...base, quiz: repeated }).ok).toBe(false);
    const badIndex = base.quiz.map((q, i) => (i === 0 ? { ...q, correctIndex: 4 } : q));
    expect(validateLesson({ ...base, quiz: badIndex }).ok).toBe(false);
  });

  it("returns sanitized text", () => {
    const base = makeLesson();
    const cards = base.cards.map((c, i) => (i === 0 ? { ...c, explanation: "Light — energy \u{1F31E}." } : c));
    const result = validateLesson({ ...base, cards });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.lesson.cards[0].explanation).toBe("Light, energy.");
  });
});

describe("lessonJsonSchema", () => {
  it("is an object schema with no $schema key and closed objects", () => {
    const schema = lessonJsonSchema() as { type: string; additionalProperties: boolean; required: string[] };
    expect(schema.type).toBe("object");
    expect(schema).not.toHaveProperty("$schema");
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(expect.arrayContaining(["title", "subject", "cards", "quiz"]));
    expect(JSON.stringify(schema)).not.toContain('"additionalProperties":true');
  });

  it("has no numeric bound keywords, which structured output does not accept", () => {
    const text = JSON.stringify(lessonJsonSchema());
    expect(text).not.toMatch(/"(minimum|maximum)":/);
    expect(text).toContain("minimum: 0, maximum: 3");
  });
});
