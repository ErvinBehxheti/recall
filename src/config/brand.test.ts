import { describe, expect, it } from "vitest";
import { BRAND } from "./brand";

describe("BRAND", () => {
  it("has a name and a tagline with no em dashes", () => {
    expect(BRAND.name).toBe("Recall");
    expect(BRAND.tagline).toBe("Slides in. Lesson out.");
    expect(`${BRAND.name}${BRAND.tagline}`).not.toMatch(/\u2014/);
  });
});
