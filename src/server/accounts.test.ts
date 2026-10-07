// src/server/accounts.test.ts
import { describe, expect, it } from "vitest";
import {
  authenticate,
  createSession,
  createStudent,
  createTeacher,
  deleteSession,
  getSessionUser,
} from "./accounts";
import { openDb } from "./db";
import { AccessError, InputError, parseId } from "./errors";
import { hashPassword, verifyPassword } from "./passwords";

const teacherInput = { name: "Ms Hoxha", email: "Ms.Hoxha@Example.com", password: "correct horse" };

describe("passwords", () => {
  it("hashes with a random salt and verifies", async () => {
    const a = await hashPassword("secret-pass");
    const b = await hashPassword("secret-pass");
    expect(a).not.toBe(b);
    expect(a).not.toContain("secret-pass");
    expect(await verifyPassword("secret-pass", a)).toBe(true);
    expect(await verifyPassword("wrong-pass", a)).toBe(false);
    expect(await verifyPassword("secret-pass", "garbage")).toBe(false);
  });
});

describe("createTeacher", () => {
  it("stores the email lowercased as the login and never the password", async () => {
    const db = openDb(":memory:");
    const user = await createTeacher(db, teacherInput);
    expect(user).toEqual({ id: expect.any(Number), role: "teacher", name: "Ms Hoxha" });
    const row = db.prepare("SELECT login, password_hash FROM users WHERE id = ?").get(user.id) as { login: string; password_hash: string };
    expect(row.login).toBe("ms.hoxha@example.com");
    expect(row.password_hash).not.toContain("correct horse");
  });

  it("rejects a duplicate email, a bad email, a short password and a short name", async () => {
    const db = openDb(":memory:");
    await createTeacher(db, teacherInput);
    await expect(createTeacher(db, { ...teacherInput, email: "MS.HOXHA@example.com" })).rejects.toThrow("already exists");
    await expect(createTeacher(db, { ...teacherInput, email: "nope" })).rejects.toBeInstanceOf(InputError);
    await expect(createTeacher(db, { ...teacherInput, email: "b@x.co", password: "short" })).rejects.toThrow("at least 8");
    await expect(createTeacher(db, { ...teacherInput, email: "c@x.co", name: "A" })).rejects.toBeInstanceOf(InputError);
  });
});

describe("createStudent", () => {
  it("gives two students with the same name different login names", async () => {
    const db = openDb(":memory:");
    const first = await createStudent(db, { name: "Mira", password: "password1" });
    const second = await createStudent(db, { name: "Mira", password: "password2" });
    expect(first.login).toMatch(/^Mira#\d{4}$/);
    expect(second.login).toMatch(/^Mira#\d{4}$/);
    expect(first.login).not.toBe(second.login);
    expect(first.user.id).not.toBe(second.user.id);
  });

  it("retries when the suffix is taken", async () => {
    const db = openDb(":memory:");
    const values = [4821, 4821, 1111];
    let i = 0;
    const random = () => values[i++];
    await createStudent(db, { name: "Mira", password: "password1" }, random);
    const second = await createStudent(db, { name: "Mira", password: "password1" }, random);
    expect(second.login).toBe("Mira#1111");
  });

  it("rejects a hash sign in the name and a short password", async () => {
    const db = openDb(":memory:");
    await expect(createStudent(db, { name: "Mi#ra", password: "password1" })).rejects.toBeInstanceOf(InputError);
    await expect(createStudent(db, { name: "Mira", password: "short" })).rejects.toBeInstanceOf(InputError);
  });
});

describe("authenticate", () => {
  it("accepts any letter case in the login and rejects wrong credentials", async () => {
    const db = openDb(":memory:");
    const { login, user } = await createStudent(db, { name: "Mira", password: "password1" });
    expect(await authenticate(db, login.toLowerCase(), "password1")).toEqual(user);
    expect(await authenticate(db, `  ${login.toUpperCase()} `, "password1")).toEqual(user);
    expect(await authenticate(db, login, "password2")).toBeNull();
    expect(await authenticate(db, "nobody#0000", "password1")).toBeNull();
    const teacher = await createTeacher(db, teacherInput);
    expect(await authenticate(db, "MS.HOXHA@example.com", "correct horse")).toEqual(teacher);
  });
});

describe("sessions", () => {
  it("round-trips a token, stores only its hash, and expires", async () => {
    const db = openDb(":memory:");
    const user = await createTeacher(db, teacherInput);
    const token = createSession(db, user.id, 1_000);
    const stored = (db.prepare("SELECT token_hash FROM sessions").all() as { token_hash: string }[]).map((r) => r.token_hash);
    expect(stored).toHaveLength(1);
    expect(stored[0]).not.toBe(token);
    expect(getSessionUser(db, token, 2_000)).toEqual(user);
    expect(getSessionUser(db, token, 1_000 + 14 * 86_400_000)).toBeNull();
    expect(getSessionUser(db, "not-a-token", 2_000)).toBeNull();
  });

  it("logout deletes the session, and creating one clears expired rows", async () => {
    const db = openDb(":memory:");
    const user = await createTeacher(db, teacherInput);
    const token = createSession(db, user.id, 1_000);
    deleteSession(db, token);
    expect(getSessionUser(db, token, 2_000)).toBeNull();
    createSession(db, user.id, 1_000);
    createSession(db, user.id, 1_000 + 15 * 86_400_000);
    expect((db.prepare("SELECT COUNT(*) AS n FROM sessions").get() as { n: number }).n).toBe(1);
  });
});

describe("parseId", () => {
  it("accepts positive integers and throws a 404 for anything else", () => {
    expect(parseId("12")).toBe(12);
    for (const bad of ["0", "-1", "1.5", "abc", ""]) {
      expect(() => parseId(bad)).toThrow(AccessError);
    }
    try {
      parseId("x");
    } catch (error) {
      expect((error as AccessError).status).toBe(404);
    }
  });
});
