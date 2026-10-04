import { afterEach, describe, expect, it, vi } from "vitest";
import { buildLessonRequest, generateLesson, parseEffort, type CreateMessage } from "./generate-lesson";
import { LessonError } from "./errors";
import { makeLesson } from "./test-fixtures";

const reply = (text: string, stop_reason = "end_turn") => ({ stop_reason, content: [{ type: "text", text }] });
const good = JSON.stringify(makeLesson());
const source = { kind: "text", text: "Slide 1:\nCells" } as const;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("generateLesson", () => {
  it("returns the validated lesson", async () => {
    const createMessage = vi.fn<CreateMessage>(async () => reply(good));
    const lesson = await generateLesson(source, { createMessage });
    expect(lesson.title).toBe("Test Lesson");
    expect(createMessage).toHaveBeenCalledTimes(1);
  });

  it("retries once after invalid output, then succeeds", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const createMessage = vi
      .fn<CreateMessage>()
      .mockResolvedValueOnce(reply("{not json"))
      .mockResolvedValueOnce(reply(good));
    await expect(generateLesson(source, { createMessage })).resolves.toMatchObject({ title: "Test Lesson" });
    expect(createMessage).toHaveBeenCalledTimes(2);
  });

  it("retries after max_tokens", async () => {
    const createMessage = vi
      .fn<CreateMessage>()
      .mockResolvedValueOnce(reply("{", "max_tokens"))
      .mockResolvedValueOnce(reply(good));
    await expect(generateLesson(source, { createMessage })).resolves.toBeTruthy();
    expect(createMessage).toHaveBeenCalledTimes(2);
  });

  it("fails with invalid_output after two bad replies", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const createMessage = vi.fn<CreateMessage>(async () => reply('{"title":"x"}'));
    await expect(generateLesson(source, { createMessage })).rejects.toMatchObject({ code: "invalid_output" });
    expect(createMessage).toHaveBeenCalledTimes(2);
  });

  it("does not retry when less than 45s of the 120s deadline is left", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let t = 0;
    const createMessage = vi.fn<CreateMessage>(async () => {
      t += 80_000;
      return reply("{bad");
    });
    await expect(generateLesson(source, { createMessage, now: () => t })).rejects.toMatchObject({ code: "invalid_output" });
    expect(createMessage).toHaveBeenCalledTimes(1);
  });

  it("maps a refusal to the refused error", async () => {
    const createMessage = vi.fn<CreateMessage>(async () => ({ stop_reason: "refusal", content: [] }));
    const result = generateLesson(source, { createMessage });
    await expect(result).rejects.toBeInstanceOf(LessonError);
    await expect(result).rejects.toMatchObject({ code: "refused" });
  });

  it("maps an aborted call to timeout", async () => {
    vi.useFakeTimers();
    const createMessage: CreateMessage = (_params, { signal }) =>
      new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))));
    const pending = generateLesson(source, { createMessage });
    const assertion = expect(pending).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(120_000);
    await assertion;
  });
});

describe("buildLessonRequest", () => {
  it("puts the PDF document block before the instruction and enables fallbacks", () => {
    const req = buildLessonRequest({ kind: "pdf", base64: "AAAA" }, "low");
    expect(req.model).toBe("claude-opus-5-5");
    expect(req.betas).toContain("server-side-fallback-2026-07-01");
    expect(req.fallbacks).toBe("default");
    expect(req.output_config.effort).toBe("low");
    expect(req.output_config.format.type).toBe("json_schema");
    const content = req.messages[0].content;
    expect(content[0]).toMatchObject({ type: "document", source: { media_type: "application/pdf", data: "AAAA" } });
    expect(content[1]).toMatchObject({ type: "text" });
  });
  it("wraps PPTX text in slides tags", () => {
    const req = buildLessonRequest(source, "medium");
    expect(req.messages[0].content[0]).toMatchObject({ type: "text", text: expect.stringContaining("<slides>\nSlide 1:") });
  });
});

describe("parseEffort", () => {
  it("defaults to medium", () => {
    expect(parseEffort(undefined)).toBe("medium");
    expect(parseEffort("LOW")).toBe("low");
    expect(parseEffort("turbo")).toBe("medium");
  });
});
