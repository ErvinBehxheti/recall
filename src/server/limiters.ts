// src/server/limiters.ts
import { createLimiter } from "./rate-limit";

const holder = globalThis as unknown as { __slidekickLimiters?: { login: ReturnType<typeof createLimiter>; join: ReturnType<typeof createLimiter> } };
holder.__slidekickLimiters ??= { login: createLimiter(5, 60_000), join: createLimiter(5, 60_000) };

/** Keyed by IP and login name, so one mistyped login on a shared laptop cannot lock out a class. */
export const loginLimiter = holder.__slidekickLimiters.login;
/** Keyed by student id. */
export const joinLimiter = holder.__slidekickLimiters.join;
