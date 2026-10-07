// src/server/rate-limit.ts
export function createLimiter(max: number, windowMs: number, now: () => number = Date.now) {
  const failures = new Map<string, number[]>();

  const recent = (key: string): number[] => {
    const cutoff = now() - windowMs;
    const kept = (failures.get(key) ?? []).filter((at) => at > cutoff);
    if (kept.length) failures.set(key, kept);
    else failures.delete(key);
    return kept;
  };

  return {
    blocked: (key: string) => recent(key).length >= max,
    fail: (key: string) => {
      failures.set(key, [...recent(key), now()]);
    },
    reset: (key: string) => {
      failures.delete(key);
    },
  };
}
