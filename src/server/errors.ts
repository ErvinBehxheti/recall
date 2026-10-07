// src/server/errors.ts
/** The user did something fixable. The message is safe to show. */
export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

/** Not logged in (401), wrong role (403), or not found or not yours (404). */
export class AccessError extends Error {
  readonly status: 401 | 403 | 404;
  constructor(status: 401 | 403 | 404 = 404) {
    super(status === 404 ? "Not found" : "Not allowed");
    this.name = "AccessError";
    this.status = status;
  }
}

export function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AccessError(404);
  return id;
}
