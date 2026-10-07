// src/server/guard.ts
import { notFound } from "next/navigation";
import { AccessError } from "./errors";

/** For pages: an id that is not yours or does not exist shows the 404 page. */
export function orNotFound<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof AccessError) notFound();
    throw error;
  }
}
