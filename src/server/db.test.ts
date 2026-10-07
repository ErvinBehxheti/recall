// src/server/db.test.ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openDb, transaction } from "./db";

const version = (db: ReturnType<typeof openDb>) => (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;

describe("openDb", () => {
  it("creates every table and records the schema version", () => {
    const db = openDb(":memory:");
    const names = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((r) => r.name);
    expect(names).toEqual(
      expect.arrayContaining(["users", "sessions", "classes", "enrollments", "lessons", "questions", "attempts", "reads"]),
    );
    expect(version(db)).toBe(1);
  });

  it("enforces foreign keys and cascades deletes", () => {
    const db = openDb(":memory:");
    db.prepare("INSERT INTO users (id, role, name, login, password_hash, created_at) VALUES (1, 'teacher', 'T', 't@x.co', 'h', 0)").run();
    db.prepare("INSERT INTO classes (id, teacher_id, subject, name, join_code, created_at) VALUES (1, 1, 'biology', '8A', 'AAAAAA', 0)").run();
    db.prepare("INSERT INTO lessons (class_id, title, cards, created_at) VALUES (1, 'L', '[]', 0)").run();
    expect(() => db.prepare("INSERT INTO classes (teacher_id, subject, name, join_code, created_at) VALUES (99, 'math', 'x', 'BBBBBB', 0)").run()).toThrow();
    db.prepare("DELETE FROM classes WHERE id = 1").run();
    expect((db.prepare("SELECT COUNT(*) AS n FROM lessons").get() as { n: number }).n).toBe(0);
  });

  it("rejects a subject outside the five", () => {
    const db = openDb(":memory:");
    db.prepare("INSERT INTO users (id, role, name, login, password_hash, created_at) VALUES (1, 'teacher', 'T', 't@x.co', 'h', 0)").run();
    expect(() => db.prepare("INSERT INTO classes (teacher_id, subject, name, join_code, created_at) VALUES (1, 'art', 'x', 'CCCCCC', 0)").run()).toThrow();
  });

  it("keeps data when a file database is opened twice", () => {
    const dir = mkdtempSync(join(tmpdir(), "slidekick-"));
    const file = join(dir, "nested", "test.db");
    try {
      const first = openDb(file);
      first.prepare("INSERT INTO users (role, name, login, password_hash, created_at) VALUES ('student', 'S', 's#1000', 'h', 0)").run();
      first.close();
      const second = openDb(file);
      expect((second.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n).toBe(1);
      expect(version(second)).toBe(1);
      second.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("transaction", () => {
  it("commits on success and rolls back when the callback throws", () => {
    const db = openDb(":memory:");
    const insert = () => db.prepare("INSERT INTO users (role, name, login, password_hash, created_at) VALUES ('student', 'S', ?, 'h', 0)");
    const count = () => (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
    transaction(db, () => insert().run("a#1000"));
    expect(count()).toBe(1);
    expect(() =>
      transaction(db, () => {
        insert().run("b#1000");
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(count()).toBe(1);
  });
});
