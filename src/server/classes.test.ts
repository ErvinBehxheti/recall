// src/server/classes.test.ts
import { describe, expect, it } from "vitest";
import { createStudent, createTeacher } from "./accounts";
import {
  createClass,
  getTeacherClass,
  joinClass,
  listClassStudents,
  listStudentSubjects,
  listTeacherClasses,
  normalizeCode,
} from "./classes";
import { openDb } from "./db";
import { AccessError, InputError } from "./errors";

async function world() {
  const db = openDb(":memory:");
  const teacher = await createTeacher(db, { name: "Ms Hoxha", email: "t@x.co", password: "password1" });
  const other = await createTeacher(db, { name: "Mr Berisha", email: "o@x.co", password: "password1" });
  const { user: mira } = await createStudent(db, { name: "Mira", password: "password1" });
  return { db, teacher, other, mira };
}

describe("createClass", () => {
  it("makes a class with a 6 character code from the safe alphabet", async () => {
    const { db, teacher } = await world();
    const cls = createClass(db, teacher, { subject: "biology", name: "  8A   Biology " });
    expect(cls.name).toBe("8A Biology");
    expect(cls.joinCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it("rejects a subject outside the five, a short name, and a student", async () => {
    const { db, teacher, mira } = await world();
    expect(() => createClass(db, teacher, { subject: "art", name: "8A" })).toThrow(InputError);
    expect(() => createClass(db, teacher, { subject: "math", name: "x" })).toThrow(InputError);
    expect(() => createClass(db, mira, { subject: "math", name: "8A Math" })).toThrow(AccessError);
  });

  it("tries another code when one is taken", async () => {
    const { db, teacher } = await world();
    let calls = 0;
    const pick = () => (calls++ < 12 ? 0 : 1);
    const a = createClass(db, teacher, { subject: "math", name: "7A Math" }, pick);
    const b = createClass(db, teacher, { subject: "math", name: "7B Math" }, pick);
    expect(a.joinCode).toBe("AAAAAA");
    expect(b.joinCode).toBe("BBBBBB");
  });
});

describe("joinClass", () => {
  it("accepts a code in any case with spaces or dashes, and joining twice is harmless", async () => {
    const { db, teacher, mira } = await world();
    const cls = createClass(db, teacher, { subject: "biology", name: "8A Biology" });
    const spaced = `${cls.joinCode.slice(0, 3)} - ${cls.joinCode.slice(3)}`.toLowerCase();
    expect(joinClass(db, mira, spaced).id).toBe(cls.id);
    expect(joinClass(db, mira, cls.joinCode).id).toBe(cls.id);
    expect(listClassStudents(db, teacher, cls.id)).toEqual([{ id: mira.id, name: "Mira" }]);
  });

  it("rejects an unknown code and a teacher", async () => {
    const { db, teacher, mira } = await world();
    expect(() => joinClass(db, mira, "ZZZZZZ")).toThrow("doesn't match a class");
    expect(() => joinClass(db, teacher, "ZZZZZZ")).toThrow(AccessError);
  });
});

describe("teacher views", () => {
  it("counts students and lessons, and hides other teachers' classes", async () => {
    const { db, teacher, other, mira } = await world();
    const cls = createClass(db, teacher, { subject: "biology", name: "8A Biology" });
    joinClass(db, mira, cls.joinCode);
    db.prepare("INSERT INTO lessons (class_id, title, cards, created_at) VALUES (?, 'L', '[]', 0)").run(cls.id);
    expect(listTeacherClasses(db, teacher)).toEqual([{ ...cls, studentCount: 1, lessonCount: 1 }]);
    expect(listTeacherClasses(db, other)).toEqual([]);
    expect(getTeacherClass(db, teacher, cls.id).id).toBe(cls.id);
    expect(() => getTeacherClass(db, other, cls.id)).toThrow(AccessError);
    expect(() => listClassStudents(db, other, cls.id)).toThrow(AccessError);
    expect(() => getTeacherClass(db, teacher, 999)).toThrow(AccessError);
  });
});

describe("listStudentSubjects", () => {
  it("always returns the five subjects, with the classes the student joined", async () => {
    const { db, teacher, mira } = await world();
    const bio = createClass(db, teacher, { subject: "biology", name: "8A Biology" });
    joinClass(db, mira, bio.joinCode);
    const subjects = listStudentSubjects(db, mira);
    expect(subjects.map((s) => s.subject)).toEqual(["biology", "chemistry", "math", "albanian", "english"]);
    expect(subjects[0].classes).toEqual([{ id: bio.id, name: "8A Biology" }]);
    expect(subjects[1].classes).toEqual([]);
  });
});

describe("normalizeCode", () => {
  it("uppercases and strips everything but letters and digits", () => {
    expect(normalizeCode(" ab-c 12 ")).toBe("ABC12");
  });
});
