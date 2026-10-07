// src/server/login-throttle.test.ts
import { describe, expect, it } from "vitest";
import { createLoginThrottle } from "./login-throttle";

describe("login throttle", () => {
  it("blocks one client after 5 wrong tries for a login, but not other clients or other logins", () => {
    const throttle = createLoginThrottle(() => 0);
    for (let i = 0; i < 5; i++) throttle.fail("10.0.0.1", "mira#1234");
    expect(throttle.blocked("10.0.0.1", "MIRA#1234 ")).toBe(true);
    expect(throttle.blocked("10.0.0.2", "mira#1234")).toBe(false);
    expect(throttle.blocked("10.0.0.1", "leon#4321")).toBe(false);
  });

  it("still blocks a guesser who changes the forwarded address on every try", () => {
    const throttle = createLoginThrottle(() => 0);
    for (let i = 0; i < 20; i++) {
      expect(throttle.blocked(`10.0.0.${i}`, "mira#1234")).toBe(false);
      throttle.fail(`10.0.0.${i}`, "mira#1234");
    }
    expect(throttle.blocked("10.9.9.9", "mira#1234")).toBe(true);
    expect(throttle.blocked("10.9.9.9", "leon#4321")).toBe(false);
  });

  it("frees an account after the window", () => {
    let now = 0;
    const throttle = createLoginThrottle(() => now);
    for (let i = 0; i < 20; i++) throttle.fail(`ip${i}`, "mira#1234");
    expect(throttle.blocked("ipX", "mira#1234")).toBe(true);
    now = 10 * 60_000 + 1;
    expect(throttle.blocked("ipX", "mira#1234")).toBe(false);
  });

  it("clears both counters when the real owner logs in", () => {
    const throttle = createLoginThrottle(() => 0);
    for (let i = 0; i < 19; i++) throttle.fail(`ip${i}`, "mira#1234");
    throttle.reset("ip0", "mira#1234");
    for (let i = 0; i < 19; i++) throttle.fail(`other${i}`, "mira#1234");
    expect(throttle.blocked("ipZ", "mira#1234")).toBe(false);
  });
});
