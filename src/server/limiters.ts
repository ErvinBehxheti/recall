// src/server/limiters.ts
import { createLoginThrottle } from "./login-throttle";
import { createLimiter } from "./rate-limit";

type Throttles = { login: ReturnType<typeof createLoginThrottle>; join: ReturnType<typeof createLimiter> };
const holder = globalThis as unknown as { __slidekickThrottles?: Throttles };
holder.__slidekickThrottles ??= { login: createLoginThrottle(), join: createLimiter(5, 60_000) };

/** Failed logins, limited per client and login name and also per login name alone. */
export const loginThrottle = holder.__slidekickThrottles.login;
/** Keyed by student id. */
export const joinLimiter = holder.__slidekickThrottles.join;
