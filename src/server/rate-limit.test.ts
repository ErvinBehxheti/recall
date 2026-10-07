// src/server/rate-limit.test.ts
import { describe, expect, it } from "vitest";
import { createLimiter } from "./rate-limit";

describe("createLimiter", () => {
  it("blocks a key after max failures inside the window and frees it afterwards", () => {
    let now = 0;
    const limiter = createLimiter(3, 60_000, () => now);
    for (let i = 0; i < 3; i++) {
      expect(limiter.blocked("a")).toBe(false);
      limiter.fail("a");
    }
    expect(limiter.blocked("a")).toBe(true);
    expect(limiter.blocked("b")).toBe(false);
    now = 60_001;
    expect(limiter.blocked("a")).toBe(false);
  });

  it("reset clears a key", () => {
    const limiter = createLimiter(1, 60_000, () => 0);
    limiter.fail("a");
    expect(limiter.blocked("a")).toBe(true);
    limiter.reset("a");
    expect(limiter.blocked("a")).toBe(false);
  });
});
