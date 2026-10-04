import { describe, expect, it } from "vitest";
import { detectFileKind, MAX_FILE_BYTES, precheckFile } from "./file-kind";

const enc = (s: string) => new TextEncoder().encode(s);
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]);

describe("detectFileKind (Review Focus 1)", () => {
  it("detects PDFs by magic bytes regardless of name case", () => {
    expect(detectFileKind("Deck.PDF", enc("%PDF-1.7\n"))).toBe("pdf");
    expect(detectFileKind("weird-name", enc("%PDF-1.4"))).toBe("pdf");
    expect(detectFileKind("junk-first.pdf", enc("\n\n%PDF-1.4"))).toBe("pdf");
  });
  it("detects PPTX by zip bytes plus .pptx extension in any case", () => {
    expect(detectFileKind("LESSON.PPTX", ZIP)).toBe("pptx");
    expect(detectFileKind("report.docx", ZIP)).toBeNull();
  });
  it("rejects lookalikes", () => {
    expect(detectFileKind("fake.pdf", enc("hello"))).toBeNull();
    expect(detectFileKind("old.ppt", new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]))).toBeNull();
  });
});

describe("precheckFile", () => {
  it("accepts a PDF with an empty MIME type", async () => {
    expect(await precheckFile(new File([enc("%PDF-1.7")], "a.pdf", { type: "" }))).toBeNull();
  });
  it("flags wrong types and big files", async () => {
    expect(await precheckFile(new File([enc("hi")], "a.txt"))).toBe("bad_type");
    const big = new File([new Uint8Array(MAX_FILE_BYTES + 1)], "big.pdf");
    expect(await precheckFile(big)).toBe("too_big");
  });
});
