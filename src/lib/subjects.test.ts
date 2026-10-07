// src/lib/subjects.test.ts
import { describe, expect, it } from "vitest";
import { isSubject, SUBJECT_LABELS, SUBJECTS } from "./subjects";

describe("subjects", () => {
  it("lists the five subjects in display order with labels", () => {
    expect(SUBJECTS.map((s) => SUBJECT_LABELS[s])).toEqual(["Biology", "Chemistry", "Math", "Albanian", "English"]);
  });
  it("recognises only the five ids", () => {
    expect(isSubject("math")).toBe(true);
    expect(isSubject("Math")).toBe(false);
    expect(isSubject("art")).toBe(false);
    expect(isSubject(3)).toBe(false);
  });
});
