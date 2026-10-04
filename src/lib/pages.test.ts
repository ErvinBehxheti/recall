import { describe, expect, it } from "vitest";
import { parsePageParam } from "./pages";

describe("parsePageParam (Review Focus 3)", () => {
  it("accepts whole numbers in range", () => {
    expect(parsePageParam("1", 8)).toBe(1);
    expect(parsePageParam("8", 8)).toBe(8);
  });
  it("rejects everything else", () => {
    for (const raw of ["0", "9", "-1", "2.5", "abc", "", undefined, ["1", "2"]]) {
      expect(parsePageParam(raw as string | string[] | undefined, 8)).toBeNull();
    }
  });
});
