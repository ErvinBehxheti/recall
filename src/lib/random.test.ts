// src/lib/random.test.ts
import { describe, expect, it } from "vitest";
import { hashString, mulberry32 } from "./random";

describe("mulberry32", () => {
  it("repeats the same sequence for the same seed and stays in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const first = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(first);
    expect(first.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(mulberry32(43)()).not.toBe(first[0]);
  });
});

describe("hashString", () => {
  it("is stable and differs between texts", () => {
    expect(hashString("a")).toBe(hashString("a"));
    expect(hashString("a")).not.toBe(hashString("b"));
  });
});
