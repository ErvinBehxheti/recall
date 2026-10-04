import { describe, expect, it } from "vitest";
import { uploadReducer, type UploadState } from "./upload-state";

describe("uploadReducer (Review Focus 5)", () => {
  const idle: UploadState = { phase: "idle" };

  it("starts generating from idle and from error", () => {
    expect(uploadReducer(idle, { type: "start", mode: "ai", fileName: "a.pdf" })).toEqual({
      phase: "generating",
      mode: "ai",
      fileName: "a.pdf",
    });
    expect(uploadReducer({ phase: "error", code: "timeout" }, { type: "start", mode: "demo", fileName: "x" }).phase).toBe(
      "generating",
    );
  });

  it("ignores a second start while generating", () => {
    const busy = uploadReducer(idle, { type: "start", mode: "ai", fileName: "a.pdf" });
    expect(uploadReducer(busy, { type: "start", mode: "demo", fileName: "b" })).toBe(busy);
  });

  it("fails and resets", () => {
    const busy = uploadReducer(idle, { type: "start", mode: "ai", fileName: "a.pdf" });
    expect(uploadReducer(busy, { type: "fail", code: "no_key" })).toEqual({ phase: "error", code: "no_key" });
    expect(uploadReducer({ phase: "error", code: "no_key" }, { type: "reset" })).toEqual(idle);
  });
});
