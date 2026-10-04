import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { handleGenerate } from "./handle-generate";
import { LessonError } from "./errors";
import { buildPptx } from "./pptx-fixture";
import { makeLesson } from "./test-fixtures";

/** Copies into an ArrayBuffer-backed array, which File accepts. */
const bytes = (data: Uint8Array) => new Uint8Array(data);

async function pdfWithPages(n: number) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < n; i++) doc.addPage();
  return bytes(await doc.save());
}

function post(file: File | null) {
  const form = new FormData();
  if (file) form.set("file", file);
  return new Request("http://localhost/api/generate", { method: "POST", body: form });
}

const okDeps = () => ({ hasKey: true, generate: vi.fn(async () => makeLesson()) });

describe("handleGenerate", () => {
  it("returns no_key before reading the upload", async () => {
    const res = await handleGenerate(post(null), { hasKey: false, generate: vi.fn() });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("no_key");
  });

  it("rejects a missing file and a wrong type", async () => {
    expect((await (await handleGenerate(post(null), okDeps())).json()).error.code).toBe("bad_type");
    const txt = new File(["hello"], "notes.txt");
    expect((await handleGenerate(post(txt), okDeps())).status).toBe(415);
  });

  it("generates from a PDF and reports the page count", async () => {
    const deps = okDeps();
    const file = new File([await pdfWithPages(3)], "DECK.PDF", { type: "" });
    const res = await handleGenerate(post(file), deps);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slideCount).toBe(3);
    expect(body.lesson.title).toBe("Test Lesson");
    expect(deps.generate).toHaveBeenCalledWith({ kind: "pdf", base64: expect.any(String) });
  });

  it("rejects PDFs over 60 pages", async () => {
    const file = new File([await pdfWithPages(61)], "long.pdf");
    expect((await (await handleGenerate(post(file), okDeps())).json()).error.code).toBe("too_many_slides");
  });

  it("generates from PPTX text and rejects image-only decks", async () => {
    const deps = okDeps();
    const pptx = await buildPptx([{ file: 1, paragraphs: ["Photosynthesis basics"] }]);
    const res = await handleGenerate(post(new File([bytes(pptx)], "Lesson.PPTX")), deps);
    expect(res.status).toBe(200);
    expect(deps.generate).toHaveBeenCalledWith({ kind: "text", text: "Slide 1:\nPhotosynthesis basics" });

    const empty = await buildPptx([{ file: 1, paragraphs: [] }]);
    const res2 = await handleGenerate(post(new File([bytes(empty)], "pics.pptx")), okDeps());
    expect((await res2.json()).error.code).toBe("empty");
  });

  it("maps generator errors to their status and unknown errors to ai_unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const file = async () => new File([await pdfWithPages(1)], "a.pdf");
    const timeout = await handleGenerate(post(await file()), {
      hasKey: true,
      generate: vi.fn(async () => {
        throw new LessonError("timeout");
      }),
    });
    expect(timeout.status).toBe(504);
    const boom = await handleGenerate(post(await file()), {
      hasKey: true,
      generate: vi.fn(async () => {
        throw new Error("boom");
      }),
    });
    expect(boom.status).toBe(502);
    expect((await boom.json()).error).toEqual({
      code: "ai_unavailable",
      message: "We couldn't reach the AI. Check the internet and try again.",
    });
  });
});
