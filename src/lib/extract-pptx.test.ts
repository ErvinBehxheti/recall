import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { extractPptx, hasReadableText, slidesToPrompt, xmlToText } from "./extract-pptx";
import { buildPptx } from "./pptx-fixture";

describe("xmlToText", () => {
  it("joins runs per paragraph, decodes entities, turns line breaks into spaces and skips fields", () => {
    const xml =
      "<a:p><a:r><a:t>Light &amp; water</a:t></a:r><a:br/><a:r><a:t>make &#x201C;food&#x201D;</a:t></a:r></a:p>" +
      '<a:p><a:pPr/><a:r><a:t xml:space="preserve">Second &lt;line&gt;</a:t></a:r></a:p>' +
      '<a:p><a:fld id="1" type="slidenum"><a:t>7</a:t></a:fld></a:p>';
    expect(xmlToText(xml)).toBe("Light & water make “food”\nSecond <line>");
  });
});

describe("extractPptx", () => {
  it("follows presentation order, not file names (Review Focus 2)", async () => {
    const data = await buildPptx(
      [
        { file: 1, paragraphs: ["Moved to the end"] },
        { file: 2, paragraphs: ["Second"] },
        { file: 10, paragraphs: ["Title slide"] },
      ],
      [10, 2, 1],
    );
    const slides = await extractPptx(data);
    expect(slides.map((s) => s.text)).toEqual(["Title slide", "Second", "Moved to the end"]);
    expect(slides.map((s) => s.number)).toEqual([1, 2, 3]);
  });

  it("falls back to numeric file order when presentation.xml is missing", async () => {
    const data = await buildPptx([
      { file: 10, paragraphs: ["Ten"] },
      { file: 2, paragraphs: ["Two"] },
    ]);
    const zip = await JSZip.loadAsync(data);
    zip.remove("ppt/presentation.xml");
    const slides = await extractPptx(await zip.generateAsync({ type: "uint8array" }));
    expect(slides.map((s) => s.text)).toEqual(["Two", "Ten"]);
  });

  it("reads speaker notes through the slide relationships, without the slide number field", async () => {
    const data = await buildPptx([{ file: 3, paragraphs: ["Chlorophyll"], notes: ["Say it is green."] }]);
    const [slide] = await extractPptx(data);
    expect(slide.notes).toBe("Say it is green.");
  });

  it("throws on bytes that are not a zip", async () => {
    await expect(extractPptx(new TextEncoder().encode("not a zip"))).rejects.toThrow();
  });
});

describe("slidesToPrompt and hasReadableText", () => {
  it("labels slides and notes", () => {
    const text = slidesToPrompt([
      { number: 1, text: "Intro", notes: "" },
      { number: 2, text: "", notes: "Talk about leaves" },
    ]);
    expect(text).toBe("Slide 1:\nIntro\n\nSlide 2:\n(no text)\nSpeaker notes: Talk about leaves");
  });
  it("detects image-only decks", () => {
    expect(hasReadableText([{ number: 1, text: "", notes: "" }, { number: 2, text: "7", notes: "" }])).toBe(false);
    expect(hasReadableText([{ number: 1, text: "Cells", notes: "" }])).toBe(true);
  });
});
