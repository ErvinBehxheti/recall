// src/server/db.ts
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type Db = DatabaseSync;

/** Each entry is one migration. Append new ones; never edit an old one. PRAGMA user_version tracks progress. */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
    name TEXT NOT NULL,
    login TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE classes (
    id INTEGER PRIMARY KEY,
    teacher_id INTEGER NOT NULL REFERENCES users(id),
    subject TEXT NOT NULL CHECK (subject IN ('biology', 'chemistry', 'math', 'albanian', 'english')),
    name TEXT NOT NULL,
    join_code TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE enrollments (
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (class_id, student_id)
  );
  CREATE TABLE lessons (
    id INTEGER PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    slide_count INTEGER NOT NULL DEFAULT 0,
    cards TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at INTEGER NOT NULL,
    published_at INTEGER
  );
  CREATE TABLE questions (
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    qid TEXT NOT NULL,
    position INTEGER NOT NULL,
    question TEXT NOT NULL,
    options TEXT NOT NULL,
    correct_index INTEGER NOT NULL,
    explanation TEXT NOT NULL,
    card_id TEXT NOT NULL,
    PRIMARY KEY (lesson_id, qid)
  );
  CREATE TABLE attempts (
    id INTEGER PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_first INTEGER NOT NULL DEFAULT 0,
    question_ids TEXT NOT NULL,
    shuffles TEXT NOT NULL,
    answers TEXT NOT NULL DEFAULT '{}',
    score INTEGER,
    total INTEGER NOT NULL,
    started_at INTEGER NOT NULL,
    finished_at INTEGER
  );
  CREATE UNIQUE INDEX attempts_one_first ON attempts (lesson_id, student_id) WHERE is_first = 1;
  CREATE TABLE reads (
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at INTEGER NOT NULL,
    PRIMARY KEY (lesson_id, student_id)
  );
  `,
];

function migrate(db: Db): void {
  const { user_version } = db.prepare("PRAGMA user_version").get() as { user_version: number };
  for (let version = user_version; version < MIGRATIONS.length; version++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[version]);
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

export function openDb(path: string): Db {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  if (path !== ":memory:") db.exec("PRAGMA journal_mode = WAL");
  migrate(db);
  return db;
}

// Next dev reloads modules, so keep one connection on globalThis.
const holder = globalThis as unknown as { __slidekickDb?: Db };

export function getDb(): Db {
  holder.__slidekickDb ??= openDb(process.env.SLIDEKICK_DB ?? "data/slidekick.db");
  return holder.__slidekickDb;
}

export function transaction<T>(db: Db, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
