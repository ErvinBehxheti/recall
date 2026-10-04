export function parsePageParam(raw: string | string[] | undefined, total: number): number | null {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= total ? n : null;
}
