import { describe, expect, it } from "vitest";
import { sanitizeText } from "./sanitize";

describe("sanitizeText", () => {
  it("turns em dashes into commas", () => {
    expect(sanitizeText("Plants make food — using light.")).toBe("Plants make food, using light.");
    expect(sanitizeText("Plants—animals")).toBe("Plants, animals");
  });
  it("turns spaced en dashes into commas but keeps number ranges", () => {
    expect(sanitizeText("War – a long one")).toBe("War, a long one");
    expect(sanitizeText("1914–1918")).toBe("1914–1918");
  });
  it("removes emojis without leaving double spaces or space before punctuation", () => {
    expect(sanitizeText("Leaves \u{1F331} are green \u{1F600}!")).toBe("Leaves are green!");
    expect(sanitizeText("Keycap 1️⃣ here")).toBe("Keycap 1 here");
  });
  it("keeps copyright and trademark signs", () => {
    expect(sanitizeText("© 2026 Brand™")).toBe("© 2026 Brand™");
  });
  it("drops a leading comma left by a leading dash", () => {
    expect(sanitizeText("— Start here")).toBe("Start here");
  });
});
