import { PDFDocument } from "pdf-lib";
import { ERROR_MESSAGES, ERROR_STATUS, LessonError } from "./errors";
import { extractPptx, hasReadableText, slidesToPrompt } from "./extract-pptx";
import { detectFileKind, MAX_FILE_BYTES, MAX_SLIDES } from "./file-kind";
import type { LessonSource } from "./generate-lesson";
import type { Lesson } from "./lesson-schema";

export type HandlerDeps = { hasKey: boolean; generate: (source: LessonSource) => Promise<Lesson> };
type Prepared = { source: LessonSource; slideCount: number };

async function readPdf(bytes: Uint8Array): Promise<Prepared> {
  let slideCount: number;
  try {
    slideCount = (await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })).getPageCount();
  } catch {
    throw new LessonError("bad_type");
  }
  if (slideCount > MAX_SLIDES) throw new LessonError("too_many_slides");
  return { slideCount, source: { kind: "pdf", base64: Buffer.from(bytes).toString("base64") } };
}

async function readPptx(bytes: Uint8Array): Promise<Prepared> {
  const slides = await extractPptx(bytes).catch(() => {
    throw new LessonError("bad_type");
  });
  if (slides.length === 0) throw new LessonError("bad_type");
  if (slides.length > MAX_SLIDES) throw new LessonError("too_many_slides");
  if (!hasReadableText(slides)) throw new LessonError("empty");
  return { slideCount: slides.length, source: { kind: "text", text: slidesToPrompt(slides) } };
}

export async function handleGenerate(request: Request, deps: HandlerDeps): Promise<Response> {
  try {
    if (!deps.hasKey) throw new LessonError("no_key");
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new LessonError("bad_type");
    if (file.size > MAX_FILE_BYTES) throw new LessonError("too_big");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = detectFileKind(file.name, bytes.subarray(0, 1024));
    if (!kind) throw new LessonError("bad_type");
    const { source, slideCount } = kind === "pdf" ? await readPdf(bytes) : await readPptx(bytes);
    const lesson = await deps.generate(source);
    return Response.json({ lesson, slideCount });
  } catch (error) {
    if (!(error instanceof LessonError)) console.error("Unexpected generate error:", error);
    const code = error instanceof LessonError ? error.code : "ai_unavailable";
    return Response.json({ error: { code, message: ERROR_MESSAGES[code] } }, { status: ERROR_STATUS[code] });
  }
}
