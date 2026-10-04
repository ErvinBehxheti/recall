import type { ErrorCode } from "./errors";

export type FileKind = "pdf" | "pptx";
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_SLIDES = 60;
export const ACCEPT =
  ".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation";

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

function startsAt(bytes: Uint8Array, magic: number[], at: number) {
  return magic.every((b, i) => bytes[at + i] === b);
}

/** Uses file bytes and the lowercase extension. MIME types are unreliable on Windows, so they are ignored. */
export function detectFileKind(name: string, head: Uint8Array): FileKind | null {
  const lastStart = Math.min(head.length, 1024) - PDF_MAGIC.length;
  for (let i = 0; i <= lastStart; i++) if (startsAt(head, PDF_MAGIC, i)) return "pdf";
  if (startsAt(head, ZIP_MAGIC, 0) && name.toLowerCase().endsWith(".pptx")) return "pptx";
  return null;
}

export async function precheckFile(file: File): Promise<ErrorCode | null> {
  if (file.size > MAX_FILE_BYTES) return "too_big";
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  return detectFileKind(file.name, head) ? null : "bad_type";
}
