// src/server/login-throttle.ts
import { createLimiter } from "./rate-limit";

/**
 * Two limits on failed logins.
 *
 * The first is per client address and login name: one person hammering one account is stopped, and a
 * class sharing one laptop only blocks the login being guessed. The address comes from x-forwarded-for,
 * which a client can set, so a guesser can rotate it to dodge that limit. The second limit therefore
 * ignores the address and caps failures per login name across everyone.
 */
export function createLoginThrottle(now?: () => number) {
  const perClient = createLimiter(5, 60_000, now);
  const perAccount = createLimiter(20, 10 * 60_000, now);
  const account = (login: string) => login.trim().toLowerCase();
  const client = (ip: string, login: string) => `${ip}|${account(login)}`;

  return {
    blocked: (ip: string, login: string) => perClient.blocked(client(ip, login)) || perAccount.blocked(account(login)),
    fail: (ip: string, login: string) => {
      perClient.fail(client(ip, login));
      perAccount.fail(account(login));
    },
    reset: (ip: string, login: string) => {
      perClient.reset(client(ip, login));
      perAccount.reset(account(login));
    },
  };
}
