import type { ErrorCode } from "@/lib/errors";

export type UploadMode = "ai" | "demo";
export type UploadState =
  | { phase: "idle" }
  | { phase: "generating"; mode: UploadMode; fileName: string }
  | { phase: "error"; code: ErrorCode };
export type UploadEvent =
  | { type: "start"; mode: UploadMode; fileName: string }
  | { type: "fail"; code: ErrorCode }
  | { type: "reset" };

export function uploadReducer(state: UploadState, event: UploadEvent): UploadState {
  switch (event.type) {
    case "start":
      return state.phase === "generating" ? state : { phase: "generating", mode: event.mode, fileName: event.fileName };
    case "fail":
      return { phase: "error", code: event.code };
    case "reset":
      return { phase: "idle" };
  }
}
