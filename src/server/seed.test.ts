// src/server/seed.test.ts
import { describe, expect, it } from "vitest";
import { authenticate } from "./accounts";
import { openDb } from "./db";
import { getLessonResults } from "./results";
import { DEMO_STUDENT_PASSWORD, DEMO_TEACHER, seedDemo } from "./seed";

describe("seedDemo", () => {
  it("builds a class with 12 students, a published lesson and realistic first attempts", async () => {
    const db = openDb(":memory:");
    const result = await seedDemo(db);
    if (result === "exists") throw new Error("expected a fresh database");
    expect(result.students).toHaveLength(12);
    expect(result.classCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    const teacher = await authenticate(db, DEMO_TEACHER.email, DEMO_TEACHER.password);
    expect(teacher?.role).toBe("teacher");
    const student = await authenticate(db, result.students[0].login, DEMO_STUDENT_PASSWORD);
    expect(student?.role).toBe("student");

    const { enrolled, report } = getLessonResults(db, teacher!, result.lessonId);
    expect(enrolled).toBe(12);
    expect(report?.finished).toBe(10);
    expect(report?.rows.map((r) => r.status)).toEqual(
      expect.arrayContaining(["finished", "in-progress", "not-started"]),
    );
    expect(report!.weakest.percent).toBeLessThan(60);
  });

  it("does nothing the second time", async () => {
    const db = openDb(":memory:");
    await seedDemo(db);
    expect(await seedDemo(db)).toBe("exists");
    expect((db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'teacher'").get() as { n: number }).n).toBe(1);
  });
});
