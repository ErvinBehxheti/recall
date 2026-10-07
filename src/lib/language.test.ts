// src/lib/language.test.ts
import { describe, expect, it } from "vitest";
import { detectLanguage, lessonText } from "./language";
import { sanitizeText } from "./sanitize";
import { makeLesson } from "./test-fixtures";

describe("detectLanguage", () => {
  it("recognises Albanian prose", () => {
    const text =
      "Fotosinteza është procesi me të cilin bimët e kthejnë dritën e diellit në energji. Ajo ndodh në gjethe dhe kërkon ujë dhe dioksid karboni.";
    expect(detectLanguage(text)).toBe("sq");
  });

  it("treats English, empty and symbol-only text as English", () => {
    expect(detectLanguage("Photosynthesis is the process plants use to turn sunlight into energy.")).toBe("en");
    expect(detectLanguage("")).toBe("en");
    expect(detectLanguage("12 + 34 = 46")).toBe("en");
  });

  it("builds lesson text from the title and the page explanations", () => {
    const text = lessonText(makeLesson({ title: "Cells" }));
    expect(text).toContain("Cells");
    expect(text).toContain("This is the explanation for topic 1.");
  });

  it("keeps Albanian letters when text is sanitized", () => {
    expect(sanitizeText("Çfarë është një ëndërr?")).toBe("Çfarë është një ëndërr?");
  });
});
