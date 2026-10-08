# Slidekick v2: accounts, subjects and private quizzes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teachers publish AI-drafted, teacher-edited lessons to a class; students join by code, read the lesson, take a server-graded private quiz; teachers see real results.

**Architecture:** One SQLite file (`node:sqlite`) behind `src/server/db.ts`. Domain modules in `src/server/*` take the database as their first argument and enforce role and ownership themselves, so they are unit-tested against `:memory:` databases. Next 16 glue is thin: a cookie-presence `proxy.ts`, a data-access layer (`src/server/auth.ts`), server actions for form posts (signup, login, class create and join), and route handlers for JSON (upload, lesson edit, quiz). Existing presentational components and the zod lesson schema are reused.

**Tech Stack:** Next.js 16.3.8 (App Router), React 19, TypeScript, Tailwind 4, zod 4, `node:sqlite`, `node:crypto` (scrypt), Vitest 5, Playwright. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-06-slidekick-v2-design.md`

## Global Constraints

- Node 24 or newer. Database is `node:sqlite` only. No hosted services and no new npm dependencies.
- Work on a new branch `feat/v2-accounts` created from `feat/mvp-app`. Commit after every task. End every commit message with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (second `-m`).
- Five fixed subjects: Biology, Chemistry, Math, Albanian, English. Stored as a TypeScript union and a CHECK constraint.
- Passwords: `scrypt` from `node:crypto`, random salt per user, minimum 8 characters.
- Session: random 32-byte token in an `httpOnly`, `sameSite=lax` cookie named `session`; only its SHA-256 hash is stored; 14-day expiry; logout deletes the row.
- Next 16 conventions (read from `node_modules/next/dist/docs/` as AGENTS.md requires): `cookies()` and `headers()` are async; route handler `params` and page `params`/`searchParams` are Promises; `proxy.ts` replaces `middleware.ts`, runs on Node, does cookie-presence checks only and never reads the database; the real check is `verifySession()` in the data access layer.
- Every server action, route handler and page that reads data calls `verifySession()`, `requireUser(role)` or `getApiUser(role)` first. Ownership checks live in the domain modules.
- Student-facing responses never contain a correct answer or an explanation before that student has answered the question.
- First completed attempt per student per lesson is the only one the teacher sees. Later attempts and retries are practice.
- Published lessons are read-only. A lesson can be unpublished only while it has no attempts.
- Server code (`src/server`, `src/lib`) uses relative imports so `tsx` scripts and Vitest resolve them; app code (`src/app`, `src/app-components`, `src/components`) uses the `@/` alias. Client components import server types only with `import type`.
- Design rules (project memory, apply to every new screen and string): no em dashes, no emojis, no Lucide icons, no pure white backgrounds, no drop shadows, no card grids, no tabs for two or three options, one primary action per screen, tables of at most four columns, skeleton loaders instead of spinners, no hover animations. Use the existing tokens (`paper`, `ink`, `ink-soft`, `rule`, `highlight`, `correct`, `incorrect`), Literata for headings (`font-serif`) and the existing `Button` and `buttonClass`.
- UI language is English. Copy stays plain and direct.
- `node:sqlite` returns untyped rows. Cast them with `as` to a row type; if TypeScript rejects a cast, go through `unknown`. Rows are plain objects, so `toEqual` works on them in tests.
- `npm test` (Vitest) must pass at the end of every task, and `npm run lint`, `npx tsc --noEmit` at the end of every slice. Playwright (`npm run test:e2e`) must pass at the end of every slice; stop any running `npm run dev` first because Next 16 allows one dev server per project.

## Review Focus

1. A student calling the quiz or lesson APIs directly for a lesson that is unpublished, belongs to a class they have not joined, or an attempt that belongs to someone else must get "not found", never data (Task 11, Task 12).
2. Two students with the same name must both sign up and log in, with different login names, and a login typed in a different letter case must work (Task 2).
3. Reloading mid-quiz or double-clicking an answer must resume the same attempt with the same shuffle and must not change an answered question or the score (Task 12).
4. A teacher saving a half-finished lesson, publishing an invalid one, editing a published one, or unpublishing one students already took must get a plain message and no data loss (Task 8).
5. A class with no students, a lesson nobody has finished, and a page with no questions must render a clear empty state, never NaN or a crash (Task 14).

## File Structure

Create:
- `src/server/db.ts`: open database, migrations, `getDb()`, `transaction()`.
- `src/server/errors.ts`: `InputError`, `AccessError`, `parseId`.
- `src/server/passwords.ts`: scrypt hash and verify.
- `src/server/accounts.ts`: users, login, sessions, `SessionUser`, `Role`.
- `src/server/session-cookie.ts`: cookie name and lifetime constants (no imports, safe for `proxy.ts`).
- `src/server/rate-limit.ts`, `src/server/limiters.ts`: in-memory limiter and the two instances.
- `src/server/auth.ts`: data access layer (`verifySession`, `requireUser`, `startSession`, `endSession`, `clientIp`).
- `src/server/api.ts`: `getApiUser`, `jsonError` for route handlers.
- `src/server/classes.ts`: classes, join codes, enrollment.
- `src/server/lessons.ts`: persisted lessons, edits, publish.
- `src/server/student.ts`: what a student may open, subject progress, read marks.
- `src/server/quiz.ts`: private quiz attempts and server-side grading.
- `src/server/results.ts`: teacher results and attention lines.
- `src/server/generate-deps.ts`: shared AI dependencies, with a fake-AI test seam.
- `src/server/seed.ts`: demo data.
- `src/proxy.ts`: optimistic redirect to `/login`.
- `src/lib/roles.ts`, `src/lib/subjects.ts`, `src/lib/form-state.ts`, `src/lib/language.ts`, `src/lib/lesson-edit.ts`, `src/lib/quiz-types.ts`, `src/lib/class-report.ts`, `src/lib/random.ts`.
- `src/app/actions/auth.ts`, `src/app/actions/classes.ts`.
- `src/app-components/`: `ActionForm`, `AppHeader`, `PageShell`, `ClassUpload`, `LessonEditor`, `UnpublishButton`, `LessonReader`, `QuizRunner`, `ScoreCounter`, `ResultsView`, `HomeScreen`.
- Pages under `src/app/`: `login`, `signup` (+ `teacher`, `student`, `welcome`), `join`, `teacher` (+ `classes/new`, `classes/[id]`, `lessons/[id]`, `lessons/[id]/results`), `learn` (+ `[subject]`, `lessons/[id]`, `lessons/[id]/pages/[n]`, `lessons/[id]/quiz`, `lessons/[id]/results`).
- Route handlers under `src/app/api/`: `teacher/classes/[classId]/lessons`, `teacher/lessons/[id]` (PUT, DELETE), `teacher/lessons/[id]/status`, `learn/lessons/[id]/attempts`, `learn/lessons/[id]/read`, `learn/attempts/[id]/answers`.
- `scripts/seed.mts`, `e2e/global-setup.ts`, `e2e/helpers.ts`, `e2e/accounts.spec.ts`, `e2e/classes.spec.ts`, `e2e/classroom.spec.ts`.

Modify: `.gitignore`, `.env.example`, `package.json`, `playwright.config.ts`, `README.md`, `src/lib/errors.ts`, `src/lib/validate-lesson.ts`, `src/lib/lesson-prompt.ts`, `src/lib/speech.ts`, `src/app-components/ReadAloudButton.tsx`, `src/app-components/UploadScreen.tsx`, `src/app-components/ResultsScreen.tsx`, `src/components/MasteryBars.tsx`, `src/app/api/generate/route.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, the v2 spec.

Remove (Task 17): the MVP routes `lesson`, `quiz`, `results`, `sample-teacher`, `api/generate`; the screens and libs that only they used.

---

# Slice 1: database, auth, roles

### Task 1: Database module

**Files:**
- Create: `src/server/db.ts`
- Test: `src/server/db.test.ts`
- Modify: `.gitignore`, `docs/superpowers/specs/2026-10-06-slidekick-v2-design.md`

**Interfaces:**
- Produces: `type Db = DatabaseSync`; `openDb(path: string): Db` (runs migrations, foreign keys on); `getDb(): Db` (singleton, path `process.env.SLIDEKICK_DB ?? "data/slidekick.db"`); `transaction<T>(db: Db, fn: () => T): T`.

- [ ] **Step 0: Create the branch**

```bash
git checkout -b feat/v2-accounts
```

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/server/db.test.ts`
Expected: FAIL, "Failed to resolve import ./db".

- [ ] **Step 3: Write the implementation**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/server/db.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Ignore the data folder and bring the spec in line with the schema**

Append to `.gitignore`:

```
# local database
/data/
```

In `docs/superpowers/specs/2026-10-06-slidekick-v2-design.md` make these exact replacements:

1. Row `| users | id, role, name, email (unique, null for students), password_hash, created_at |` becomes `| users | id, role, name, login (unique and lowercase: the teacher's email or the student's "name#1234"), password_hash, created_at |`.
2. Row `| questions | id, lesson_id, position, question, options (JSON, 4 strings), correct_index, explanation, card_id |` becomes `| questions | lesson_id, qid, position, question, options (JSON, 4 strings), correct_index, explanation, card_id (primary key is lesson_id and qid) |`.
3. Row `| attempts | id, lesson_id, student_id, is_first (boolean), score, total, answers (JSON), finished_at |` becomes `| attempts | id, lesson_id, student_id, is_first (boolean), question_ids (JSON, shown order), shuffles (JSON, per question), answers (JSON), score, total, started_at, finished_at |`, followed by a new row `| reads | lesson_id, student_id, read_at |`.
4. The bullet starting `- Rate limiting:` becomes `- Rate limiting: failed logins are limited per IP and login name, and wrong join codes per student account (5 failures per minute, in memory), so one mistyped login on a shared laptop cannot lock out a class. Join codes are 6 characters from an alphabet without look-alike letters.`
5. In section 7 add the bullet `- A published lesson is read-only. To edit it the teacher unpublishes it, which is allowed only while no student has an attempt on it.`
6. In section 10 the first bullet becomes `- The generation prompt is changed to write the lesson in the language of the slides. \`lessons.language\` is \`sq\` or \`en\`, detected from the generated text, so the strict AI output schema does not change.`

- [ ] **Step 6: Commit**

```bash
git add .gitignore src/server/db.ts src/server/db.test.ts docs/superpowers/specs/2026-10-06-slidekick-v2-design.md
git commit -m "feat: SQLite database module with migrations" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Passwords, accounts and sessions

**Files:**
- Create: `src/server/errors.ts`, `src/server/passwords.ts`, `src/server/session-cookie.ts`, `src/server/accounts.ts`
- Test: `src/server/accounts.test.ts`

**Interfaces:**
- Consumes: `Db`, `openDb` from `./db`.
- Produces:
  - `class InputError(message)`; `class AccessError(status: 401 | 403 | 404 = 404)` with `.status`; `parseId(value: string): number` (throws `AccessError(404)` unless a positive integer).
  - `hashPassword(password): Promise<string>`, `verifyPassword(password, stored): Promise<boolean>`, `MIN_PASSWORD = 8`.
  - `SESSION_COOKIE = "session"`, `SESSION_DAYS = 14`.
  - `type Role = "teacher" | "student"`; `type SessionUser = { id: number; role: Role; name: string }`.
  - `createTeacher(db, { name, email, password }): Promise<SessionUser>`; `createStudent(db, { name, password }, random?: () => number): Promise<{ user: SessionUser; login: string }>`; `authenticate(db, login, password): Promise<SessionUser | null>`; `createSession(db, userId, now?): string`; `getSessionUser(db, token, now?): SessionUser | null`; `deleteSession(db, token): void`.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/server/accounts.test.ts`
Expected: FAIL, cannot resolve `./accounts`.

- [ ] **Step 3: Write the implementation**

```ts
// src/server/errors.ts
/** The user did something fixable. The message is safe to show. */
export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

/** Not logged in (401), wrong role (403), or not found or not yours (404). */
export class AccessError extends Error {
  readonly status: 401 | 403 | 404;
  constructor(status: 401 | 403 | 404 = 404) {
    super(status === 404 ? "Not found" : "Not allowed");
    this.name = "AccessError";
    this.status = status;
  }
}

export function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AccessError(404);
  return id;
}
```

```ts
// src/server/passwords.ts
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

export const MIN_PASSWORD = 8;

const scrypt = (password: string, salt: Buffer, length: number) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCallback(password, salt, length, (error, key) => (error ? reject(error) : resolve(key))),
  );

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
```

```ts
// src/server/session-cookie.ts
// No imports: proxy.ts reads this file and must not pull in the database.
export const SESSION_COOKIE = "session";
export const SESSION_DAYS = 14;
```

```ts
// src/server/accounts.ts
import { createHash, randomBytes, randomInt } from "node:crypto";
import type { Db } from "./db";
import { InputError } from "./errors";
import { hashPassword, MIN_PASSWORD, verifyPassword } from "./passwords";
import { SESSION_DAYS } from "./session-cookie";

export type Role = "teacher" | "student";
export type SessionUser = { id: number; role: Role; name: string };

const DAY_MS = 86_400_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UserRow = { id: number; role: Role; name: string; password_hash: string };

function cleanName(raw: string, max: number): string {
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > max) throw new InputError(`Enter a name between 2 and ${max} characters.`);
  return name;
}

function checkPassword(password: string): void {
  if (password.length < MIN_PASSWORD) throw new InputError(`Use at least ${MIN_PASSWORD} characters for the password.`);
}

const isUniqueError = (error: unknown) => error instanceof Error && /UNIQUE constraint failed/.test(error.message);

function insertUser(db: Db, role: Role, name: string, login: string, hash: string): SessionUser {
  const result = db
    .prepare("INSERT INTO users (role, name, login, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(role, name, login, hash, Date.now());
  return { id: Number(result.lastInsertRowid), role, name };
}

export async function createTeacher(db: Db, input: { name: string; email: string; password: string }): Promise<SessionUser> {
  const name = cleanName(input.name, 60);
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) throw new InputError("Enter a valid email address.");
  checkPassword(input.password);
  const hash = await hashPassword(input.password);
  try {
    return insertUser(db, "teacher", name, email, hash);
  } catch (error) {
    if (isUniqueError(error)) throw new InputError("An account with that email already exists.");
    throw error;
  }
}

/** The login name is the name plus a 4-digit number, so two students called Mira never clash. */
export async function createStudent(
  db: Db,
  input: { name: string; password: string },
  random: () => number = () => randomInt(1000, 10000),
): Promise<{ user: SessionUser; login: string }> {
  const name = cleanName(input.name, 40);
  if (name.includes("#")) throw new InputError("Leave the # out of your name. We add a number for you.");
  checkPassword(input.password);
  const hash = await hashPassword(input.password);
  for (let tries = 0; tries < 50; tries++) {
    const login = `${name}#${random()}`;
    try {
      return { user: insertUser(db, "student", name, login.toLowerCase(), hash), login };
    } catch (error) {
      if (!isUniqueError(error)) throw error;
    }
  }
  throw new InputError("We couldn't make a login name. Try a different name.");
}

let dummyHash: Promise<string> | undefined;

export async function authenticate(db: Db, login: string, password: string): Promise<SessionUser | null> {
  const row = db.prepare("SELECT id, role, name, password_hash FROM users WHERE login = ?").get(login.trim().toLowerCase()) as
    | UserRow
    | undefined;
  if (!row) {
    // Spend the same time as a real check so a missing account is not detectable by speed.
    await verifyPassword(password, await (dummyHash ??= hashPassword("not-a-real-password")));
    return null;
  }
  if (!(await verifyPassword(password, row.password_hash))) return null;
  return { id: row.id, role: row.role, name: row.name };
}

const sha256 = (token: string) => createHash("sha256").update(token).digest("hex");

export function createSession(db: Db, userId: number, now: number = Date.now()): string {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
  const token = randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
    sha256(token),
    userId,
    now + SESSION_DAYS * DAY_MS,
  );
  return token;
}

export function getSessionUser(db: Db, token: string, now: number = Date.now()): SessionUser | null {
  const row = db
    .prepare("SELECT u.id, u.role, u.name, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?")
    .get(sha256(token)) as { id: number; role: Role; name: string; expires_at: number } | undefined;
  if (!row || row.expires_at <= now) return null;
  return { id: row.id, role: row.role, name: row.name };
}

export function deleteSession(db: Db, token: string): void {
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/server/accounts.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/errors.ts src/server/passwords.ts src/server/session-cookie.ts src/server/accounts.ts src/server/accounts.test.ts
git commit -m "feat: accounts, scrypt passwords and hashed sessions" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Rate limiter

**Files:**
- Create: `src/server/rate-limit.ts`, `src/server/limiters.ts`
- Test: `src/server/rate-limit.test.ts`

**Interfaces:**
- Produces: `createLimiter(max: number, windowMs: number, now?: () => number): { blocked(key: string): boolean; fail(key: string): void; reset(key: string): void }`; `loginLimiter`, `joinLimiter` (each 5 failures per 60 s).

- [ ] **Step 1: Write the failing test**

```ts
// src/server/rate-limit.test.ts
import { describe, expect, it } from "vitest";
import { createLimiter } from "./rate-limit";

describe("createLimiter", () => {
  it("blocks a key after max failures inside the window and frees it afterwards", () => {
    let now = 0;
    const limiter = createLimiter(3, 60_000, () => now);
    for (let i = 0; i < 3; i++) {
      expect(limiter.blocked("a")).toBe(false);
      limiter.fail("a");
    }
    expect(limiter.blocked("a")).toBe(true);
    expect(limiter.blocked("b")).toBe(false);
    now = 60_001;
    expect(limiter.blocked("a")).toBe(false);
  });

  it("reset clears a key", () => {
    const limiter = createLimiter(1, 60_000, () => 0);
    limiter.fail("a");
    expect(limiter.blocked("a")).toBe(true);
    limiter.reset("a");
    expect(limiter.blocked("a")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/server/rate-limit.test.ts`
Expected: FAIL, cannot resolve `./rate-limit`.

- [ ] **Step 3: Write the implementation**

```ts
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
```

```ts
// src/server/limiters.ts
import { createLimiter } from "./rate-limit";

const holder = globalThis as unknown as { __slidekickLimiters?: { login: ReturnType<typeof createLimiter>; join: ReturnType<typeof createLimiter> } };
holder.__slidekickLimiters ??= { login: createLimiter(5, 60_000), join: createLimiter(5, 60_000) };

/** Keyed by IP and login name, so one mistyped login on a shared laptop cannot lock out a class. */
export const loginLimiter = holder.__slidekickLimiters.login;
/** Keyed by student id. */
export const joinLimiter = holder.__slidekickLimiters.join;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/server/rate-limit.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/rate-limit.ts src/server/limiters.ts src/server/rate-limit.test.ts
git commit -m "feat: in-memory failure limiter for login and join code" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Next integration: proxy, data access layer, login and signup screens

**Files:**
- Create: `src/lib/roles.ts`, `src/lib/form-state.ts`, `src/server/auth.ts`, `src/server/api.ts`, `src/proxy.ts`, `src/app/actions/auth.ts`, `src/app-components/ActionForm.tsx`, `src/app-components/AppHeader.tsx`, `src/app-components/PageShell.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/signup/teacher/page.tsx`, `src/app/signup/student/page.tsx`, `src/app/signup/welcome/page.tsx`, `src/app/teacher/page.tsx` (placeholder), `src/app/learn/page.tsx` (placeholder), `e2e/global-setup.ts`, `e2e/helpers.ts`, `e2e/accounts.spec.ts`
- Move: `src/app/teacher` (the MVP fake dashboard) to `src/app/sample-teacher`
- Modify: `src/lib/errors.ts`, `src/app/api/generate/route.ts`, `src/app-components/ResultsScreen.tsx`, `src/app-components/TeacherScreen.tsx`, `src/app-components/UploadScreen.tsx`, `playwright.config.ts`, `.env.example`

**Interfaces:**
- Consumes: everything from Tasks 1 to 3.
- Produces:
  - `homeFor(role: Role): "/teacher" | "/learn"`; `type FormState = { error?: string } | undefined`.
  - `verifySession(): Promise<SessionUser | null>` (React `cache`); `requireUser(role): Promise<SessionUser>` (redirects); `startSession(userId): Promise<void>`; `endSession(): Promise<void>`; `clientIp(): Promise<string>`.
  - `getApiUser(role): Promise<SessionUser>` (throws `AccessError`); `jsonError(error): Response`.
  - Server actions `signupTeacher`, `signupStudent`, `login`, `logout`.
  - `<ActionForm action fields submit />`; `<PageShell user? width?>`, `<PageTitle>`, `<SectionTitle id?>`; `<AppHeader user />`.
  - Error code `unauthorized` (401) in `src/lib/errors.ts`.

- [ ] **Step 1: Move the MVP dashboard out of the protected path**

```bash
git mv src/app/teacher src/app/sample-teacher
```

In `src/app-components/ResultsScreen.tsx` change `href="/teacher"` to `href="/sample-teacher"`. (`TeacherScreen.tsx` links back to `/results`; leave it.)

- [ ] **Step 2: Add the `unauthorized` error code**

In `src/lib/errors.ts`: add `"unauthorized",` to `ERROR_CODES` (after `"refused"`), add `unauthorized: "Log in as a teacher to upload slides.",` to `ERROR_MESSAGES` and `unauthorized: 401,` to `ERROR_STATUS`.

Replace `src/app/api/generate/route.ts` with:

```ts
import { makeCreateMessage } from "@/lib/anthropic-client";
import { ERROR_MESSAGES, ERROR_STATUS } from "@/lib/errors";
import { generateLesson, parseEffort } from "@/lib/generate-lesson";
import { handleGenerate } from "@/lib/handle-generate";
import { verifySession } from "@/server/auth";

export const runtime = "nodejs";
export const maxDuration = 150;

export async function POST(request: Request) {
  const user = await verifySession();
  if (user?.role !== "teacher") {
    return Response.json(
      { error: { code: "unauthorized", message: ERROR_MESSAGES.unauthorized } },
      { status: ERROR_STATUS.unauthorized },
    );
  }
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const effort = parseEffort(process.env.LESSON_EFFORT);
  return handleGenerate(request, {
    hasKey: apiKey.length > 0,
    generate: (source) => generateLesson(source, { createMessage: makeCreateMessage(apiKey), effort }),
  });
}
```

- [ ] **Step 3: Shared small modules**

```ts
// src/lib/roles.ts
import type { Role } from "../server/accounts";

export const homeFor = (role: Role): "/teacher" | "/learn" => (role === "teacher" ? "/teacher" : "/learn");
```

```ts
// src/lib/form-state.ts
export type FormState = { error?: string } | undefined;
```

```ts
// src/server/auth.ts
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { homeFor } from "../lib/roles";
import { createSession, deleteSession, getSessionUser, type Role, type SessionUser } from "./accounts";
import { getDb } from "./db";
import { SESSION_COOKIE, SESSION_DAYS } from "./session-cookie";

/** The real session check. proxy.ts only looks for the cookie; this reads the database. */
export const verifySession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getSessionUser(getDb(), token) : null;
});

/** For pages and server actions: sends the visitor to the right place instead of throwing. */
export async function requireUser(role: Role): Promise<SessionUser> {
  const user = await verifySession();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(homeFor(user.role));
  return user;
}

export async function startSession(userId: number): Promise<void> {
  const token = createSession(getDb(), userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Not marked secure: the app is served over plain http on a laptop or the school network.
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(getDb(), token);
  store.delete(SESSION_COOKIE);
}

export async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}
```

```ts
// src/server/api.ts
import type { Role, SessionUser } from "./accounts";
import { verifySession } from "./auth";
import { AccessError, InputError } from "./errors";

/** For route handlers: throws instead of redirecting. */
export async function getApiUser(role: Role): Promise<SessionUser> {
  const user = await verifySession();
  if (!user) throw new AccessError(401);
  if (user.role !== role) throw new AccessError(403);
  return user;
}

export function jsonError(error: unknown): Response {
  if (error instanceof AccessError) return Response.json({ error: { message: error.message } }, { status: error.status });
  if (error instanceof InputError) return Response.json({ error: { message: error.message } }, { status: 400 });
  console.error("Unexpected API error:", error);
  return Response.json({ error: { message: "Something went wrong. Try again." } }, { status: 500 });
}
```

```ts
// src/proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./server/session-cookie";

// Optimistic check only: is there a session cookie at all. Pages and handlers verify it for real.
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/teacher/:path*", "/learn/:path*", "/join"] };
```

- [ ] **Step 4: Server actions for accounts**

```ts
// src/app/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/lib/form-state";
import { homeFor } from "@/lib/roles";
import { authenticate, createStudent, createTeacher, type SessionUser } from "@/server/accounts";
import { clientIp, endSession, startSession } from "@/server/auth";
import { getDb } from "@/server/db";
import { InputError } from "@/server/errors";
import { loginLimiter } from "@/server/limiters";

const field = (data: FormData, name: string) => String(data.get(name) ?? "");

export async function signupTeacher(_state: FormState, formData: FormData): Promise<FormState> {
  let user: SessionUser;
  try {
    user = await createTeacher(getDb(), {
      name: field(formData, "name"),
      email: field(formData, "email"),
      password: field(formData, "password"),
    });
  } catch (error) {
    if (error instanceof InputError) return { error: error.message };
    throw error;
  }
  await startSession(user.id);
  redirect("/teacher");
}

export async function signupStudent(_state: FormState, formData: FormData): Promise<FormState> {
  let created: { user: SessionUser; login: string };
  try {
    created = await createStudent(getDb(), { name: field(formData, "name"), password: field(formData, "password") });
  } catch (error) {
    if (error instanceof InputError) return { error: error.message };
    throw error;
  }
  await startSession(created.user.id);
  redirect(`/signup/welcome?login=${encodeURIComponent(created.login)}`);
}

export async function login(_state: FormState, formData: FormData): Promise<FormState> {
  const loginName = field(formData, "login").trim();
  const key = `${await clientIp()}|${loginName.toLowerCase()}`;
  if (loginLimiter.blocked(key)) return { error: "Too many tries. Wait a minute and try again." };
  const user = await authenticate(getDb(), loginName, field(formData, "password"));
  if (!user) {
    loginLimiter.fail(key);
    return { error: "That login name or password is wrong." };
  }
  loginLimiter.reset(key);
  await startSession(user.id);
  redirect(homeFor(user.role));
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}
```

- [ ] **Step 5: Shared UI**

```tsx
// src/app-components/ActionForm.tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/Button";
import type { FormState } from "@/lib/form-state";

export type FormField = {
  name: string;
  label: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  hint?: string;
  options?: { value: string; label: string }[];
};

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  fields: FormField[];
  submit: string;
};

const CONTROL = "rounded-[4px] border border-rule bg-sheet px-4 py-3 text-[1.0625rem]";

export function ActionForm({ action, fields, submit }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="mt-8 grid max-w-md gap-5">
      {fields.map((f) => (
        <div key={f.name} className="grid gap-1.5">
          <label htmlFor={f.name} className="text-[1.0625rem] font-semibold">
            {f.label}
          </label>
          {f.options ? (
            <select id={f.name} name={f.name} required className={CONTROL}>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input id={f.name} name={f.name} type={f.type ?? "text"} autoComplete={f.autoComplete} required className={CONTROL} />
          )}
          {f.hint && <p className="text-[0.9375rem] text-ink-soft">{f.hint}</p>}
        </div>
      ))}
      {state?.error && (
        <p role="alert" className="text-incorrect">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "One moment" : submit}
        </Button>
      </div>
    </form>
  );
}
```

```tsx
// src/app-components/AppHeader.tsx
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/Button";
import { Wordmark } from "@/components/Wordmark";
import { homeFor } from "@/lib/roles";
import type { SessionUser } from "@/server/accounts";

export function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-5 py-5 sm:px-8">
      <Link href={homeFor(user.role)} className="rounded-[2px]">
        <Wordmark />
      </Link>
      <div className="flex items-center gap-5">
        <span className="text-ink-soft">{user.name}</span>
        <form action={logout}>
          <Button variant="quiet" type="submit">
            Log out
          </Button>
        </form>
      </div>
    </header>
  );
}
```

```tsx
// src/app-components/PageShell.tsx
import Link from "next/link";
import { buttonClass } from "@/components/Button";
import type { SessionUser } from "@/server/accounts";
import { AppHeader } from "./AppHeader";
import { SiteHeader } from "./SiteHeader";

type Props = {
  user?: SessionUser | null;
  width?: "max-w-2xl" | "max-w-4xl" | "max-w-6xl";
  children: React.ReactNode;
};

export function PageShell({ user, width = "max-w-6xl", children }: Props) {
  return (
    <div className="flex min-h-dvh flex-col">
      {user ? (
        <AppHeader user={user} />
      ) : (
        <SiteHeader
          right={
            <Link href="/login" className={buttonClass("quiet")}>
              Log in
            </Link>
          }
        />
      )}
      <main className={`mx-auto w-full ${width} flex-1 px-5 pb-16 pt-10 sm:px-8 sm:pt-14`}>{children}</main>
    </div>
  );
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-serif text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.02em]">{children}</h1>
  );
}

export function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="font-serif text-[1.5rem] font-semibold">
      {children}
    </h2>
  );
}
```

- [ ] **Step 6: Auth pages and placeholder homes**

```tsx
// src/app/login/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { ActionForm } from "@/app-components/ActionForm";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { buttonClass } from "@/components/Button";
import { homeFor } from "@/lib/roles";
import { verifySession } from "@/server/auth";

export default async function LoginPage() {
  const user = await verifySession();
  if (user) redirect(homeFor(user.role));
  return (
    <PageShell width="max-w-2xl">
      <PageTitle>Log in</PageTitle>
      <ActionForm
        action={login}
        submit="Log in"
        fields={[
          { name: "login", label: "Email or login name", autoComplete: "username", hint: "Students: your name with the number, like Mira#4821." },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />
      <p className="mt-8 text-ink-soft">
        New here?{" "}
        <Link href="/signup" className={buttonClass("quiet")}>
          Create an account
        </Link>
      </p>
    </PageShell>
  );
}
```

```tsx
// src/app/signup/page.tsx
import Link from "next/link";
import { PageShell, PageTitle } from "@/app-components/PageShell";

const ROLES = [
  { href: "/signup/teacher", title: "I am a teacher", note: "Upload slides and see how your class does." },
  { href: "/signup/student", title: "I am a student", note: "Join your class with a code from your teacher." },
];

export default function SignupPage() {
  return (
    <PageShell width="max-w-2xl">
      <PageTitle>Create an account</PageTitle>
      <ul className="mt-8 grid gap-1">
        {ROLES.map((role) => (
          <li key={role.href}>
            <Link href={role.href} className="block rounded-[4px] px-4 py-4 hover:bg-paper-raised">
              <span className="block font-serif text-[1.375rem] font-semibold">{role.title}</span>
              <span className="text-ink-soft">{role.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
```

```tsx
// src/app/signup/teacher/page.tsx
import { signupTeacher } from "@/app/actions/auth";
import { ActionForm } from "@/app-components/ActionForm";
import { PageShell, PageTitle } from "@/app-components/PageShell";

export default function TeacherSignupPage() {
  return (
    <PageShell width="max-w-2xl">
      <PageTitle>Teacher account</PageTitle>
      <ActionForm
        action={signupTeacher}
        submit="Create account"
        fields={[
          { name: "name", label: "Name", autoComplete: "name" },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters." },
        ]}
      />
    </PageShell>
  );
}
```

```tsx
// src/app/signup/student/page.tsx
import { signupStudent } from "@/app/actions/auth";
import { ActionForm } from "@/app-components/ActionForm";
import { PageShell, PageTitle } from "@/app-components/PageShell";

export default function StudentSignupPage() {
  return (
    <PageShell width="max-w-2xl">
      <PageTitle>Student account</PageTitle>
      <ActionForm
        action={signupStudent}
        submit="Create account"
        fields={[
          { name: "name", label: "Your first name", autoComplete: "given-name", hint: "We add a number to it to make your login name." },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters." },
        ]}
      />
    </PageShell>
  );
}
```

```tsx
// src/app/signup/welcome/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { buttonClass } from "@/components/Button";
import { verifySession } from "@/server/auth";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ login?: string }> }) {
  const [user, { login }] = await Promise.all([verifySession(), searchParams]);
  if (!user || !login) redirect("/signup");
  return (
    <PageShell user={user} width="max-w-2xl">
      <PageTitle>Welcome, {user.name}</PageTitle>
      <p className="mt-8 text-ink-soft">Your login name is</p>
      <p data-testid="login-name" className="mt-1 font-serif text-[clamp(2.5rem,7vw,4rem)] font-semibold tracking-[-0.01em]">
        {login}
      </p>
      <p className="mt-4 max-w-[48ch] text-[1.125rem]">Write it down. You need it with your password every time you log in.</p>
      <Link href="/join" className={buttonClass("primary", "mt-9")}>
        Enter a class code
      </Link>
    </PageShell>
  );
}
```

```tsx
// src/app/teacher/page.tsx  (placeholder, replaced in Task 6)
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { requireUser } from "@/server/auth";

export default async function TeacherHome() {
  const user = await requireUser("teacher");
  return (
    <PageShell user={user}>
      <PageTitle>Hello, {user.name}</PageTitle>
    </PageShell>
  );
}
```

```tsx
// src/app/learn/page.tsx  (placeholder, replaced in Task 6)
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { requireUser } from "@/server/auth";

export default async function LearnHome() {
  const user = await requireUser("student");
  return (
    <PageShell user={user}>
      <PageTitle>Hello, {user.name}</PageTitle>
    </PageShell>
  );
}
```

In `src/app-components/UploadScreen.tsx`: add `import Link from "next/link";`, change the `@/components/Button` import to `import { Button, buttonClass } from "@/components/Button";`, and change `<SiteHeader />` to:

```tsx
<SiteHeader
  right={
    <Link href="/login" className={buttonClass("quiet")}>
      Log in
    </Link>
  }
/>
```

- [ ] **Step 7: End-to-end config, helpers and the first spec**

Replace `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  workers: 1,
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    // A fresh server with its own database and the fake AI, so tests never touch real data or spend API credit.
    reuseExistingServer: false,
    env: { SLIDEKICK_DB: "data/e2e.db", SLIDEKICK_FAKE_AI: "1" },
    timeout: 120_000,
  },
});
```

```ts
// e2e/global-setup.ts
import { rmSync } from "node:fs";

export default function globalSetup() {
  for (const suffix of ["", "-wal", "-shm"]) rmSync(`data/e2e.db${suffix}`, { force: true });
}
```

```ts
// e2e/helpers.ts
import { expect, type Page } from "@playwright/test";

export const PASSWORD = "classroom-1";

const unique = () => `${Date.now()}${Math.floor(Math.random() * 10_000)}`;

export async function signupTeacher(page: Page, name = "Ms Hoxha") {
  const email = `teacher${unique()}@example.com`;
  await page.goto("/signup/teacher");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/teacher$/);
  return { email, name };
}

export async function signupStudent(page: Page, name = "Mira") {
  await page.goto("/signup/student");
  await page.getByLabel("Your first name").fill(name);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/signup\/welcome/);
  const login = (await page.getByTestId("login-name").textContent())!.trim();
  return { login, name };
}

export async function login(page: Page, loginName: string) {
  await page.goto("/login");
  await page.getByLabel("Email or login name").fill(loginName);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}
```

```ts
// e2e/accounts.spec.ts
import { expect, test } from "@playwright/test";
import { login, logout, signupStudent, signupTeacher } from "./helpers";

test("anonymous visitors are sent to the login page", async ({ page }) => {
  for (const path of ["/teacher", "/learn", "/join"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("a teacher signs up, logs out, logs back in and cannot open the student area", async ({ page }) => {
  const { email, name } = await signupTeacher(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Hello, ${name}`);
  await page.goto("/learn");
  await expect(page).toHaveURL(/\/teacher$/);
  await logout(page);
  await login(page, email.toUpperCase());
  await expect(page).toHaveURL(/\/teacher$/);
});

test("two students with the same name get different login names and both can log in", async ({ page, browser }) => {
  const first = await signupStudent(page, "Mira");
  const other = await (await browser.newContext()).newPage();
  const second = await signupStudent(other, "Mira");
  expect(first.login).not.toBe(second.login);

  await logout(page);
  await login(page, first.login.toLowerCase());
  await expect(page).toHaveURL(/\/learn$/);
  await logout(page);
  await login(page, second.login);
  await expect(page).toHaveURL(/\/learn$/);
});

test("a wrong password shows a plain error and stays on the login page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email or login name").fill("nobody@example.com");
  await page.getByLabel("Password").fill("wrong-password-1");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert")).toHaveText("That login name or password is wrong.");
  await expect(page).toHaveURL(/\/login$/);
});
```

Append to `.env.example`:

```
# Where the school data lives (default: data/slidekick.db)
# SLIDEKICK_DB=data/slidekick.db
```

- [ ] **Step 8: Verify**

Run each and expect success:
- `npx tsc --noEmit`
- `npm test` (all unit tests pass, including the 84 existing ones)
- `npm run lint`
- `npm run build` (this also proves `node:sqlite` bundles for the server. If the bundler reports that it cannot resolve `node:sqlite`, load it in `src/server/db.ts` with `const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite")` and keep `import type { DatabaseSync } from "node:sqlite"` for the types.)
- `npm run test:e2e` (stop any running dev server first). The MVP spec `demo-flow.spec.ts` still passes because the demo path does not touch accounts; it needs only the port change, and `baseURL` already follows `E2E_PORT`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: login, signup, session proxy and data access layer" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```


---

# Slice 2: subjects, classes, join codes

### Task 5: Subjects and classes

**Files:**
- Create: `src/lib/subjects.ts`, `src/server/classes.ts`
- Test: `src/lib/subjects.test.ts`, `src/server/classes.test.ts`

**Interfaces:**
- Consumes: `Db`, `SessionUser`, `AccessError`, `InputError`.
- Produces:
  - `SUBJECTS` (tuple of the five lowercase ids in display order), `type Subject`, `SUBJECT_LABELS: Record<Subject, string>`, `isSubject(value: unknown): value is Subject`.
  - `type ClassRow = { id; teacherId; subject: Subject; name; joinCode }`; `type ClassSummary = ClassRow & { studentCount: number; lessonCount: number }`.
  - `newJoinCode(pick?)`, `normalizeCode(raw)`, `createClass(db, teacher, { subject, name }, pick?): ClassRow`, `joinClass(db, student, rawCode): ClassRow`, `listTeacherClasses(db, teacher): ClassSummary[]`, `getTeacherClass(db, teacher, classId): ClassRow` (throws `AccessError(404)` if not theirs), `listClassStudents(db, teacher, classId): { id: number; name: string }[]`, `listStudentSubjects(db, student): { subject: Subject; classes: { id: number; name: string }[] }[]` (always all five).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/subjects.test.ts
import { describe, expect, it } from "vitest";
import { isSubject, SUBJECT_LABELS, SUBJECTS } from "./subjects";

describe("subjects", () => {
  it("lists the five subjects in display order with labels", () => {
    expect(SUBJECTS.map((s) => SUBJECT_LABELS[s])).toEqual(["Biology", "Chemistry", "Math", "Albanian", "English"]);
  });
  it("recognises only the five ids", () => {
    expect(isSubject("math")).toBe(true);
    expect(isSubject("Math")).toBe(false);
    expect(isSubject("art")).toBe(false);
    expect(isSubject(3)).toBe(false);
  });
});
```

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/subjects.test.ts src/server/classes.test.ts`
Expected: FAIL, cannot resolve `./subjects` and `./classes`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/subjects.ts
export const SUBJECTS = ["biology", "chemistry", "math", "albanian", "english"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_LABELS: Record<Subject, string> = {
  biology: "Biology",
  chemistry: "Chemistry",
  math: "Math",
  albanian: "Albanian",
  english: "English",
};

export const isSubject = (value: unknown): value is Subject =>
  typeof value === "string" && (SUBJECTS as readonly string[]).includes(value);
```

```ts
// src/server/classes.ts
import { randomInt } from "node:crypto";
import { isSubject, SUBJECTS, type Subject } from "../lib/subjects";
import type { SessionUser } from "./accounts";
import type { Db } from "./db";
import { AccessError, InputError } from "./errors";

export type ClassRow = { id: number; teacherId: number; subject: Subject; name: string; joinCode: string };
export type ClassSummary = ClassRow & { studentCount: number; lessonCount: number };

type RawClass = { id: number; teacher_id: number; subject: Subject; name: string; join_code: string };
const toClass = (r: RawClass): ClassRow => ({ id: r.id, teacherId: r.teacher_id, subject: r.subject, name: r.name, joinCode: r.join_code });

// No I, O, 0 or 1, so a code read aloud or copied by hand is hard to get wrong.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newJoinCode(pick: (max: number) => number = (max) => randomInt(max)): string {
  return Array.from({ length: 6 }, () => ALPHABET[pick(ALPHABET.length)]).join("");
}

export const normalizeCode = (raw: string): string => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

export function createClass(
  db: Db,
  teacher: SessionUser,
  input: { subject: string; name: string },
  pick?: (max: number) => number,
): ClassRow {
  if (teacher.role !== "teacher") throw new AccessError(403);
  if (!isSubject(input.subject)) throw new InputError("Choose one of the five subjects.");
  const name = input.name.replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 60) throw new InputError("Give the class a name between 2 and 60 characters.");
  for (let tries = 0; tries < 20; tries++) {
    const joinCode = newJoinCode(pick);
    try {
      const result = db
        .prepare("INSERT INTO classes (teacher_id, subject, name, join_code, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(teacher.id, input.subject, name, joinCode, Date.now());
      return { id: Number(result.lastInsertRowid), teacherId: teacher.id, subject: input.subject, name, joinCode };
    } catch (error) {
      if (!(error instanceof Error && /UNIQUE constraint failed/.test(error.message))) throw error;
    }
  }
  throw new InputError("We couldn't make a class code. Try again.");
}

export function joinClass(db: Db, student: SessionUser, rawCode: string): ClassRow {
  if (student.role !== "student") throw new AccessError(403);
  const row = db.prepare("SELECT * FROM classes WHERE join_code = ?").get(normalizeCode(rawCode)) as RawClass | undefined;
  if (!row) throw new InputError("That code doesn't match a class. Check it with your teacher.");
  db.prepare("INSERT OR IGNORE INTO enrollments (class_id, student_id, joined_at) VALUES (?, ?, ?)").run(row.id, student.id, Date.now());
  return toClass(row);
}

export function listTeacherClasses(db: Db, teacher: SessionUser): ClassSummary[] {
  const rows = db
    .prepare(
      `SELECT c.*,
         (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) AS student_count,
         (SELECT COUNT(*) FROM lessons l WHERE l.class_id = c.id) AS lesson_count
       FROM classes c WHERE c.teacher_id = ? ORDER BY c.created_at, c.id`,
    )
    .all(teacher.id) as (RawClass & { student_count: number; lesson_count: number })[];
  return rows.map((r) => ({ ...toClass(r), studentCount: r.student_count, lessonCount: r.lesson_count }));
}

export function getTeacherClass(db: Db, teacher: SessionUser, classId: number): ClassRow {
  const row = db.prepare("SELECT * FROM classes WHERE id = ? AND teacher_id = ?").get(classId, teacher.id) as RawClass | undefined;
  if (!row || teacher.role !== "teacher") throw new AccessError(404);
  return toClass(row);
}

export function listClassStudents(db: Db, teacher: SessionUser, classId: number): { id: number; name: string }[] {
  getTeacherClass(db, teacher, classId);
  return db
    .prepare("SELECT u.id, u.name FROM enrollments e JOIN users u ON u.id = e.student_id WHERE e.class_id = ? ORDER BY u.name, u.id")
    .all(classId) as { id: number; name: string }[];
}

export function listStudentSubjects(
  db: Db,
  student: SessionUser,
): { subject: Subject; classes: { id: number; name: string }[] }[] {
  const rows = db
    .prepare("SELECT c.id, c.name, c.subject FROM enrollments e JOIN classes c ON c.id = e.class_id WHERE e.student_id = ? ORDER BY c.name, c.id")
    .all(student.id) as { id: number; name: string; subject: Subject }[];
  return SUBJECTS.map((subject) => ({
    subject,
    classes: rows.filter((r) => r.subject === subject).map((r) => ({ id: r.id, name: r.name })),
  }));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/subjects.test.ts src/server/classes.test.ts`
Expected: PASS (2 + 9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/subjects.ts src/lib/subjects.test.ts src/server/classes.ts src/server/classes.test.ts
git commit -m "feat: subjects, classes and join codes" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Class screens for both roles

**Files:**
- Create: `src/server/guard.ts`, `src/app/actions/classes.ts`, `src/app/teacher/classes/new/page.tsx`, `src/app/teacher/classes/[id]/page.tsx`, `src/app/learn/[subject]/page.tsx`, `src/app/join/page.tsx`, `e2e/classes.spec.ts`
- Modify: `src/app/teacher/page.tsx`, `src/app/learn/page.tsx`, `e2e/helpers.ts`

**Interfaces:**
- Consumes: Tasks 4 and 5.
- Produces: `orNotFound<T>(fn: () => T): T` (turns `AccessError` into Next `notFound()`); server actions `createClassAction`, `joinClassAction`; Playwright helpers `createClass(page, subject?, name?)` and `joinClass(page, code)`.

- [ ] **Step 1: Guard and actions**

```ts
// src/server/guard.ts
import { notFound } from "next/navigation";
import { AccessError } from "./errors";

/** For pages: an id that is not yours or does not exist shows the 404 page. */
export function orNotFound<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof AccessError) notFound();
    throw error;
  }
}
```

```ts
// src/app/actions/classes.ts
"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/lib/form-state";
import { requireUser } from "@/server/auth";
import { createClass, joinClass, type ClassRow } from "@/server/classes";
import { getDb } from "@/server/db";
import { InputError } from "@/server/errors";
import { joinLimiter } from "@/server/limiters";

const field = (data: FormData, name: string) => String(data.get(name) ?? "");

export async function createClassAction(_state: FormState, formData: FormData): Promise<FormState> {
  const teacher = await requireUser("teacher");
  let created: ClassRow;
  try {
    created = createClass(getDb(), teacher, { subject: field(formData, "subject"), name: field(formData, "name") });
  } catch (error) {
    if (error instanceof InputError) return { error: error.message };
    throw error;
  }
  redirect(`/teacher/classes/${created.id}`);
}

export async function joinClassAction(_state: FormState, formData: FormData): Promise<FormState> {
  const student = await requireUser("student");
  const key = String(student.id);
  if (joinLimiter.blocked(key)) return { error: "Too many wrong codes. Wait a minute and try again." };
  let joined: ClassRow;
  try {
    joined = joinClass(getDb(), student, field(formData, "code"));
  } catch (error) {
    if (error instanceof InputError) {
      joinLimiter.fail(key);
      return { error: error.message };
    }
    throw error;
  }
  joinLimiter.reset(key);
  redirect(`/learn/${joined.subject}`);
}
```

- [ ] **Step 2: Teacher screens**

```tsx
// src/app/teacher/page.tsx  (replaces the placeholder; attention lines arrive in Task 15)
import Link from "next/link";
import { PageShell, PageTitle, SectionTitle } from "@/app-components/PageShell";
import { buttonClass } from "@/components/Button";
import { SUBJECT_LABELS, SUBJECTS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";
import { listTeacherClasses } from "@/server/classes";
import { getDb } from "@/server/db";

export default async function TeacherHome() {
  const user = await requireUser("teacher");
  const classes = listTeacherClasses(getDb(), user);
  return (
    <PageShell user={user}>
      <PageTitle>Your classes</PageTitle>
      <Link href="/teacher/classes/new" className={buttonClass("primary", "mt-8")}>
        Create class
      </Link>
      {SUBJECTS.map((subject) => {
        const mine = classes.filter((c) => c.subject === subject);
        return (
          <section key={subject} aria-labelledby={`subject-${subject}`} className="mt-12 max-w-3xl">
            <SectionTitle id={`subject-${subject}`}>{SUBJECT_LABELS[subject]}</SectionTitle>
            {mine.length === 0 ? (
              <p className="mt-2 text-ink-soft">No class yet.</p>
            ) : (
              <ul className="mt-3 grid gap-1">
                {mine.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/teacher/classes/${c.id}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 rounded-[4px] px-4 py-3 hover:bg-paper-raised"
                    >
                      <span className="text-[1.125rem] font-semibold">{c.name}</span>
                      <span className="text-ink-soft">
                        {c.studentCount} {c.studentCount === 1 ? "student" : "students"}, {c.lessonCount}{" "}
                        {c.lessonCount === 1 ? "lesson" : "lessons"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </PageShell>
  );
}
```

```tsx
// src/app/teacher/classes/new/page.tsx
import { createClassAction } from "@/app/actions/classes";
import { ActionForm } from "@/app-components/ActionForm";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { SUBJECT_LABELS, SUBJECTS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";

export default async function NewClassPage() {
  const user = await requireUser("teacher");
  return (
    <PageShell user={user} width="max-w-2xl">
      <PageTitle>New class</PageTitle>
      <ActionForm
        action={createClassAction}
        submit="Create class"
        fields={[
          { name: "subject", label: "Subject", options: SUBJECTS.map((s) => ({ value: s, label: SUBJECT_LABELS[s] })) },
          { name: "name", label: "Class name", hint: "For example 8A Biology." },
        ]}
      />
    </PageShell>
  );
}
```

```tsx
// src/app/teacher/classes/[id]/page.tsx  (lessons are added in Task 9)
import { PageShell, PageTitle, SectionTitle } from "@/app-components/PageShell";
import { SUBJECT_LABELS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";
import { getTeacherClass, listClassStudents } from "@/server/classes";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { orNotFound } from "@/server/guard";

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("teacher");
  const { id } = await params;
  const cls = orNotFound(() => getTeacherClass(getDb(), user, parseId(id)));
  const students = listClassStudents(getDb(), user, cls.id);
  return (
    <PageShell user={user}>
      <p className="text-ink-soft">{SUBJECT_LABELS[cls.subject]}</p>
      <PageTitle>{cls.name}</PageTitle>

      <section aria-labelledby="code-title" className="mt-10">
        <h2 id="code-title" className="text-ink-soft">
          Class code
        </h2>
        <p data-testid="join-code" className="mt-1 font-serif text-[clamp(2.5rem,7vw,4rem)] font-semibold tracking-[0.12em]">
          {cls.joinCode}
        </p>
        <p className="mt-2 max-w-[48ch] text-ink-soft">Students enter this code after they sign up.</p>
      </section>

      <section aria-labelledby="students-title" className="mt-14 max-w-3xl">
        <SectionTitle id="students-title">
          {students.length} {students.length === 1 ? "student" : "students"}
        </SectionTitle>
        {students.length > 0 && (
          <ul className="mt-3 grid gap-1 text-[1.0625rem]">
            {students.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
```

- [ ] **Step 3: Student screens**

```tsx
// src/app/learn/page.tsx  (replaces the placeholder; progress arrives in Task 12)
import Link from "next/link";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { buttonClass } from "@/components/Button";
import { SUBJECT_LABELS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";
import { listStudentSubjects } from "@/server/classes";
import { getDb } from "@/server/db";

export default async function LearnHome() {
  const user = await requireUser("student");
  const subjects = listStudentSubjects(getDb(), user);
  return (
    <PageShell user={user} width="max-w-4xl">
      <PageTitle>Your subjects</PageTitle>
      <ul className="mt-10 grid gap-1">
        {subjects.map(({ subject, classes }) => (
          <li key={subject}>
            <Link
              href={`/learn/${subject}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 rounded-[4px] px-4 py-4 hover:bg-paper-raised"
            >
              <span className="font-serif text-[1.5rem] font-semibold">{SUBJECT_LABELS[subject]}</span>
              <span className="text-ink-soft">{classes.length ? classes.map((c) => c.name).join(", ") : "Enter a class code"}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/join" className={buttonClass("quiet", "mt-8")}>
        Join another class
      </Link>
    </PageShell>
  );
}
```

```tsx
// src/app/learn/[subject]/page.tsx  (lessons arrive in Task 12)
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { buttonClass } from "@/components/Button";
import { isSubject, SUBJECT_LABELS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";
import { listStudentSubjects } from "@/server/classes";
import { getDb } from "@/server/db";

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const user = await requireUser("student");
  const { subject } = await params;
  if (!isSubject(subject)) notFound();
  const mine = listStudentSubjects(getDb(), user).find((s) => s.subject === subject)!;
  return (
    <PageShell user={user} width="max-w-4xl">
      <PageTitle>{SUBJECT_LABELS[subject]}</PageTitle>
      {mine.classes.length === 0 ? (
        <>
          <p className="mt-6 max-w-[48ch] text-[1.125rem]">You have not joined a {SUBJECT_LABELS[subject]} class yet.</p>
          <Link href="/join" className={buttonClass("primary", "mt-8")}>
            Enter a class code
          </Link>
        </>
      ) : (
        <p className="mt-4 text-ink-soft">{mine.classes.map((c) => c.name).join(", ")}</p>
      )}
    </PageShell>
  );
}
```

```tsx
// src/app/join/page.tsx
import { joinClassAction } from "@/app/actions/classes";
import { ActionForm } from "@/app-components/ActionForm";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { requireUser } from "@/server/auth";

export default async function JoinPage() {
  const user = await requireUser("student");
  return (
    <PageShell user={user} width="max-w-2xl">
      <PageTitle>Join a class</PageTitle>
      <ActionForm
        action={joinClassAction}
        submit="Join class"
        fields={[{ name: "code", label: "Class code", hint: "Six letters and numbers from your teacher." }]}
      />
    </PageShell>
  );
}
```

- [ ] **Step 4: End-to-end test and helpers**

Append to `e2e/helpers.ts`:

```ts
export async function createClass(page: Page, subject = "biology", name = "8A Biology") {
  await page.goto("/teacher/classes/new");
  await page.getByLabel("Subject").selectOption(subject);
  await page.getByLabel("Class name").fill(name);
  await page.getByRole("button", { name: "Create class" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  const code = (await page.getByTestId("join-code").textContent())!.trim();
  return { code, url: page.url() };
}

export async function joinClass(page: Page, code: string) {
  await page.goto("/join");
  await page.getByLabel("Class code").fill(code);
  await page.getByRole("button", { name: "Join class" }).click();
}
```

```ts
// e2e/classes.spec.ts
import { expect, test } from "@playwright/test";
import { createClass, joinClass, signupStudent, signupTeacher } from "./helpers";

test("a teacher creates a Biology class and a student joins it with the code", async ({ page, browser }) => {
  await signupTeacher(page);
  const { code, url } = await createClass(page, "biology", "8A Biology");
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

  const student = await (await browser.newContext()).newPage();
  await signupStudent(student, "Mira");
  await joinClass(student, "NOPE22");
  await expect(student.getByRole("alert")).toContainText("doesn't match a class");
  await joinClass(student, code.toLowerCase());
  await expect(student).toHaveURL(/\/learn\/biology$/);
  await expect(student.getByRole("heading", { level: 1 })).toHaveText("Biology");

  await student.goto("/learn");
  await expect(student.getByRole("link", { name: /Chemistry/ })).toContainText("Enter a class code");
  await expect(student.getByRole("link", { name: /Biology/ })).toContainText("8A Biology");

  await page.goto(url);
  await expect(page.getByText("1 student")).toBeVisible();
  await expect(page.getByText("Mira")).toBeVisible();
});

test("a teacher cannot open another teacher's class", async ({ page, browser }) => {
  await signupTeacher(page, "Ms One");
  const { url } = await createClass(page);
  const other = await (await browser.newContext()).newPage();
  await signupTeacher(other, "Ms Two");
  const response = await other.goto(url);
  expect(response?.status()).toBe(404);
});
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run test:e2e`.
Expected: all pass (the `demo-flow` spec still passes; the sample dashboard now lives at `/sample-teacher`).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: class screens for teachers and students" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

# Slice 3: persisted lessons, editor, publish

### Task 7: Lesson language

**Files:**
- Create: `src/lib/language.ts`, `src/lib/lesson-prompt.test.ts`
- Test: `src/lib/language.test.ts`
- Modify: `src/lib/lesson-prompt.ts`, `src/lib/speech.ts`, `src/lib/speech.test.ts`, `src/app-components/ReadAloudButton.tsx`

**Interfaces:**
- Produces: `detectLanguage(text: string): "sq" | "en"`; `lessonText(lesson: Lesson): string`; `pickVoice(voices, lang = "en")`; `voiceAvailable(lang: string): boolean`; `speak(text, onEnd, lang = "en")`; `<ReadAloudButton text lang? />`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/language.test.ts
import { describe, expect, it } from "vitest";
import { detectLanguage, lessonText } from "./language";
import { sanitizeText } from "./sanitize";
import { makeLesson } from "./test-fixtures";

describe("detectLanguage", () => {
  it("recognises Albanian prose", () => {
    const text =
      "Fotosinteza është procesi me të cilin bimët e kthejnë dritën e diellit në energji. Ajo ndodh në gjethe dhe kërkon ujë dhe dioksid karboni.";
    expect(detectLanguage(text)).toBe("sq");
  });

  it("treats English, empty and symbol-only text as English", () => {
    expect(detectLanguage("Photosynthesis is the process plants use to turn sunlight into energy.")).toBe("en");
    expect(detectLanguage("")).toBe("en");
    expect(detectLanguage("12 + 34 = 46")).toBe("en");
  });

  it("builds lesson text from the title and the page explanations", () => {
    const text = lessonText(makeLesson({ title: "Cells" }));
    expect(text).toContain("Cells");
    expect(text).toContain("This is the explanation for topic 1.");
  });

  it("keeps Albanian letters when text is sanitized", () => {
    expect(sanitizeText("Çfarë është një ëndërr?")).toBe("Çfarë është një ëndërr?");
  });
});
```

```ts
// src/lib/lesson-prompt.test.ts
import { describe, expect, it } from "vitest";
import { LESSON_SYSTEM_PROMPT } from "./lesson-prompt";

describe("LESSON_SYSTEM_PROMPT", () => {
  it("asks for the lesson in the language of the slides", () => {
    expect(LESSON_SYSTEM_PROMPT).toContain("same language as the slides");
  });
});
```

Append to `src/lib/speech.test.ts` (keep its existing imports; add `pickVoice` to the import list if it is missing):

```ts
describe("pickVoice by language", () => {
  const voices = [
    { name: "Daniel", lang: "en-GB" },
    { name: "Ardita", lang: "sq-AL" },
  ];
  it("picks a voice that matches the language, or none", () => {
    expect(pickVoice(voices)).toBe(0);
    expect(pickVoice(voices, "sq")).toBe(1);
    expect(pickVoice(voices, "fr")).toBe(-1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/language.test.ts src/lib/lesson-prompt.test.ts src/lib/speech.test.ts`
Expected: FAIL (`./language` missing, prompt text missing, `pickVoice` ignores the language argument).

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/language.ts
import type { Lesson } from "./lesson-schema";

// Common Albanian function words. Short words that are also English ("me", "do", "si") are left out.
const ALBANIAN_WORDS = new Set([
  "dhe", "është", "një", "për", "që", "nga", "të", "në", "ose", "kjo", "janë", "mund", "kur", "nuk",
  "edhe", "por", "ajo", "tek", "së", "nëse", "pasi", "gjatë", "midis", "mes", "ky", "çfarë", "shumë",
  "vetëm", "ndër", "pas", "gjithashtu",
]);

/** Albanian or English is all the app needs to decide (read-aloud voices, the lang attribute). */
export function detectLanguage(text: string): "sq" | "en" {
  const words = text.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  if (words.length === 0) return "en";
  const hits = words.filter((w) => ALBANIAN_WORDS.has(w)).length;
  return hits / words.length >= 0.08 ? "sq" : "en";
}

export function lessonText(lesson: Lesson): string {
  return [lesson.title, ...lesson.cards.map((c) => c.explanation)].join(" ");
}
```

In `src/lib/lesson-prompt.ts`, add this bullet directly after the line starting `- Stay faithful to the slides.`:

```
- Write the whole lesson, quiz and explanations in the same language as the slides. Albanian slides give an Albanian lesson. Keep the ids exactly as described below.
```

In `src/lib/speech.ts` replace `pickVoice` and `speak`, and add `voiceAvailable`:

```ts
export function pickVoice(voices: Pick<SpeechSynthesisVoice, "name" | "lang">[], lang = "en"): number {
  const matching = voices.map((v, i) => ({ v, i })).filter(({ v }) => v.lang.toLowerCase().startsWith(lang));
  return (matching.find(({ v }) => PREFERRED.test(v.name)) ?? matching[0])?.i ?? -1;
}

/** English keeps the old behavior. Other languages need an installed voice, so the button hides without one. */
export function voiceAvailable(lang: string): boolean {
  if (!canSpeak()) return false;
  if (lang === "en") return true;
  return pickVoice(window.speechSynthesis.getVoices(), lang) >= 0;
}

const LANG_TAG: Record<string, string> = { en: "en-US", sq: "sq-AL" };

export function speak(text: string, onEnd: () => void, lang = "en"): void {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const index = pickVoice(voices, lang);
  if (index >= 0) utterance.voice = voices[index];
  utterance.lang = LANG_TAG[lang] ?? lang;
  utterance.rate = 0.95;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  synth.speak(utterance);
}
```

Replace `src/app-components/ReadAloudButton.tsx` with:

```tsx
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/Button";
import { SpeakerIcon, StopIcon } from "@/components/Icons";
import { canSpeak, speak, stopSpeaking, voiceAvailable } from "@/lib/speech";

// Browsers load voices late, so listen for them to appear.
function subscribeVoices(onChange: () => void) {
  if (!canSpeak()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}

/** Reads `text` with the browser's voice. Hidden where there is no voice for `lang`; stops when it unmounts. */
export function ReadAloudButton({ text, lang = "en" }: { text: string; lang?: string }) {
  const supported = useSyncExternalStore(subscribeVoices, () => voiceAvailable(lang), () => false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => stopSpeaking(), []);

  if (!supported) return null;

  function toggle() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      speak(text, () => setSpeaking(false), lang);
    }
  }

  return (
    <Button variant="quiet" onClick={toggle}>
      {speaking ? <StopIcon /> : <SpeakerIcon />}
      {speaking ? "Stop reading" : "Read aloud"}
    </Button>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (everything, including the new tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/language.ts src/lib/language.test.ts src/lib/lesson-prompt.ts src/lib/lesson-prompt.test.ts src/lib/speech.ts src/lib/speech.test.ts src/app-components/ReadAloudButton.tsx
git commit -m "feat: lessons follow the slide language, read-aloud follows the lesson" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Persisted lessons

**Files:**
- Create: `src/server/lessons.ts`
- Test: `src/server/lessons.test.ts`
- Modify: `src/lib/validate-lesson.ts` (export `sanitizeLesson`)

**Interfaces:**
- Consumes: `Db`, `transaction`, `SessionUser`, `getTeacherClass`, `AccessError`, `InputError`, `LessonSchema`, `LIMITS`, `validateLesson`, `detectLanguage`, `lessonText`, `SUBJECT_LABELS`.
- Produces:
  - `type LessonStatus = "draft" | "published"`; `type StoredLesson = { id; classId; className; subject: Subject; teacherId; status; language; slideCount; lesson: Lesson }` (`lesson.subject` is the class subject's label).
  - `loadLesson(db, lessonId): StoredLesson | null` (no access check; students go through `student.ts`).
  - `getTeacherLesson(db, teacher, lessonId): StoredLesson` (throws `AccessError(404)` unless theirs).
  - `saveDraftLesson(db, teacher, classId, lesson, slideCount): number`; `saveEdits(db, teacher, lessonId, input: unknown): void`; `publishLesson(db, teacher, lessonId): void`; `unpublishLesson(db, teacher, lessonId): void`; `deleteLesson(db, teacher, lessonId): void`.
  - `type LessonSummary = { id; title; status; pageCount; questionCount }`; `listClassLessons(db, teacher, classId): LessonSummary[]`.

- [ ] **Step 1: Export the sanitizer**

In `src/lib/validate-lesson.ts` change `function sanitizeLesson(` to `export function sanitizeLesson(`.

- [ ] **Step 2: Write the failing tests**

```ts
// src/server/lessons.test.ts
import { describe, expect, it } from "vitest";
import { makeLesson } from "../lib/test-fixtures";
import { createStudent, createTeacher } from "./accounts";
import { createClass } from "./classes";
import { openDb } from "./db";
import { AccessError, InputError } from "./errors";
import {
  deleteLesson,
  getTeacherLesson,
  listClassLessons,
  loadLesson,
  publishLesson,
  saveDraftLesson,
  saveEdits,
  unpublishLesson,
} from "./lessons";

async function world() {
  const db = openDb(":memory:");
  const teacher = await createTeacher(db, { name: "Ms Hoxha", email: "t@x.co", password: "password1" });
  const other = await createTeacher(db, { name: "Mr Berisha", email: "o@x.co", password: "password1" });
  const cls = createClass(db, teacher, { subject: "biology", name: "8A Biology" });
  return { db, teacher, other, cls };
}

describe("saveDraftLesson", () => {
  it("stores a draft and loads it back with the class subject as the label", async () => {
    const { db, teacher, cls } = await world();
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson({ subject: "Whatever the AI said" }), 12);
    const stored = getTeacherLesson(db, teacher, id);
    expect(stored).toMatchObject({ id, classId: cls.id, className: "8A Biology", status: "draft", slideCount: 12, language: "en" });
    expect(stored.lesson).toEqual({ ...makeLesson(), subject: "Biology" });
  });

  it("detects an Albanian lesson", async () => {
    const { db, teacher, cls } = await world();
    const base = makeLesson();
    const albanian = makeLesson({
      cards: base.cards.map((c) => ({
        ...c,
        explanation: "Bimët e kthejnë dritën e diellit në energji dhe kjo është e rëndësishme për jetën në tokë.",
      })),
    });
    const id = saveDraftLesson(db, teacher, cls.id, albanian, 5);
    expect(getTeacherLesson(db, teacher, id).language).toBe("sq");
  });

  it("is hidden from other teachers and refuses their classes", async () => {
    const { db, teacher, other, cls } = await world();
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
    expect(() => getTeacherLesson(db, other, id)).toThrow(AccessError);
    expect(() => saveDraftLesson(db, other, cls.id, makeLesson(), 5)).toThrow(AccessError);
    expect(() => getTeacherLesson(db, teacher, 999)).toThrow(AccessError);
    expect(loadLesson(db, 999)).toBeNull();
  });
});

describe("saveEdits", () => {
  it("keeps a half-finished draft, replaces the questions, and re-sanitizes text", async () => {
    const { db, teacher, cls } = await world();
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
    const draft = makeLesson({ title: "  Cells \u{1F600}  " });
    draft.cards = draft.cards.slice(0, 1);
    draft.quiz = [{ ...draft.quiz[0], question: "Only one left?", options: ["a", "b", "", ""] }];
    saveEdits(db, teacher, id, draft);
    const stored = getTeacherLesson(db, teacher, id);
    expect(stored.lesson.title).toBe("Cells");
    expect(stored.lesson.cards).toHaveLength(1);
    expect(stored.lesson.quiz).toHaveLength(1);
    expect(stored.lesson.quiz[0].question).toBe("Only one left?");
  });

  it("rejects malformed payloads, oversized lessons and duplicate question ids", async () => {
    const { db, teacher, cls } = await world();
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
    expect(() => saveEdits(db, teacher, id, { title: 3 })).toThrow(InputError);
    expect(() => saveEdits(db, teacher, id, null)).toThrow(InputError);
    const big = makeLesson();
    big.cards = Array.from({ length: 16 }, (_, i) => ({ ...big.cards[0], id: `c${i + 1}` }));
    expect(() => saveEdits(db, teacher, id, big)).toThrow("Keep it to");
    const dup = makeLesson();
    dup.quiz = [dup.quiz[0], { ...dup.quiz[1], id: dup.quiz[0].id }];
    expect(() => saveEdits(db, teacher, id, dup)).toThrow(InputError);
    expect(getTeacherLesson(db, teacher, id).lesson.quiz).toHaveLength(5);
  });

  it("refuses to edit a published lesson", async () => {
    const { db, teacher, cls } = await world();
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
    publishLesson(db, teacher, id);
    expect(() => saveEdits(db, teacher, id, makeLesson())).toThrow("Unpublish");
  });
});

describe("publish and unpublish", () => {
  it("blocks an invalid lesson with a plain message and allows it once fixed", async () => {
    const { db, teacher, cls } = await world();
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
    const broken = makeLesson();
    broken.quiz = broken.quiz.slice(0, 4);
    saveEdits(db, teacher, id, broken);
    expect(() => publishLesson(db, teacher, id)).toThrow(/Fix this before publishing: expected 5-10 questions/);
    expect(getTeacherLesson(db, teacher, id).status).toBe("draft");
    saveEdits(db, teacher, id, makeLesson());
    publishLesson(db, teacher, id);
    expect(getTeacherLesson(db, teacher, id).status).toBe("published");
    publishLesson(db, teacher, id);
  });

  it("flags a question that points at a removed page", async () => {
    const { db, teacher, cls } = await world();
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
    const edited = makeLesson();
    edited.quiz[0] = { ...edited.quiz[0], cardId: "gone" };
    saveEdits(db, teacher, id, edited);
    expect(() => publishLesson(db, teacher, id)).toThrow("missing card");
  });

  it("unpublishes while nobody has taken the quiz, and refuses afterwards", async () => {
    const { db, teacher, cls } = await world();
    const { user: student } = await createStudent(db, { name: "Mira", password: "password1" });
    const id = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
    publishLesson(db, teacher, id);
    unpublishLesson(db, teacher, id);
    expect(getTeacherLesson(db, teacher, id).status).toBe("draft");
    publishLesson(db, teacher, id);
    db.prepare(
      "INSERT INTO attempts (lesson_id, student_id, is_first, question_ids, shuffles, total, started_at) VALUES (?, ?, 1, '[]', '{}', 0, 0)",
    ).run(id, student.id);
    expect(() => unpublishLesson(db, teacher, id)).toThrow("already taken");
    expect(getTeacherLesson(db, teacher, id).status).toBe("published");
  });
});

describe("deleteLesson and listClassLessons", () => {
  it("deletes a lesson with its questions and lists the rest newest first", async () => {
    const { db, teacher, other, cls } = await world();
    const first = saveDraftLesson(db, teacher, cls.id, makeLesson({ title: "First" }), 5);
    const second = saveDraftLesson(db, teacher, cls.id, makeLesson({ title: "Second" }), 5);
    expect(listClassLessons(db, teacher, cls.id).map((l) => l.id)).toEqual([second, first]);
    expect(listClassLessons(db, teacher, cls.id)[0]).toEqual({ id: second, title: "Second", status: "draft", pageCount: 5, questionCount: 5 });
    expect(() => deleteLesson(db, other, first)).toThrow(AccessError);
    deleteLesson(db, teacher, first);
    expect(loadLesson(db, first)).toBeNull();
    expect((db.prepare("SELECT COUNT(*) AS n FROM questions WHERE lesson_id = ?").get(first) as { n: number }).n).toBe(0);
    expect(() => listClassLessons(db, other, cls.id)).toThrow(AccessError);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/server/lessons.test.ts`
Expected: FAIL, cannot resolve `./lessons`.

- [ ] **Step 4: Write the implementation**

```ts
// src/server/lessons.ts
import { detectLanguage, lessonText } from "../lib/language";
import { LessonSchema, LIMITS, type Card, type Lesson, type Question } from "../lib/lesson-schema";
import { SUBJECT_LABELS, type Subject } from "../lib/subjects";
import { sanitizeLesson, validateLesson } from "../lib/validate-lesson";
import type { SessionUser } from "./accounts";
import { getTeacherClass } from "./classes";
import { transaction, type Db } from "./db";
import { AccessError, InputError } from "./errors";

export type LessonStatus = "draft" | "published";

export type StoredLesson = {
  id: number;
  classId: number;
  className: string;
  subject: Subject;
  teacherId: number;
  status: LessonStatus;
  language: string;
  slideCount: number;
  lesson: Lesson;
};

type LessonRow = {
  id: number;
  class_id: number;
  title: string;
  language: string;
  slide_count: number;
  cards: string;
  status: LessonStatus;
  class_name: string;
  subject: Subject;
  teacher_id: number;
};
type QuestionRow = { qid: string; question: string; options: string; correct_index: number; explanation: string; card_id: string };

const toQuestion = (r: QuestionRow): Question => ({
  id: r.qid,
  question: r.question,
  options: JSON.parse(r.options) as string[],
  correctIndex: r.correct_index,
  explanation: r.explanation,
  cardId: r.card_id,
});

/** No access check: teachers go through getTeacherLesson, students through student.ts. */
export function loadLesson(db: Db, lessonId: number): StoredLesson | null {
  const row = db
    .prepare(
      `SELECT l.id, l.class_id, l.title, l.language, l.slide_count, l.cards, l.status,
              c.name AS class_name, c.subject, c.teacher_id
       FROM lessons l JOIN classes c ON c.id = l.class_id WHERE l.id = ?`,
    )
    .get(lessonId) as LessonRow | undefined;
  if (!row) return null;
  const questions = (
    db
      .prepare("SELECT qid, question, options, correct_index, explanation, card_id FROM questions WHERE lesson_id = ? ORDER BY position")
      .all(lessonId) as QuestionRow[]
  ).map(toQuestion);
  return {
    id: row.id,
    classId: row.class_id,
    className: row.class_name,
    subject: row.subject,
    teacherId: row.teacher_id,
    status: row.status,
    language: row.language,
    slideCount: row.slide_count,
    lesson: { title: row.title, subject: SUBJECT_LABELS[row.subject], cards: JSON.parse(row.cards) as Card[], quiz: questions },
  };
}

export function getTeacherLesson(db: Db, teacher: SessionUser, lessonId: number): StoredLesson {
  const stored = loadLesson(db, lessonId);
  if (!stored || teacher.role !== "teacher" || stored.teacherId !== teacher.id) throw new AccessError(404);
  return stored;
}

function insertQuestions(db: Db, lessonId: number, quiz: Question[]): void {
  const insert = db.prepare(
    "INSERT INTO questions (lesson_id, qid, position, question, options, correct_index, explanation, card_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  quiz.forEach((q, position) =>
    insert.run(lessonId, q.id, position, q.question, JSON.stringify(q.options), q.correctIndex, q.explanation, q.cardId),
  );
}

export function saveDraftLesson(db: Db, teacher: SessionUser, classId: number, lesson: Lesson, slideCount: number): number {
  const cls = getTeacherClass(db, teacher, classId);
  const clean = sanitizeLesson(lesson);
  return transaction(db, () => {
    const result = db
      .prepare("INSERT INTO lessons (class_id, title, language, slide_count, cards, status, created_at) VALUES (?, ?, ?, ?, ?, 'draft', ?)")
      .run(cls.id, clean.title, detectLanguage(lessonText(clean)), slideCount, JSON.stringify(clean.cards), Date.now());
    const id = Number(result.lastInsertRowid);
    insertQuestions(db, id, clean.quiz);
    return id;
  });
}

/** Saves a draft as typed. Counts and links are only enforced at publish, so a teacher can save half-done work. */
export function saveEdits(db: Db, teacher: SessionUser, lessonId: number, input: unknown): void {
  const stored = getTeacherLesson(db, teacher, lessonId);
  if (stored.status !== "draft") throw new InputError("Unpublish this lesson before editing it.");
  const parsed = LessonSchema.safeParse(input);
  if (!parsed.success) throw new InputError("Some fields are missing. Check the pages and questions and try again.");
  const clean = sanitizeLesson(parsed.data);
  if (clean.cards.length > LIMITS.maxCards || clean.quiz.length > LIMITS.maxQuestions) {
    throw new InputError(`Keep it to ${LIMITS.maxCards} pages and ${LIMITS.maxQuestions} questions.`);
  }
  if (new Set(clean.quiz.map((q) => q.id)).size !== clean.quiz.length) {
    throw new InputError("Two questions share an id. Reload the page and try again.");
  }
  transaction(db, () => {
    db.prepare("UPDATE lessons SET title = ?, cards = ?, language = ? WHERE id = ?").run(
      clean.title,
      JSON.stringify(clean.cards),
      detectLanguage(lessonText(clean)),
      lessonId,
    );
    db.prepare("DELETE FROM questions WHERE lesson_id = ?").run(lessonId);
    insertQuestions(db, lessonId, clean.quiz);
  });
}

export function publishLesson(db: Db, teacher: SessionUser, lessonId: number): void {
  const stored = getTeacherLesson(db, teacher, lessonId);
  if (stored.status === "published") return;
  const result = validateLesson(stored.lesson);
  if (!result.ok) throw new InputError(`Fix this before publishing: ${result.problems.slice(0, 3).join("; ")}.`);
  db.prepare("UPDATE lessons SET status = 'published', published_at = ? WHERE id = ?").run(Date.now(), lessonId);
}

export function unpublishLesson(db: Db, teacher: SessionUser, lessonId: number): void {
  getTeacherLesson(db, teacher, lessonId);
  if (db.prepare("SELECT 1 FROM attempts WHERE lesson_id = ? LIMIT 1").get(lessonId)) {
    throw new InputError("Students have already taken this quiz, so it can't be unpublished.");
  }
  db.prepare("UPDATE lessons SET status = 'draft', published_at = NULL WHERE id = ?").run(lessonId);
}

export function deleteLesson(db: Db, teacher: SessionUser, lessonId: number): void {
  getTeacherLesson(db, teacher, lessonId);
  db.prepare("DELETE FROM lessons WHERE id = ?").run(lessonId);
}

export type LessonSummary = { id: number; title: string; status: LessonStatus; pageCount: number; questionCount: number };

export function listClassLessons(db: Db, teacher: SessionUser, classId: number): LessonSummary[] {
  getTeacherClass(db, teacher, classId);
  const rows = db
    .prepare(
      `SELECT l.id, l.title, l.status, l.cards,
              (SELECT COUNT(*) FROM questions q WHERE q.lesson_id = l.id) AS question_count
       FROM lessons l WHERE l.class_id = ? ORDER BY l.created_at DESC, l.id DESC`,
    )
    .all(classId) as { id: number; title: string; status: LessonStatus; cards: string; question_count: number }[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    pageCount: (JSON.parse(r.cards) as unknown[]).length,
    questionCount: r.question_count,
  }));
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/server/lessons.test.ts`, then `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/validate-lesson.ts src/server/lessons.ts src/server/lessons.test.ts
git commit -m "feat: persisted lessons with draft, edit and publish rules" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Upload slides into a class

**Files:**
- Create: `src/server/generate-deps.ts`, `src/app/api/teacher/classes/[classId]/lessons/route.ts`, `src/app-components/ClassUpload.tsx`
- Modify: `src/app/teacher/classes/[id]/page.tsx`

**Interfaces:**
- Consumes: `handleGenerate`, `HandlerDeps`, `saveDraftLesson`, `listClassLessons`, `getApiUser`, `jsonError`, `parseId`, `getTeacherClass`.
- Produces: `generateDeps(): HandlerDeps` (honours `SLIDEKICK_FAKE_AI=1`); `POST /api/teacher/classes/[classId]/lessons` (multipart `file`) answering `{ lessonId }`; `<ClassUpload classId />`.

- [ ] **Step 1: Shared AI dependencies**

```ts
// src/server/generate-deps.ts
import { DEFAULT_DEMO_SLUG, getDemo } from "../demo";
import { makeCreateMessage } from "../lib/anthropic-client";
import { generateLesson, parseEffort } from "../lib/generate-lesson";
import type { HandlerDeps } from "../lib/handle-generate";

/** SLIDEKICK_FAKE_AI=1 returns the sample lesson without calling Claude. The end-to-end tests set it. */
export function generateDeps(): HandlerDeps {
  if (process.env.SLIDEKICK_FAKE_AI === "1") {
    return { hasKey: true, generate: async () => structuredClone(getDemo(DEFAULT_DEMO_SLUG)!.lesson) };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const effort = parseEffort(process.env.LESSON_EFFORT);
  return {
    hasKey: apiKey.length > 0,
    generate: (source) => generateLesson(source, { createMessage: makeCreateMessage(apiKey), effort }),
  };
}
```

- [ ] **Step 2: The upload route**

```ts
// src/app/api/teacher/classes/[classId]/lessons/route.ts
import { handleGenerate } from "@/lib/handle-generate";
import type { Lesson } from "@/lib/lesson-schema";
import { getApiUser, jsonError } from "@/server/api";
import { getTeacherClass } from "@/server/classes";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { generateDeps } from "@/server/generate-deps";
import { saveDraftLesson } from "@/server/lessons";

export const runtime = "nodejs";
export const maxDuration = 150;

export async function POST(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const teacher = await getApiUser("teacher");
    const classId = parseId((await params).classId);
    // Check ownership before spending any AI credit.
    getTeacherClass(getDb(), teacher, classId);
    const generated = await handleGenerate(request, generateDeps());
    if (!generated.ok) return generated;
    const { lesson, slideCount } = (await generated.json()) as { lesson: Lesson; slideCount: number };
    const lessonId = saveDraftLesson(getDb(), teacher, classId, lesson, slideCount);
    return Response.json({ lessonId });
  } catch (error) {
    return jsonError(error);
  }
}
```

- [ ] **Step 3: The upload component**

```tsx
// src/app-components/ClassUpload.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { LessonSkeleton } from "@/components/LessonSkeleton";
import { ERROR_MESSAGES } from "@/lib/errors";
import { ACCEPT, precheckFile } from "@/lib/file-kind";

const STATUS_LINES = ["Reading your slides", "Finding the key ideas", "Writing the lesson pages", "Writing your quiz"];

export function ClassUpload({ classId }: { classId: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setWorking(file.name);
    const problem = await precheckFile(file);
    if (problem) {
      setWorking(null);
      return setError(ERROR_MESSAGES[problem]);
    }
    const body = new FormData();
    body.set("file", file);
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/lessons`, { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.lessonId) throw new Error(data?.error?.message ?? ERROR_MESSAGES.ai_unavailable);
      router.push(`/teacher/lessons/${data.lessonId}`);
    } catch (e) {
      setWorking(null);
      setError(e instanceof Error ? e.message : ERROR_MESSAGES.ai_unavailable);
    }
  }

  if (working) return <Building fileName={working} />;

  return (
    <div>
      <Button onClick={() => inputRef.current?.click()}>Upload slides</Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        aria-label="Slides file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <p className="mt-3 text-[0.9375rem] text-ink-soft">
        PDF or PowerPoint, up to 20 MB and 60 slides. You can edit everything before students see it.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-incorrect">
          {error}
        </p>
      )}
    </div>
  );
}

function Building({ fileName }: { fileName: string }) {
  const [activeLine, setActiveLine] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setActiveLine((n) => Math.min(n + 1, STATUS_LINES.length - 1)), 7000);
    return () => clearInterval(timer);
  }, []);
  const rows = 8;
  const filled = Math.max(0, Math.round(((activeLine + 1) / STATUS_LINES.length) * rows) - 2);
  return (
    <section aria-labelledby="building-title" className="w-full">
      <p className="text-ink-soft">{fileName}</p>
      <h2 id="building-title" className="mb-10 mt-2 font-serif text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold">
        Building your lesson
      </h2>
      <p aria-live="polite" className="sr-only">
        {STATUS_LINES[activeLine]}
      </p>
      <LessonSkeleton filled={filled} rows={rows} lines={STATUS_LINES} activeLine={activeLine} />
    </section>
  );
}
```

- [ ] **Step 4: Show lessons on the class page**

Replace `src/app/teacher/classes/[id]/page.tsx` with:

```tsx
import Link from "next/link";
import { ClassUpload } from "@/app-components/ClassUpload";
import { PageShell, PageTitle, SectionTitle } from "@/app-components/PageShell";
import { SUBJECT_LABELS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";
import { getTeacherClass, listClassStudents } from "@/server/classes";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { orNotFound } from "@/server/guard";
import { listClassLessons } from "@/server/lessons";

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("teacher");
  const { id } = await params;
  const cls = orNotFound(() => getTeacherClass(getDb(), user, parseId(id)));
  const students = listClassStudents(getDb(), user, cls.id);
  const lessons = listClassLessons(getDb(), user, cls.id);
  return (
    <PageShell user={user}>
      <p className="text-ink-soft">{SUBJECT_LABELS[cls.subject]}</p>
      <PageTitle>{cls.name}</PageTitle>

      <section aria-labelledby="lessons-title" className="mt-12 max-w-3xl">
        <SectionTitle id="lessons-title">Lessons</SectionTitle>
        <div className="mt-5">
          <ClassUpload classId={cls.id} />
        </div>
        {lessons.length > 0 && (
          <ul className="mt-8 grid gap-1">
            {lessons.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/teacher/lessons/${l.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 rounded-[4px] px-4 py-3 hover:bg-paper-raised"
                >
                  <span>
                    <span className="font-serif text-[1.25rem] font-semibold">{l.title}</span>
                    <span className="block text-ink-soft">
                      {l.pageCount} pages, {l.questionCount} questions
                    </span>
                  </span>
                  <span className={l.status === "published" ? "font-semibold" : "text-ink-soft"}>
                    {l.status === "published" ? "Published" : "Draft"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="code-title" className="mt-14">
        <h2 id="code-title" className="text-ink-soft">
          Class code
        </h2>
        <p data-testid="join-code" className="mt-1 font-serif text-[clamp(2.5rem,7vw,4rem)] font-semibold tracking-[0.12em]">
          {cls.joinCode}
        </p>
        <p className="mt-2 max-w-[48ch] text-ink-soft">Students enter this code after they sign up.</p>
      </section>

      <section aria-labelledby="students-title" className="mt-14 max-w-3xl">
        <SectionTitle id="students-title">
          {students.length} {students.length === 1 ? "student" : "students"}
        </SectionTitle>
        {students.length > 0 && (
          <ul className="mt-3 grid gap-1 text-[1.0625rem]">
            {students.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` and `npm test`. The upload flow itself is covered by the end-to-end spec in Task 10.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: teachers upload slides into a class and get a draft lesson" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Review, edit, publish

**Files:**
- Create: `src/lib/lesson-edit.ts`, `src/app-components/LessonEditor.tsx`, `src/app-components/UnpublishButton.tsx`, `src/app/teacher/lessons/[id]/page.tsx`, `src/app/api/teacher/lessons/[id]/route.ts`, `src/app/api/teacher/lessons/[id]/status/route.ts`, `e2e/lessons.spec.ts`
- Test: `src/lib/lesson-edit.test.ts`

**Interfaces:**
- Consumes: `saveEdits`, `publishLesson`, `unpublishLesson`, `deleteLesson`, `getTeacherLesson`, `getApiUser`, `jsonError`, `parseId`, `orNotFound`.
- Produces:
  - `nextId(prefix: "c" | "q", existing: string[]): string`; `addCard(lesson)`, `removeCard(lesson, id)`, `updateCard(lesson, id, patch)`, `addQuestion(lesson)`, `removeQuestion(lesson, id)`, `updateQuestion(lesson, id, patch)`, `setOption(lesson, questionId, index, value)`; all return a new `Lesson`.
  - `PUT /api/teacher/lessons/[id]` (body: a `Lesson`), `DELETE /api/teacher/lessons/[id]`, `POST /api/teacher/lessons/[id]/status` (body `{ status: "published" | "draft" }`); each answers `{ ok: true }` or `{ error: { message } }`.
  - `<LessonEditor lessonId classId initial />`, `<UnpublishButton lessonId />`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/lesson-edit.test.ts
import { describe, expect, it } from "vitest";
import {
  addCard,
  addQuestion,
  nextId,
  removeCard,
  removeQuestion,
  setOption,
  updateCard,
  updateQuestion,
} from "./lesson-edit";
import { makeLesson } from "./test-fixtures";

describe("nextId", () => {
  it("never reuses an id that is taken", () => {
    expect(nextId("c", [])).toBe("c1");
    expect(nextId("c", ["c1", "c2"])).toBe("c3");
    expect(nextId("q", ["q2", "q3"])).toBe("q4");
    expect(nextId("c", ["c1", "c3"])).toBe("c4");
  });
});

describe("cards", () => {
  it("adds a blank page with a fresh id without touching the original", () => {
    const lesson = makeLesson();
    const next = addCard(lesson);
    expect(lesson.cards).toHaveLength(5);
    expect(next.cards).toHaveLength(6);
    expect(next.cards[5]).toEqual({ id: "c6", title: "", explanation: "", keyPoints: [""], rememberThis: "" });
  });

  it("removes and updates a page by id", () => {
    const lesson = makeLesson();
    expect(removeCard(lesson, "c2").cards.map((c) => c.id)).toEqual(["c1", "c3", "c4", "c5"]);
    const updated = updateCard(lesson, "c2", { title: "New title" });
    expect(updated.cards[1].title).toBe("New title");
    expect(updated.cards[0].title).toBe("Topic 1");
  });
});

describe("questions", () => {
  it("adds a blank question that points at the first page", () => {
    const next = addQuestion(makeLesson());
    expect(next.quiz).toHaveLength(6);
    expect(next.quiz[5]).toEqual({
      id: "q6",
      question: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
      cardId: "c1",
    });
  });

  it("removes, updates and sets one option without touching the others", () => {
    const lesson = makeLesson();
    expect(removeQuestion(lesson, "q1").quiz.map((q) => q.id)).toEqual(["q2", "q3", "q4", "q5"]);
    expect(updateQuestion(lesson, "q1", { correctIndex: 2 }).quiz[0].correctIndex).toBe(2);
    const changed = setOption(lesson, "q1", 1, "Edited");
    expect(changed.quiz[0].options).toEqual(["Right 1", "Edited", "Wrong B1", "Wrong C1"]);
    expect(changed.quiz[1].options).toEqual(lesson.quiz[1].options);
    expect(lesson.quiz[0].options[1]).toBe("Wrong A1");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/lesson-edit.test.ts`
Expected: FAIL, cannot resolve `./lesson-edit`.

- [ ] **Step 3: Write the editing helpers**

```ts
// src/lib/lesson-edit.ts
import type { Card, Lesson, Question } from "./lesson-schema";

export function nextId(prefix: "c" | "q", existing: string[]): string {
  let n = existing.length + 1;
  while (existing.includes(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

export function addCard(lesson: Lesson): Lesson {
  const id = nextId("c", lesson.cards.map((c) => c.id));
  return { ...lesson, cards: [...lesson.cards, { id, title: "", explanation: "", keyPoints: [""], rememberThis: "" }] };
}

/** Questions that pointed at the page keep the stale id; publishing flags them. */
export function removeCard(lesson: Lesson, id: string): Lesson {
  return { ...lesson, cards: lesson.cards.filter((c) => c.id !== id) };
}

export function updateCard(lesson: Lesson, id: string, patch: Partial<Card>): Lesson {
  return { ...lesson, cards: lesson.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
}

export function addQuestion(lesson: Lesson): Lesson {
  const id = nextId("q", lesson.quiz.map((q) => q.id));
  const blank: Question = {
    id,
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
    cardId: lesson.cards[0]?.id ?? "",
  };
  return { ...lesson, quiz: [...lesson.quiz, blank] };
}

export function removeQuestion(lesson: Lesson, id: string): Lesson {
  return { ...lesson, quiz: lesson.quiz.filter((q) => q.id !== id) };
}

export function updateQuestion(lesson: Lesson, id: string, patch: Partial<Question>): Lesson {
  return { ...lesson, quiz: lesson.quiz.map((q) => (q.id === id ? { ...q, ...patch } : q)) };
}

export function setOption(lesson: Lesson, questionId: string, index: number, value: string): Lesson {
  return {
    ...lesson,
    quiz: lesson.quiz.map((q) =>
      q.id === questionId ? { ...q, options: q.options.map((option, i) => (i === index ? value : option)) } : q,
    ),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/lesson-edit.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Route handlers**

```ts
// src/app/api/teacher/lessons/[id]/route.ts
import { getApiUser, jsonError } from "@/server/api";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { deleteLesson, saveEdits } from "@/server/lessons";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const teacher = await getApiUser("teacher");
    const lessonId = parseId((await params).id);
    const body = await request.json().catch(() => null);
    saveEdits(getDb(), teacher, lessonId, body);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const teacher = await getApiUser("teacher");
    deleteLesson(getDb(), teacher, parseId((await params).id));
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
```

```ts
// src/app/api/teacher/lessons/[id]/status/route.ts
import { getApiUser, jsonError } from "@/server/api";
import { getDb } from "@/server/db";
import { InputError, parseId } from "@/server/errors";
import { publishLesson, unpublishLesson } from "@/server/lessons";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const teacher = await getApiUser("teacher");
    const lessonId = parseId((await params).id);
    const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
    if (body?.status === "published") publishLesson(getDb(), teacher, lessonId);
    else if (body?.status === "draft") unpublishLesson(getDb(), teacher, lessonId);
    else throw new InputError("Unknown status.");
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
```

- [ ] **Step 6: The editor, the unpublish button and the review page**

```tsx
// src/app-components/LessonEditor.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { addCard, addQuestion, removeCard, removeQuestion, setOption, updateCard, updateQuestion } from "@/lib/lesson-edit";
import type { Lesson } from "@/lib/lesson-schema";

const CONTROL = "w-full rounded-[4px] border border-rule bg-sheet px-3 py-2 text-[1.0625rem]";
type Note = { text: string; bad: boolean };

async function send(url: string, method: string, body?: unknown): Promise<string | null> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.error?.message ?? "Something went wrong. Try again.";
}

export function LessonEditor({ lessonId, classId, initial }: { lessonId: number; classId: number; initial: Lesson }) {
  const router = useRouter();
  const [lesson, setLesson] = useState(initial);
  const [note, setNote] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(): Promise<boolean> {
    const error = await send(`/api/teacher/lessons/${lessonId}`, "PUT", lesson);
    setNote(error ? { text: error, bad: true } : { text: "Saved.", bad: false });
    return error === null;
  }

  async function run(job: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await job();
    } finally {
      setBusy(false);
    }
  }

  const publish = () =>
    run(async () => {
      if (!(await save())) return;
      const error = await send(`/api/teacher/lessons/${lessonId}/status`, "POST", { status: "published" });
      if (error) return setNote({ text: error, bad: true });
      router.refresh();
    });

  const remove = () =>
    run(async () => {
      if (!window.confirm("Delete this lesson? This cannot be undone.")) return;
      const error = await send(`/api/teacher/lessons/${lessonId}`, "DELETE");
      if (error) return setNote({ text: error, bad: true });
      router.push(`/teacher/classes/${classId}`);
    });

  return (
    <div className="mt-10 max-w-3xl">
      <div className="grid gap-1.5">
        <label htmlFor="lesson-title" className="font-semibold">
          Lesson title
        </label>
        <input
          id="lesson-title"
          className={CONTROL}
          value={lesson.title}
          onChange={(e) => setLesson({ ...lesson, title: e.target.value })}
        />
      </div>

      <h2 className="mt-14 font-serif text-[1.5rem] font-semibold">Pages</h2>
      <div className="mt-5 grid gap-10">
        {lesson.cards.map((card, i) => (
          <fieldset key={card.id} className="grid gap-3">
            <legend className="mb-2 font-serif text-[1.25rem] font-semibold">Page {i + 1}</legend>
            <input
              aria-label={`Page ${i + 1} title`}
              className={CONTROL}
              value={card.title}
              onChange={(e) => setLesson(updateCard(lesson, card.id, { title: e.target.value }))}
            />
            <textarea
              aria-label={`Page ${i + 1} explanation`}
              rows={4}
              className={CONTROL}
              value={card.explanation}
              onChange={(e) => setLesson(updateCard(lesson, card.id, { explanation: e.target.value }))}
            />
            <textarea
              aria-label={`Page ${i + 1} key points, one per line`}
              rows={3}
              className={CONTROL}
              value={card.keyPoints.join("\n")}
              onChange={(e) => setLesson(updateCard(lesson, card.id, { keyPoints: e.target.value.split("\n") }))}
            />
            <input
              aria-label={`Page ${i + 1} remember line`}
              className={CONTROL}
              value={card.rememberThis}
              onChange={(e) => setLesson(updateCard(lesson, card.id, { rememberThis: e.target.value }))}
            />
            <div>
              <Button variant="quiet" aria-label={`Remove page ${i + 1}`} onClick={() => setLesson(removeCard(lesson, card.id))}>
                Remove page
              </Button>
            </div>
          </fieldset>
        ))}
      </div>
      <div className="mt-6">
        <Button variant="quiet" onClick={() => setLesson(addCard(lesson))}>
          Add page
        </Button>
      </div>

      <h2 className="mt-14 font-serif text-[1.5rem] font-semibold">Quiz</h2>
      <p className="mt-2 text-ink-soft">Tick the correct option for each question. Students never see the answers before they answer.</p>
      <div className="mt-5 grid gap-10">
        {lesson.quiz.map((q, i) => {
          const n = i + 1;
          const pointsAtPage = lesson.cards.some((c) => c.id === q.cardId);
          return (
            <fieldset key={q.id} className="grid gap-3">
              <legend className="mb-2 font-serif text-[1.25rem] font-semibold">Question {n}</legend>
              <textarea
                aria-label={`Question ${n} text`}
                rows={2}
                className={CONTROL}
                value={q.question}
                onChange={(e) => setLesson(updateQuestion(lesson, q.id, { question: e.target.value }))}
              />
              {q.options.map((option, k) => (
                <div key={k} className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-3">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    aria-label={`Question ${n} option ${k + 1} is correct`}
                    checked={q.correctIndex === k}
                    onChange={() => setLesson(updateQuestion(lesson, q.id, { correctIndex: k }))}
                  />
                  <input
                    aria-label={`Question ${n} option ${k + 1}`}
                    className={CONTROL}
                    value={option}
                    onChange={(e) => setLesson(setOption(lesson, q.id, k, e.target.value))}
                  />
                </div>
              ))}
              <textarea
                aria-label={`Question ${n} explanation`}
                rows={2}
                className={CONTROL}
                value={q.explanation}
                onChange={(e) => setLesson(updateQuestion(lesson, q.id, { explanation: e.target.value }))}
              />
              <select
                aria-label={`Question ${n} teaches page`}
                className={CONTROL}
                value={q.cardId}
                onChange={(e) => setLesson(updateQuestion(lesson, q.id, { cardId: e.target.value }))}
              >
                {!pointsAtPage && <option value={q.cardId}>Choose a page</option>}
                {lesson.cards.map((c, p) => (
                  <option key={c.id} value={c.id}>{`Page ${p + 1}: ${c.title || "Untitled"}`}</option>
                ))}
              </select>
              <div>
                <Button variant="quiet" aria-label={`Remove question ${n}`} onClick={() => setLesson(removeQuestion(lesson, q.id))}>
                  Remove question
                </Button>
              </div>
            </fieldset>
          );
        })}
      </div>
      <div className="mt-6">
        <Button variant="quiet" onClick={() => setLesson(addQuestion(lesson))}>
          Add question
        </Button>
      </div>

      <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4">
        <Button onClick={publish} disabled={busy}>
          Publish
        </Button>
        <Button variant="quiet" onClick={() => run(async () => void (await save()))} disabled={busy}>
          Save draft
        </Button>
        <Button variant="quiet" onClick={remove} disabled={busy}>
          Delete lesson
        </Button>
      </div>
      {note && (
        <p role={note.bad ? "alert" : "status"} className={`mt-5 ${note.bad ? "text-incorrect" : "text-ink-soft"}`}>
          {note.text}
        </p>
      )}
    </div>
  );
}
```

```tsx
// src/app-components/UnpublishButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";

export function UnpublishButton({ lessonId }: { lessonId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unpublish() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/teacher/lessons/${lessonId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "draft" }),
    });
    if (res.ok) return router.refresh();
    const data = await res.json().catch(() => null);
    setError(data?.error?.message ?? "Something went wrong. Try again.");
    setBusy(false);
  }

  return (
    <div>
      <Button variant="quiet" onClick={unpublish} disabled={busy}>
        Unpublish to edit
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-incorrect">
          {error}
        </p>
      )}
    </div>
  );
}
```

```tsx
// src/app/teacher/lessons/[id]/page.tsx  (Task 15 adds the "See results" link to the published view)
import Link from "next/link";
import { LessonEditor } from "@/app-components/LessonEditor";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { UnpublishButton } from "@/app-components/UnpublishButton";
import { buttonClass } from "@/components/Button";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { orNotFound } from "@/server/guard";
import { getTeacherLesson } from "@/server/lessons";

export default async function LessonReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("teacher");
  const { id } = await params;
  const stored = orNotFound(() => getTeacherLesson(getDb(), user, parseId(id)));
  const published = stored.status === "published";
  const { lesson } = stored;
  return (
    <PageShell user={user} width="max-w-4xl">
      <Link href={`/teacher/classes/${stored.classId}`} className={buttonClass("quiet", "text-[0.9375rem]")}>
        Back to {stored.className}
      </Link>
      <p className="mt-8 text-ink-soft">
        {lesson.subject}, {published ? "published" : "draft"}
      </p>
      <PageTitle>{lesson.title}</PageTitle>

      {published ? (
        <>
          <p className="mt-4 max-w-[52ch] text-[1.125rem]">
            Students in {stored.className} can open this lesson. It is read-only while it is published.
          </p>
          <div className="mt-6">
            <UnpublishButton lessonId={stored.id} />
          </div>
          <ol className="mt-12 grid max-w-3xl gap-8">
            {lesson.cards.map((card, i) => (
              <li key={card.id} id={`page-${i + 1}`}>
                <h2 className="font-serif text-[1.375rem] font-semibold">
                  {i + 1}. {card.title}
                </h2>
                <p className="mt-2 text-[1.0625rem] leading-relaxed">{card.explanation}</p>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <LessonEditor lessonId={stored.id} classId={stored.classId} initial={lesson} />
      )}
    </PageShell>
  );
}
```

- [ ] **Step 7: End-to-end test**

```ts
// e2e/lessons.spec.ts
import { expect, test, type Page } from "@playwright/test";
import demo from "../src/demo/photosynthesis.json" with { type: "json" };
import { createClass, signupTeacher } from "./helpers";

async function uploadSampleDeck(page: Page) {
  await page.locator('input[type="file"]').setInputFiles("samples/pdf/photosynthesis.pdf");
  await expect(page).toHaveURL(/\/teacher\/lessons\/\d+$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(demo.lesson.title);
}

test("a teacher uploads slides, edits a question and publishes", async ({ page }) => {
  await signupTeacher(page);
  const { url } = await createClass(page);
  await uploadSampleDeck(page);

  const question = page.getByLabel("Question 1 text", { exact: true });
  await question.fill("Edited question?");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  await page.reload();
  await expect(question).toHaveValue("Edited question?");

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("can open this lesson")).toBeVisible();

  await page.goto(url);
  await expect(page.getByRole("link", { name: new RegExp(demo.lesson.title) })).toContainText("Published");
});

test("publishing an invalid draft shows a plain message and keeps the draft", async ({ page }) => {
  await signupTeacher(page);
  await createClass(page);
  await uploadSampleDeck(page);

  await page.getByLabel("Question 1 text", { exact: true }).fill("");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("alert")).toContainText("Fix this before publishing");
  await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
});

test("another teacher cannot open the lesson", async ({ page, browser }) => {
  await signupTeacher(page, "Ms One");
  await createClass(page);
  await uploadSampleDeck(page);
  const lessonUrl = page.url();
  const other = await (await browser.newContext()).newPage();
  await signupTeacher(other, "Ms Two");
  expect((await other.goto(lessonUrl))?.status()).toBe(404);
});
```

- [ ] **Step 8: Verify the slice**

Run: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run test:e2e`.
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: review, edit and publish lessons" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

# Slice 4: student flow and the private quiz

### Task 11: What a student may open

**Files:**
- Create: `src/server/student.ts`
- Test: `src/server/student.test.ts`

**Interfaces:**
- Consumes: `loadLesson`, `StoredLesson`, `listStudentSubjects`, `estimateMinutes`, `SessionUser`, `AccessError`.
- Produces:
  - `openLessonForStudent(db, student, lessonId): StoredLesson` (full lesson including the answer key; for server code such as `quiz.ts` only; throws `AccessError(403)` for a non-student and `AccessError(404)` for a lesson that is missing, unpublished, or in a class the student has not joined).
  - `type StudentLesson = { id; classId; className; subject: Subject; language; title; cards: Card[]; questionCount: number; minutes: number }` and `getStudentLesson(db, student, lessonId): StudentLesson` (the safe view: no questions, so nothing in it can leak an answer).
  - `type LessonProgress = "not-started" | "read" | "in-progress" | "done"`; `type StudentLessonRow = { id; title; className; pageCount; questionCount; progress; score: { correct: number; total: number } | null }`; `listSubjectLessons(db, student, subject): StudentLessonRow[]`.
  - `type SubjectProgress = { subject; classes: { id: number; name: string }[]; lessonCount: number; doneCount: number }`; `listSubjectProgress(db, student): SubjectProgress[]`.
  - `markRead(db, student, lessonId): void`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/server/student.test.ts
import { describe, expect, it } from "vitest";
import { makeLesson } from "../lib/test-fixtures";
import { createStudent, createTeacher } from "./accounts";
import { createClass, joinClass } from "./classes";
import { openDb } from "./db";
import { AccessError } from "./errors";
import { publishLesson, saveDraftLesson, unpublishLesson } from "./lessons";
import { getStudentLesson, listSubjectLessons, listSubjectProgress, markRead, openLessonForStudent } from "./student";

async function world() {
  const db = openDb(":memory:");
  const teacher = await createTeacher(db, { name: "Ms Hoxha", email: "t@x.co", password: "password1" });
  const bio = createClass(db, teacher, { subject: "biology", name: "8A Biology" });
  const math = createClass(db, teacher, { subject: "math", name: "8A Math" });
  const { user: mira } = await createStudent(db, { name: "Mira", password: "password1" });
  const { user: outsider } = await createStudent(db, { name: "Leon", password: "password1" });
  joinClass(db, mira, bio.joinCode);
  const lessonId = saveDraftLesson(db, teacher, bio.id, makeLesson({ title: "Cells" }), 5);
  publishLesson(db, teacher, lessonId);
  return { db, teacher, bio, math, mira, outsider, lessonId };
}

describe("access", () => {
  it("gives an enrolled student the lesson without any quiz data", async () => {
    const { db, mira, lessonId } = await world();
    const view = getStudentLesson(db, mira, lessonId);
    expect(view).toMatchObject({ id: lessonId, className: "8A Biology", subject: "biology", language: "en", title: "Cells", questionCount: 5 });
    expect(view.cards).toHaveLength(5);
    expect(view.minutes).toBeGreaterThan(0);
    const json = JSON.stringify(view);
    expect(json).not.toContain("correctIndex");
    expect(json).not.toContain("quiz");
  });

  it("says not found to a student who has not joined, a teacher, an unpublished lesson and a missing id", async () => {
    const { db, teacher, mira, outsider, lessonId } = await world();
    expect(() => getStudentLesson(db, outsider, lessonId)).toThrow(AccessError);
    expect(() => openLessonForStudent(db, teacher, lessonId)).toThrow(AccessError);
    expect(() => getStudentLesson(db, mira, 999)).toThrow(AccessError);
    unpublishLesson(db, teacher, lessonId);
    expect(() => getStudentLesson(db, mira, lessonId)).toThrow(AccessError);
  });
});

describe("progress", () => {
  const attempt = (db: ReturnType<typeof openDb>, lessonId: number, studentId: number, extra: { first: boolean; score: number | null }) =>
    db
      .prepare(
        "INSERT INTO attempts (lesson_id, student_id, is_first, question_ids, shuffles, total, score, started_at, finished_at) VALUES (?, ?, ?, '[]', '{}', 5, ?, 0, ?)",
      )
      .run(lessonId, studentId, extra.first ? 1 : 0, extra.score, extra.score === null ? null : 1);

  it("moves from not started to read, in progress and done", async () => {
    const { db, mira, lessonId } = await world();
    const row = () => listSubjectLessons(db, mira, "biology")[0];
    expect(row()).toMatchObject({ id: lessonId, title: "Cells", className: "8A Biology", pageCount: 5, questionCount: 5, progress: "not-started", score: null });
    markRead(db, mira, lessonId);
    markRead(db, mira, lessonId);
    expect(row().progress).toBe("read");
    attempt(db, lessonId, mira.id, { first: true, score: null });
    expect(row().progress).toBe("in-progress");
    db.prepare("UPDATE attempts SET score = 3, finished_at = 1").run();
    expect(row()).toMatchObject({ progress: "done", score: { correct: 3, total: 5 } });
    attempt(db, lessonId, mira.id, { first: false, score: null });
    expect(row().progress).toBe("done");
  });

  it("shows a score of zero as done, not as unfinished", async () => {
    const { db, mira, lessonId } = await world();
    attempt(db, lessonId, mira.id, { first: true, score: 0 });
    expect(listSubjectLessons(db, mira, "biology")[0]).toMatchObject({ progress: "done", score: { correct: 0, total: 5 } });
  });

  it("lists only the subject asked for, from classes the student joined", async () => {
    const { db, teacher, math, mira, outsider } = await world();
    const mathLesson = saveDraftLesson(db, teacher, math.id, makeLesson({ title: "Fractions" }), 5);
    publishLesson(db, teacher, mathLesson);
    expect(listSubjectLessons(db, mira, "math")).toEqual([]);
    expect(listSubjectLessons(db, mira, "biology")).toHaveLength(1);
    expect(listSubjectLessons(db, outsider, "biology")).toEqual([]);
  });

  it("hides drafts and counts done lessons per subject", async () => {
    const { db, teacher, bio, mira, lessonId } = await world();
    saveDraftLesson(db, teacher, bio.id, makeLesson({ title: "Draft only" }), 5);
    attempt(db, lessonId, mira.id, { first: true, score: 4 });
    const progress = listSubjectProgress(db, mira);
    expect(progress.map((p) => p.subject)).toEqual(["biology", "chemistry", "math", "albanian", "english"]);
    expect(progress[0]).toMatchObject({ lessonCount: 1, doneCount: 1 });
    expect(progress[1]).toMatchObject({ classes: [], lessonCount: 0, doneCount: 0 });
  });

  it("refuses to mark a lesson read for someone who cannot open it", async () => {
    const { db, outsider, lessonId } = await world();
    expect(() => markRead(db, outsider, lessonId)).toThrow(AccessError);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/server/student.test.ts`
Expected: FAIL, cannot resolve `./student`.

- [ ] **Step 3: Write the implementation**

```ts
// src/server/student.ts
import { estimateMinutes } from "../lib/estimate";
import type { Card } from "../lib/lesson-schema";
import type { Subject } from "../lib/subjects";
import type { SessionUser } from "./accounts";
import { listStudentSubjects } from "./classes";
import type { Db } from "./db";
import { AccessError } from "./errors";
import { loadLesson, type StoredLesson } from "./lessons";

/**
 * The only door a student's request goes through. Includes the answer key, so it is for server code
 * (quiz.ts). Pages and handlers that talk to the browser use getStudentLesson instead.
 */
export function openLessonForStudent(db: Db, student: SessionUser, lessonId: number): StoredLesson {
  if (student.role !== "student") throw new AccessError(403);
  const stored = loadLesson(db, lessonId);
  if (!stored || stored.status !== "published") throw new AccessError(404);
  const enrolled = db.prepare("SELECT 1 FROM enrollments WHERE class_id = ? AND student_id = ?").get(stored.classId, student.id);
  if (!enrolled) throw new AccessError(404);
  return stored;
}

export type StudentLesson = {
  id: number;
  classId: number;
  className: string;
  subject: Subject;
  language: string;
  title: string;
  cards: Card[];
  questionCount: number;
  minutes: number;
};

/** The safe view of a lesson: pages only, never the questions. */
export function getStudentLesson(db: Db, student: SessionUser, lessonId: number): StudentLesson {
  const stored = openLessonForStudent(db, student, lessonId);
  return {
    id: stored.id,
    classId: stored.classId,
    className: stored.className,
    subject: stored.subject,
    language: stored.language,
    title: stored.lesson.title,
    cards: stored.lesson.cards,
    questionCount: stored.lesson.quiz.length,
    minutes: estimateMinutes(stored.lesson),
  };
}

export type LessonProgress = "not-started" | "read" | "in-progress" | "done";
export type StudentLessonRow = {
  id: number;
  title: string;
  className: string;
  pageCount: number;
  questionCount: number;
  progress: LessonProgress;
  score: { correct: number; total: number } | null;
};

export function listSubjectLessons(db: Db, student: SessionUser, subject: Subject): StudentLessonRow[] {
  const id = student.id;
  const rows = db
    .prepare(
      `SELECT l.id, l.title, l.cards, c.name AS class_name,
         (SELECT COUNT(*) FROM questions q WHERE q.lesson_id = l.id) AS question_count,
         (SELECT a.score FROM attempts a WHERE a.lesson_id = l.id AND a.student_id = ? AND a.is_first = 1 AND a.finished_at IS NOT NULL) AS first_score,
         (SELECT a.total FROM attempts a WHERE a.lesson_id = l.id AND a.student_id = ? AND a.is_first = 1 AND a.finished_at IS NOT NULL) AS first_total,
         EXISTS (SELECT 1 FROM attempts a WHERE a.lesson_id = l.id AND a.student_id = ? AND a.finished_at IS NULL) AS has_open,
         EXISTS (SELECT 1 FROM reads r WHERE r.lesson_id = l.id AND r.student_id = ?) AS has_read
       FROM lessons l
       JOIN classes c ON c.id = l.class_id
       JOIN enrollments e ON e.class_id = c.id AND e.student_id = ?
       WHERE l.status = 'published' AND c.subject = ?
       ORDER BY l.published_at DESC, l.id DESC`,
    )
    .all(id, id, id, id, id, subject) as {
    id: number;
    title: string;
    cards: string;
    class_name: string;
    question_count: number;
    first_score: number | null;
    first_total: number | null;
    has_open: number;
    has_read: number;
  }[];
  return rows.map((r) => {
    const done = r.first_score !== null && r.first_total !== null;
    const progress: LessonProgress = done ? "done" : r.has_open ? "in-progress" : r.has_read ? "read" : "not-started";
    return {
      id: r.id,
      title: r.title,
      className: r.class_name,
      pageCount: (JSON.parse(r.cards) as unknown[]).length,
      questionCount: r.question_count,
      progress,
      score: done ? { correct: r.first_score!, total: r.first_total! } : null,
    };
  });
}

export type SubjectProgress = { subject: Subject; classes: { id: number; name: string }[]; lessonCount: number; doneCount: number };

export function listSubjectProgress(db: Db, student: SessionUser): SubjectProgress[] {
  return listStudentSubjects(db, student).map(({ subject, classes }) => {
    const lessons = classes.length ? listSubjectLessons(db, student, subject) : [];
    return { subject, classes, lessonCount: lessons.length, doneCount: lessons.filter((l) => l.progress === "done").length };
  });
}

export function markRead(db: Db, student: SessionUser, lessonId: number): void {
  openLessonForStudent(db, student, lessonId);
  db.prepare("INSERT OR IGNORE INTO reads (lesson_id, student_id, read_at) VALUES (?, ?, ?)").run(lessonId, student.id, Date.now());
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/server/student.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/student.ts src/server/student.test.ts
git commit -m "feat: student lesson access and progress" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The private quiz

**Files:**
- Create: `src/lib/quiz-types.ts`, `src/server/quiz.ts`
- Test: `src/server/quiz.test.ts`

**Interfaces:**
- Consumes: `openLessonForStudent`, `transaction`, `AccessError`, `InputError`, `Question`.
- Produces (`src/lib/quiz-types.ts`, safe to import from client code):
  - `QuizQuestion = { id: string; question: string; options: string[] }` (options already shuffled for this attempt; no answer, no explanation).
  - `Feedback = { chosenIndex: number; correctIndex: number; correct: boolean; explanation: string }` (indexes are positions in the shuffled `options`).
  - `AttemptView = { attemptId; lessonId; isFirst: boolean; total: number; questions: QuizQuestion[]; answered: Record<string, Feedback> }`.
  - `MissedQuestion = { id; question; yourAnswer: string; rightAnswer: string; pageNumber: number | null; pageTitle: string | null }`; `AttemptResult = { attemptId; lessonId; lessonTitle; isFirst: boolean; correct: number; total: number; missed: MissedQuestion[] }`.
- Produces (`src/server/quiz.ts`): `type Rng = () => number`; `shuffled<T>(items, rng): T[]`; `startAttempt(db, student, lessonId, rng?): AttemptView` (resumes an open attempt; otherwise a new one that is graded if the student has none yet, practice otherwise); `startRetry(db, student, lessonId, rng?): AttemptView` (resumes an open attempt; otherwise a practice attempt over the questions missed in the latest finished attempt); `answerQuestion(db, student, attemptId, qid, displayIndex): { feedback: Feedback; finished: boolean }` (an answered question is locked and answering again returns the stored feedback); `getAttemptResult(db, student, attemptId): AttemptResult` (only once finished); `latestFinishedAttemptId(db, studentId, lessonId): number | null`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/server/quiz.test.ts
import { describe, expect, it } from "vitest";
import type { AttemptView, QuizQuestion } from "../lib/quiz-types";
import { makeLesson } from "../lib/test-fixtures";
import { createStudent, createTeacher, type SessionUser } from "./accounts";
import { createClass, joinClass } from "./classes";
import { openDb, type Db } from "./db";
import { AccessError, InputError } from "./errors";
import { publishLesson, saveDraftLesson, unpublishLesson } from "./lessons";
import { answerQuestion, getAttemptResult, latestFinishedAttemptId, startAttempt, startRetry } from "./quiz";

const lcg = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
// The fixture's right option text starts with "Right", the others with "Wrong".
const rightAt = (q: QuizQuestion) => q.options.findIndex((o) => o.startsWith("Right"));
const wrongAt = (q: QuizQuestion) => q.options.findIndex((o) => o.startsWith("Wrong"));

async function world() {
  const db = openDb(":memory:");
  const teacher = await createTeacher(db, { name: "Ms Hoxha", email: "t@x.co", password: "password1" });
  const cls = createClass(db, teacher, { subject: "biology", name: "8A Biology" });
  const { user: mira } = await createStudent(db, { name: "Mira", password: "password1" });
  const { user: leon } = await createStudent(db, { name: "Leon", password: "password1" });
  const { user: outsider } = await createStudent(db, { name: "Dren", password: "password1" });
  joinClass(db, mira, cls.joinCode);
  joinClass(db, leon, cls.joinCode);
  const lessonId = saveDraftLesson(db, teacher, cls.id, makeLesson(), 5);
  publishLesson(db, teacher, lessonId);
  return { db, teacher, mira, leon, outsider, lessonId };
}

function answerAll(db: Db, student: SessionUser, view: AttemptView, wrongOn: string[] = []) {
  let last!: ReturnType<typeof answerQuestion>;
  for (const q of view.questions) {
    last = answerQuestion(db, student, view.attemptId, q.id, wrongOn.includes(q.id) ? wrongAt(q) : rightAt(q));
  }
  return last;
}

describe("starting a quiz", () => {
  it("sends no answer key and no explanation", async () => {
    const { db, mira, lessonId } = await world();
    const view = startAttempt(db, mira, lessonId, lcg(3));
    const json = JSON.stringify(view);
    expect(json).not.toContain("correctIndex");
    expect(json).not.toContain("explanation");
    expect(json).not.toContain("Because of topic");
    expect(view.answered).toEqual({});
    expect(view.total).toBe(5);
    expect(view.isFirst).toBe(true);
    for (const q of view.questions) {
      expect(q.options).toHaveLength(4);
      expect(rightAt(q)).toBeGreaterThanOrEqual(0);
    }
  });

  it("shuffles the options, so the right one is not always first", async () => {
    const { db, teacher, mira, leon } = await world();
    const positions = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) {
      const student = seed % 2 ? mira : leon;
      const lessonId = saveDraftLesson(db, teacher, 1, makeLesson(), 5);
      publishLesson(db, teacher, lessonId);
      positions.add(rightAt(startAttempt(db, student, lessonId, lcg(seed)).questions[0]));
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it("resumes the same attempt with the same order and the answers so far", async () => {
    const { db, mira, lessonId } = await world();
    const view = startAttempt(db, mira, lessonId, lcg(5));
    answerQuestion(db, mira, view.attemptId, view.questions[0].id, rightAt(view.questions[0]));
    answerQuestion(db, mira, view.attemptId, view.questions[1].id, wrongAt(view.questions[1]));
    const again = startAttempt(db, mira, lessonId, lcg(99));
    expect(again.attemptId).toBe(view.attemptId);
    expect(again.questions).toEqual(view.questions);
    expect(Object.keys(again.answered)).toEqual([view.questions[0].id, view.questions[1].id]);
    expect(again.answered[view.questions[1].id].correct).toBe(false);
  });
});

describe("answering", () => {
  it("returns feedback in the shuffled positions and locks the answer", async () => {
    const { db, mira, lessonId } = await world();
    const view = startAttempt(db, mira, lessonId, lcg(7));
    const q = view.questions[0];
    const first = answerQuestion(db, mira, view.attemptId, q.id, wrongAt(q));
    expect(first.feedback.correct).toBe(false);
    expect(first.feedback.chosenIndex).toBe(wrongAt(q));
    expect(q.options[first.feedback.correctIndex]).toMatch(/^Right/);
    expect(first.feedback.explanation).toMatch(/^Because of topic/);
    expect(first.finished).toBe(false);
    const again = answerQuestion(db, mira, view.attemptId, q.id, rightAt(q));
    expect(again.feedback).toEqual(first.feedback);
    expect(Object.keys(startAttempt(db, mira, lessonId).answered)).toEqual([q.id]);
  });

  it("rejects a question that is not in the quiz and an option that does not exist", async () => {
    const { db, mira, lessonId } = await world();
    const view = startAttempt(db, mira, lessonId, lcg(7));
    expect(() => answerQuestion(db, mira, view.attemptId, "q99", 0)).toThrow(InputError);
    for (const bad of [-1, 4, 1.5, Number.NaN]) {
      expect(() => answerQuestion(db, mira, view.attemptId, view.questions[0].id, bad)).toThrow(InputError);
    }
  });
});

describe("results", () => {
  it("scores the attempt and lists missed questions with the page that teaches them", async () => {
    const { db, mira, lessonId } = await world();
    const view = startAttempt(db, mira, lessonId, lcg(11));
    const wrong = view.questions.slice(0, 2).map((q) => q.id);
    expect(() => getAttemptResult(db, mira, view.attemptId)).toThrow(InputError);
    const last = answerAll(db, mira, view, wrong);
    expect(last.finished).toBe(true);
    const result = getAttemptResult(db, mira, view.attemptId);
    expect(result).toMatchObject({ lessonId, lessonTitle: "Test Lesson", isFirst: true, correct: 3, total: 5 });
    expect(result.missed.map((m) => m.id).sort()).toEqual([...wrong].sort());
    for (const m of result.missed) {
      expect(m.yourAnswer).toMatch(/^Wrong/);
      expect(m.rightAnswer).toMatch(/^Right/);
      expect(m.pageNumber).toBe(Number(m.id.slice(1)));
      expect(m.pageTitle).toBe(`Topic ${m.pageNumber}`);
    }
    expect(latestFinishedAttemptId(db, mira.id, lessonId)).toBe(view.attemptId);
    expect(latestFinishedAttemptId(db, 999, lessonId)).toBeNull();
  });

  it("keeps a finished first attempt as the only graded one; later attempts are practice", async () => {
    const { db, mira, lessonId } = await world();
    const first = startAttempt(db, mira, lessonId, lcg(2));
    answerAll(db, mira, first, [first.questions[0].id]);
    const practice = startAttempt(db, mira, lessonId, lcg(3));
    expect(practice.attemptId).not.toBe(first.attemptId);
    expect(practice.isFirst).toBe(false);
    answerAll(db, mira, practice);
    expect(getAttemptResult(db, mira, practice.attemptId)).toMatchObject({ isFirst: false, correct: 5 });
    const graded = db.prepare("SELECT id, score FROM attempts WHERE student_id = ? AND is_first = 1").all(mira.id);
    expect(graded).toEqual([{ id: first.attemptId, score: 4 }]);
  });
});

describe("retry", () => {
  it("replays only the questions missed in the latest finished attempt as practice", async () => {
    const { db, mira, lessonId } = await world();
    expect(() => startRetry(db, mira, lessonId)).toThrow("Take the quiz first");
    const first = startAttempt(db, mira, lessonId, lcg(4));
    const missed = first.questions.slice(0, 2).map((q) => q.id);
    answerAll(db, mira, first, missed);
    const retry = startRetry(db, mira, lessonId, lcg(8));
    expect(retry.isFirst).toBe(false);
    expect(retry.questions.map((q) => q.id).sort()).toEqual([...missed].sort());
    answerAll(db, mira, retry);
    expect(() => startRetry(db, mira, lessonId)).toThrow("Nothing to retry");
  });
});

describe("who may take a quiz", () => {
  it("says not found to a student outside the class, a teacher, and an unpublished lesson", async () => {
    const { db, teacher, mira, outsider, lessonId } = await world();
    expect(() => startAttempt(db, outsider, lessonId)).toThrow(AccessError);
    expect(() => startAttempt(db, teacher, lessonId)).toThrow(AccessError);
    expect(() => startAttempt(db, mira, 999)).toThrow(AccessError);
    unpublishLesson(db, teacher, lessonId);
    expect(() => startAttempt(db, mira, lessonId)).toThrow(AccessError);
  });

  it("keeps one student's attempt private from another, even inside the same class", async () => {
    const { db, mira, leon, lessonId } = await world();
    const view = startAttempt(db, mira, lessonId, lcg(6));
    answerAll(db, mira, view);
    const q = view.questions[0];
    expect(() => answerQuestion(db, leon, view.attemptId, q.id, 0)).toThrow(AccessError);
    expect(() => getAttemptResult(db, leon, view.attemptId)).toThrow(AccessError);
    expect(() => getAttemptResult(db, mira, 999)).toThrow(AccessError);
    expect(startAttempt(db, leon, lessonId).attemptId).not.toBe(view.attemptId);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/server/quiz.test.ts`
Expected: FAIL, cannot resolve `./quiz` and `../lib/quiz-types`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/quiz-types.ts
// Shapes that cross from the server to the quiz screen. Nothing here can carry a hidden answer.
export type QuizQuestion = { id: string; question: string; options: string[] };

/** Indexes are positions in the shuffled options the student was shown. */
export type Feedback = { chosenIndex: number; correctIndex: number; correct: boolean; explanation: string };

export type AttemptView = {
  attemptId: number;
  lessonId: number;
  isFirst: boolean;
  total: number;
  questions: QuizQuestion[];
  answered: Record<string, Feedback>;
};

export type MissedQuestion = {
  id: string;
  question: string;
  yourAnswer: string;
  rightAnswer: string;
  pageNumber: number | null;
  pageTitle: string | null;
};

export type AttemptResult = {
  attemptId: number;
  lessonId: number;
  lessonTitle: string;
  isFirst: boolean;
  correct: number;
  total: number;
  missed: MissedQuestion[];
};
```

```ts
// src/server/quiz.ts
import type { Question } from "../lib/lesson-schema";
import type { AttemptResult, AttemptView, Feedback } from "../lib/quiz-types";
import type { SessionUser } from "./accounts";
import { transaction, type Db } from "./db";
import { AccessError, InputError } from "./errors";
import { openLessonForStudent } from "./student";

export type Rng = () => number;

type AttemptRow = {
  id: number;
  lesson_id: number;
  student_id: number;
  is_first: number;
  question_ids: string;
  shuffles: string;
  answers: string;
  score: number | null;
  total: number;
  finished_at: number | null;
};

export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const loadAttempt = (db: Db, id: number) => db.prepare("SELECT * FROM attempts WHERE id = ?").get(id) as AttemptRow | undefined;

function ownAttempt(db: Db, student: SessionUser, attemptId: number): AttemptRow {
  const row = loadAttempt(db, attemptId);
  if (!row || row.student_id !== student.id || student.role !== "student") throw new AccessError(404);
  return row;
}

const findOpenAttempt = (db: Db, studentId: number, lessonId: number) =>
  db
    .prepare("SELECT * FROM attempts WHERE lesson_id = ? AND student_id = ? AND finished_at IS NULL ORDER BY id LIMIT 1")
    .get(lessonId, studentId) as AttemptRow | undefined;

function createAttempt(db: Db, studentId: number, lessonId: number, questions: Question[], ids: string[], isFirst: boolean, rng: Rng): AttemptRow {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const order = shuffled(ids, rng);
  const shuffles: Record<string, number[]> = {};
  for (const id of order) shuffles[id] = shuffled(byId.get(id)!.options.map((_, i) => i), rng);
  const result = db
    .prepare("INSERT INTO attempts (lesson_id, student_id, is_first, question_ids, shuffles, total, started_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(lessonId, studentId, isFirst ? 1 : 0, JSON.stringify(order), JSON.stringify(shuffles), order.length, Date.now());
  return loadAttempt(db, Number(result.lastInsertRowid))!;
}

function feedbackFor(question: Question, shuffle: number[], chosenOriginal: number): Feedback {
  return {
    chosenIndex: shuffle.indexOf(chosenOriginal),
    correctIndex: shuffle.indexOf(question.correctIndex),
    correct: chosenOriginal === question.correctIndex,
    explanation: question.explanation,
  };
}

function viewAttempt(db: Db, student: SessionUser, attempt: AttemptRow): AttemptView {
  const { lesson } = openLessonForStudent(db, student, attempt.lesson_id);
  const byId = new Map(lesson.quiz.map((q) => [q.id, q]));
  const ids = JSON.parse(attempt.question_ids) as string[];
  const shuffles = JSON.parse(attempt.shuffles) as Record<string, number[]>;
  const answers = JSON.parse(attempt.answers) as Record<string, number>;
  const answered: Record<string, Feedback> = {};
  // Only questions the student has already answered get their feedback back.
  for (const id of ids) if (answers[id] !== undefined) answered[id] = feedbackFor(byId.get(id)!, shuffles[id], answers[id]);
  return {
    attemptId: attempt.id,
    lessonId: attempt.lesson_id,
    isFirst: attempt.is_first === 1,
    total: ids.length,
    questions: ids.map((id) => ({
      id,
      question: byId.get(id)!.question,
      options: shuffles[id].map((original) => byId.get(id)!.options[original]),
    })),
    answered,
  };
}

export function startAttempt(db: Db, student: SessionUser, lessonId: number, rng: Rng = Math.random): AttemptView {
  const stored = openLessonForStudent(db, student, lessonId);
  const open = findOpenAttempt(db, student.id, lessonId);
  if (open) return viewAttempt(db, student, open);
  const isFirst = !db.prepare("SELECT 1 FROM attempts WHERE lesson_id = ? AND student_id = ?").get(lessonId, student.id);
  const quiz = stored.lesson.quiz;
  return viewAttempt(db, student, createAttempt(db, student.id, lessonId, quiz, quiz.map((q) => q.id), isFirst, rng));
}

export function startRetry(db: Db, student: SessionUser, lessonId: number, rng: Rng = Math.random): AttemptView {
  const stored = openLessonForStudent(db, student, lessonId);
  const open = findOpenAttempt(db, student.id, lessonId);
  if (open) return viewAttempt(db, student, open);
  const latest = db
    .prepare("SELECT * FROM attempts WHERE lesson_id = ? AND student_id = ? AND finished_at IS NOT NULL ORDER BY finished_at DESC, id DESC LIMIT 1")
    .get(lessonId, student.id) as AttemptRow | undefined;
  if (!latest) throw new InputError("Take the quiz first.");
  const byId = new Map(stored.lesson.quiz.map((q) => [q.id, q]));
  const answers = JSON.parse(latest.answers) as Record<string, number>;
  const missed = (JSON.parse(latest.question_ids) as string[]).filter((id) => answers[id] !== byId.get(id)!.correctIndex);
  if (missed.length === 0) throw new InputError("You got everything right. Nothing to retry.");
  return viewAttempt(db, student, createAttempt(db, student.id, lessonId, stored.lesson.quiz, missed, false, rng));
}

export function answerQuestion(
  db: Db,
  student: SessionUser,
  attemptId: number,
  qid: string,
  displayIndex: number,
): { feedback: Feedback; finished: boolean } {
  const attempt = ownAttempt(db, student, attemptId);
  const { lesson } = openLessonForStudent(db, student, attempt.lesson_id);
  const ids = JSON.parse(attempt.question_ids) as string[];
  if (!ids.includes(qid)) throw new InputError("That question is not part of this quiz.");
  const byId = new Map(lesson.quiz.map((q) => [q.id, q]));
  const question = byId.get(qid)!;
  const shuffle = (JSON.parse(attempt.shuffles) as Record<string, number[]>)[qid];
  if (!Number.isInteger(displayIndex) || displayIndex < 0 || displayIndex >= shuffle.length) {
    throw new InputError("Pick one of the options.");
  }
  const answers = JSON.parse(attempt.answers) as Record<string, number>;
  // Locked: a second tap or a reload returns what was already decided and changes nothing.
  if (answers[qid] !== undefined) return { feedback: feedbackFor(question, shuffle, answers[qid]), finished: attempt.finished_at !== null };

  return transaction(db, () => {
    answers[qid] = shuffle[displayIndex];
    const finished = ids.every((id) => answers[id] !== undefined);
    if (finished) {
      const score = ids.filter((id) => answers[id] === byId.get(id)!.correctIndex).length;
      db.prepare("UPDATE attempts SET answers = ?, score = ?, finished_at = ? WHERE id = ?").run(JSON.stringify(answers), score, Date.now(), attempt.id);
    } else {
      db.prepare("UPDATE attempts SET answers = ? WHERE id = ?").run(JSON.stringify(answers), attempt.id);
    }
    return { feedback: feedbackFor(question, shuffle, answers[qid]), finished };
  });
}

export function getAttemptResult(db: Db, student: SessionUser, attemptId: number): AttemptResult {
  const attempt = ownAttempt(db, student, attemptId);
  if (attempt.finished_at === null) throw new InputError("Finish the quiz to see the results.");
  const { lesson } = openLessonForStudent(db, student, attempt.lesson_id);
  const byId = new Map(lesson.quiz.map((q) => [q.id, q]));
  const answers = JSON.parse(attempt.answers) as Record<string, number>;
  const missed = (JSON.parse(attempt.question_ids) as string[]).flatMap((id) => {
    const q = byId.get(id)!;
    if (answers[id] === q.correctIndex) return [];
    const cardIndex = lesson.cards.findIndex((c) => c.id === q.cardId);
    return [
      {
        id,
        question: q.question,
        yourAnswer: q.options[answers[id]],
        rightAnswer: q.options[q.correctIndex],
        pageNumber: cardIndex === -1 ? null : cardIndex + 1,
        pageTitle: cardIndex === -1 ? null : lesson.cards[cardIndex].title,
      },
    ];
  });
  return {
    attemptId: attempt.id,
    lessonId: attempt.lesson_id,
    lessonTitle: lesson.title,
    isFirst: attempt.is_first === 1,
    correct: attempt.score ?? 0,
    total: attempt.total,
    missed,
  };
}

export function latestFinishedAttemptId(db: Db, studentId: number, lessonId: number): number | null {
  const row = db
    .prepare("SELECT id FROM attempts WHERE lesson_id = ? AND student_id = ? AND finished_at IS NOT NULL ORDER BY finished_at DESC, id DESC LIMIT 1")
    .get(lessonId, studentId) as { id: number } | undefined;
  return row?.id ?? null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/server/quiz.test.ts` then `npm test`
Expected: PASS.

If "shuffles the options" fails because the helper loops create lessons in class id 1: the world's class has id 1, so `saveDraftLesson(db, teacher, 1, ...)` is valid.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quiz-types.ts src/server/quiz.ts src/server/quiz.test.ts
git commit -m "feat: private quiz with server-side grading and shuffled options" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Student screens

**Files:**
- Create: `src/app/api/learn/lessons/[id]/attempts/route.ts`, `src/app/api/learn/lessons/[id]/read/route.ts`, `src/app/api/learn/attempts/[id]/answers/route.ts`, `src/app-components/LessonReader.tsx`, `src/app-components/QuizRunner.tsx`, `src/app-components/ScoreCounter.tsx`, `src/app/learn/lessons/[id]/page.tsx`, `src/app/learn/lessons/[id]/pages/[n]/page.tsx`, `src/app/learn/lessons/[id]/quiz/page.tsx`, `src/app/learn/lessons/[id]/results/page.tsx`, `e2e/classroom.spec.ts`
- Modify: `src/app/learn/page.tsx`, `src/app/learn/[subject]/page.tsx`, `e2e/helpers.ts`

**Interfaces:**
- Consumes: Tasks 11 and 12, `LessonPageView`, `QuizQuestionView`, `ProgressBar`, `ScoreView`, `StatsLine`, `verdict` from `@/lib/scoring`, `parsePageParam`, `useKey`, `useAnimatedValue`.
- Produces: `POST /api/learn/lessons/[id]/attempts` (body `{ mode: "start" | "retry" }`, answers `{ attempt: AttemptView }`), `POST /api/learn/lessons/[id]/read`, `POST /api/learn/attempts/[id]/answers` (body `{ qid, index }`, answers `{ feedback, finished }`); components `LessonReader`, `QuizRunner`, `ScoreCounter`; Playwright helper `publishSampleLesson(page)`.

- [ ] **Step 1: Route handlers**

```ts
// src/app/api/learn/lessons/[id]/attempts/route.ts
import { getApiUser, jsonError } from "@/server/api";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { startAttempt, startRetry } from "@/server/quiz";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await getApiUser("student");
    const lessonId = parseId((await params).id);
    const body = (await request.json().catch(() => null)) as { mode?: unknown } | null;
    const attempt = body?.mode === "retry" ? startRetry(getDb(), student, lessonId) : startAttempt(getDb(), student, lessonId);
    return Response.json({ attempt });
  } catch (error) {
    return jsonError(error);
  }
}
```

```ts
// src/app/api/learn/lessons/[id]/read/route.ts
import { getApiUser, jsonError } from "@/server/api";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { markRead } from "@/server/student";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await getApiUser("student");
    markRead(getDb(), student, parseId((await params).id));
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
```

```ts
// src/app/api/learn/attempts/[id]/answers/route.ts
import { getApiUser, jsonError } from "@/server/api";
import { getDb } from "@/server/db";
import { InputError, parseId } from "@/server/errors";
import { answerQuestion } from "@/server/quiz";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await getApiUser("student");
    const attemptId = parseId((await params).id);
    const body = (await request.json().catch(() => null)) as { qid?: unknown; index?: unknown } | null;
    if (typeof body?.qid !== "string" || typeof body.index !== "number") throw new InputError("Pick one of the options.");
    return Response.json(answerQuestion(getDb(), student, attemptId, body.qid, body.index));
  } catch (error) {
    return jsonError(error);
  }
}
```

- [ ] **Step 2: Subject screens with progress**

Replace `src/app/learn/page.tsx`:

```tsx
import Link from "next/link";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { buttonClass } from "@/components/Button";
import { SUBJECT_LABELS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { listSubjectProgress } from "@/server/student";

export default async function LearnHome() {
  const user = await requireUser("student");
  const subjects = listSubjectProgress(getDb(), user);
  return (
    <PageShell user={user} width="max-w-4xl">
      <PageTitle>Your subjects</PageTitle>
      <ul className="mt-10 grid gap-1">
        {subjects.map(({ subject, classes, lessonCount, doneCount }) => (
          <li key={subject}>
            <Link
              href={`/learn/${subject}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 rounded-[4px] px-4 py-4 hover:bg-paper-raised"
            >
              <span className="font-serif text-[1.5rem] font-semibold">{SUBJECT_LABELS[subject]}</span>
              <span className="text-ink-soft">
                {classes.length === 0
                  ? "Enter a class code"
                  : lessonCount === 0
                    ? "No lessons yet"
                    : `${doneCount} of ${lessonCount} done`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/join" className={buttonClass("quiet", "mt-8")}>
        Join another class
      </Link>
    </PageShell>
  );
}
```

Replace `src/app/learn/[subject]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { buttonClass } from "@/components/Button";
import { isSubject, SUBJECT_LABELS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";
import { listStudentSubjects } from "@/server/classes";
import { getDb } from "@/server/db";
import { listSubjectLessons, type StudentLessonRow } from "@/server/student";

const progressText = (l: StudentLessonRow) =>
  l.progress === "done" && l.score
    ? `${l.score.correct} / ${l.score.total}`
    : { "not-started": "Not started", read: "Read", "in-progress": "In progress", done: "Done" }[l.progress];

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const user = await requireUser("student");
  const { subject } = await params;
  if (!isSubject(subject)) notFound();
  const mine = listStudentSubjects(getDb(), user).find((s) => s.subject === subject)!;
  const lessons = mine.classes.length ? listSubjectLessons(getDb(), user, subject) : [];
  return (
    <PageShell user={user} width="max-w-4xl">
      <PageTitle>{SUBJECT_LABELS[subject]}</PageTitle>
      {mine.classes.length === 0 ? (
        <>
          <p className="mt-6 max-w-[48ch] text-[1.125rem]">You have not joined a {SUBJECT_LABELS[subject]} class yet.</p>
          <Link href="/join" className={buttonClass("primary", "mt-8")}>
            Enter a class code
          </Link>
        </>
      ) : lessons.length === 0 ? (
        <p className="mt-6 max-w-[48ch] text-[1.125rem]">Your teacher has not published a lesson yet.</p>
      ) : (
        <ul className="mt-10 grid gap-1">
          {lessons.map((l) => (
            <li key={l.id}>
              <Link
                href={`/learn/lessons/${l.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 rounded-[4px] px-4 py-4 hover:bg-paper-raised"
              >
                <span>
                  <span className="font-serif text-[1.375rem] font-semibold">{l.title}</span>
                  <span className="block text-ink-soft">
                    {l.className}, {l.pageCount} pages, {l.questionCount} questions
                  </span>
                </span>
                <span className={l.progress === "done" ? "font-semibold" : "text-ink-soft"}>{progressText(l)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
```

- [ ] **Step 3: Lesson overview and pages**

```tsx
// src/app/learn/lessons/[id]/page.tsx
import Link from "next/link";
import { PageShell } from "@/app-components/PageShell";
import { buttonClass } from "@/components/Button";
import { StatsLine } from "@/components/StatsLine";
import { SUBJECT_LABELS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { orNotFound } from "@/server/guard";
import { latestFinishedAttemptId } from "@/server/quiz";
import { getStudentLesson } from "@/server/student";

const pad = (n: number) => String(n).padStart(2, "0");

export default async function LessonOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("student");
  const { id } = await params;
  const lesson = orNotFound(() => getStudentLesson(getDb(), user, parseId(id)));
  const base = `/learn/lessons/${lesson.id}`;
  const finished = latestFinishedAttemptId(getDb(), user.id, lesson.id);
  return (
    <PageShell user={user}>
      <Link href={`/learn/${lesson.subject}`} className={buttonClass("quiet", "text-[0.9375rem]")}>
        Back to {SUBJECT_LABELS[lesson.subject]}
      </Link>
      <p className="mt-8 text-[1.0625rem] text-ink-soft">
        {SUBJECT_LABELS[lesson.subject]}, {lesson.className}
      </p>
      <h1
        lang={lesson.language}
        className="mt-2 font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.02em]"
      >
        {lesson.title}
      </h1>
      <div className="mt-4">
        <StatsLine minutes={lesson.minutes} pages={lesson.cards.length} questions={lesson.questionCount} />
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
        {finished ? (
          <>
            <Link href={`${base}/results?attempt=${finished}`} className={buttonClass("primary")}>
              See your result
            </Link>
            <Link href={`${base}/pages/1`} className={buttonClass("quiet")}>
              Read the lesson again
            </Link>
            <Link href={`${base}/quiz`} className={buttonClass("quiet")}>
              Practice the quiz
            </Link>
          </>
        ) : (
          <Link href={`${base}/pages/1`} className={buttonClass("primary")}>
            Start lesson
          </Link>
        )}
      </div>

      <h2 className="mt-16 font-serif text-[1.375rem] font-semibold">What you will learn</h2>
      <ol lang={lesson.language} className="mt-4 gap-x-12 sm:columns-2">
        {lesson.cards.map((card, i) => (
          <li key={card.id} className="break-inside-avoid">
            <Link
              href={`${base}/pages/${i + 1}`}
              className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-baseline rounded-[2px] py-2.5 text-[1.0625rem] hover:bg-paper-raised"
            >
              <span className="font-serif tabular-nums text-ink-soft">{pad(i + 1)}</span>
              <span>{card.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </PageShell>
  );
}
```

```tsx
// src/app/learn/lessons/[id]/pages/[n]/page.tsx
import { redirect } from "next/navigation";
import { AppHeader } from "@/app-components/AppHeader";
import { LessonReader } from "@/app-components/LessonReader";
import { ProgressBar } from "@/components/ProgressBar";
import { parsePageParam } from "@/lib/pages";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { orNotFound } from "@/server/guard";
import { getStudentLesson } from "@/server/student";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; n: string }>;
  searchParams: Promise<{ review?: string; attempt?: string }>;
}) {
  const user = await requireUser("student");
  const [{ id, n }, { review, attempt }] = await Promise.all([params, searchParams]);
  const lesson = orNotFound(() => getStudentLesson(getDb(), user, parseId(id)));
  const page = parsePageParam(n, lesson.cards.length);
  if (page === null) redirect(`/learn/lessons/${lesson.id}/pages/1`);
  const reviewAttempt = review === "1" && Number.isInteger(Number(attempt)) ? Number(attempt) : null;
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={user} />
      <ProgressBar value={page / lesson.cards.length} label="Lesson progress" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-14 pt-10 sm:px-8 sm:pt-14">
        <LessonReader
          lessonId={lesson.id}
          cards={lesson.cards}
          page={page}
          language={lesson.language}
          reviewAttempt={reviewAttempt}
        />
      </main>
    </div>
  );
}
```

```tsx
// src/app-components/LessonReader.tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/Button";
import { LessonPageView } from "@/components/LessonPageView";
import type { Card } from "@/lib/lesson-schema";
import { cardSpeechText } from "@/lib/speech";
import { ReadAloudButton } from "./ReadAloudButton";
import { useAnimatedValue } from "./useAnimatedValue";
import { useKey } from "./useKey";

const SWIPE_THRESHOLD_PX = 60;

type Props = { lessonId: number; cards: Card[]; page: number; language: string; reviewAttempt: number | null };

export function LessonReader({ lessonId, cards, page, language, reviewAttempt }: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const pointerStart = useRef<number | null>(null);

  const total = cards.length;
  const base = `/learn/lessons/${lessonId}`;
  const review = reviewAttempt !== null;
  const nextHref = page < total ? `${base}/pages/${page + 1}` : `${base}/quiz`;
  const backHref = page > 1 ? `${base}/pages/${page - 1}` : null;
  const canNavigate = !review;

  useKey("ArrowRight", () => router.push(nextHref), canNavigate);
  useKey("ArrowLeft", () => backHref && router.push(backHref), canNavigate && backHref !== null);

  // Reaching the last page counts as having read the lesson.
  useEffect(() => {
    if (!review && page === total) void fetch(`/api/learn/lessons/${lessonId}/read`, { method: "POST" }).catch(() => {});
  }, [review, page, total, lessonId]);

  const card = cards[page - 1];

  return (
    <div
      className="@container"
      onPointerDown={(e) => {
        if (e.pointerType === "touch") pointerStart.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (pointerStart.current === null || !canNavigate) return;
        const dx = e.clientX - pointerStart.current;
        pointerStart.current = null;
        if (dx < -SWIPE_THRESHOLD_PX) router.push(nextHref);
        if (dx > SWIPE_THRESHOLD_PX && backHref) router.push(backHref);
      }}
    >
      {review && <p className="mb-8 text-[1.0625rem] text-ink-soft @2xl:pl-32">You missed a question about this page.</p>}
      <motion.div
        key={page}
        lang={language}
        initial={reduceMotion ? false : { opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <PageWithSwipe card={card} pageNumber={page} totalPages={total} />
      </motion.div>

      <nav aria-label="Lesson pages" className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 @2xl:pl-32">
        {review ? (
          <Link href={`${base}/results?attempt=${reviewAttempt}`} className={buttonClass("primary")}>
            Back to results
          </Link>
        ) : (
          <Link href={nextHref} className={buttonClass("primary")}>
            {page < total ? "Next page" : "Finish lesson"}
          </Link>
        )}
        {!review && backHref && (
          <Link href={backHref} className={buttonClass("quiet")}>
            Back
          </Link>
        )}
        <ReadAloudButton key={page} text={cardSpeechText(card)} lang={language} />
      </nav>
    </div>
  );
}

function PageWithSwipe({ card, pageNumber, totalPages }: { card: Card; pageNumber: number; totalPages: number }) {
  const swipe = useAnimatedValue(1, 650, 250);
  return <LessonPageView card={card} pageNumber={pageNumber} totalPages={totalPages} highlightProgress={swipe} />;
}
```

- [ ] **Step 4: The quiz screen**

```tsx
// src/app/learn/lessons/[id]/quiz/page.tsx
import { AppHeader } from "@/app-components/AppHeader";
import { QuizRunner } from "@/app-components/QuizRunner";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { orNotFound } from "@/server/guard";
import { getStudentLesson } from "@/server/student";

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ retry?: string }>;
}) {
  const user = await requireUser("student");
  const [{ id }, { retry }] = await Promise.all([params, searchParams]);
  const lesson = orNotFound(() => getStudentLesson(getDb(), user, parseId(id)));
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={user} />
      <QuizRunner lessonId={lesson.id} questionCount={lesson.questionCount} retry={retry === "1"} language={lesson.language} />
    </div>
  );
}
```

```tsx
// src/app-components/QuizRunner.tsx
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/Button";
import { HighlightSwipe } from "@/components/HighlightSwipe";
import { ProgressBar } from "@/components/ProgressBar";
import { QuizQuestionView } from "@/components/QuizQuestionView";
import type { AttemptView, Feedback } from "@/lib/quiz-types";
import { useAnimatedValue } from "./useAnimatedValue";
import { useKey } from "./useKey";

type Props = { lessonId: number; questionCount: number; retry: boolean; language: string };

const FAILED = "Something went wrong. Try again.";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.message ?? FAILED);
  return data as T;
}

export function QuizRunner({ lessonId, questionCount, retry, language }: Props) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const questions = attempt?.questions ?? [];
  const answeredCount = questions.filter((q) => feedback[q.id]).length;
  const revealedIndex = questions.findIndex((q) => q.id === revealedId);
  // A reload resumes at the first question without an answer.
  const currentIndex = revealedIndex >= 0 ? revealedIndex : questions.findIndex((q) => !feedback[q.id]);
  const current = currentIndex >= 0 ? questions[currentIndex] : null;
  const isLast = revealedId !== null && answeredCount >= questions.length;
  const resultsHref = attempt ? `/learn/lessons/${lessonId}/results?attempt=${attempt.attemptId}` : "";

  async function run(job: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      await job();
    } catch (e) {
      setError(e instanceof Error ? e.message : FAILED);
    } finally {
      busy.current = false;
    }
  }

  const start = () =>
    run(async () => {
      const data = await post<{ attempt: AttemptView }>(`/api/learn/lessons/${lessonId}/attempts`, { mode: retry ? "retry" : "start" });
      setAttempt(data.attempt);
      setFeedback(data.attempt.answered);
    });

  const choose = (index: number) =>
    run(async () => {
      if (!attempt || !current || revealedId) return;
      const data = await post<{ feedback: Feedback }>(`/api/learn/attempts/${attempt.attemptId}/answers`, { qid: current.id, index });
      setFeedback((f) => ({ ...f, [current.id]: data.feedback }));
      setRevealedId(current.id);
    });

  function next() {
    if (!revealedId) return;
    if (isLast) router.push(resultsHref);
    else setRevealedId(null);
  }

  const intro = attempt === null;
  const answering = current !== null && revealedId === null && !intro;
  useKey("1", () => void choose(0), answering);
  useKey("2", () => void choose(1), answering);
  useKey("3", () => void choose(2), answering);
  useKey("4", () => void choose(3), answering);
  useKey("Enter", () => (intro ? void start() : next()), intro || revealedId !== null);
  useKey("ArrowRight", next, revealedId !== null);

  return (
    <>
      <ProgressBar value={intro || questions.length === 0 ? 0 : answeredCount / questions.length} label="Quiz progress" />
      <main lang={language} className="mx-auto w-full max-w-6xl flex-1 px-5 pb-14 pt-10 sm:px-8 sm:pt-16">
        {intro ? (
          <QuizIntro count={questionCount} retry={retry} onStart={() => void start()} />
        ) : current === null ? (
          <Button onClick={() => router.push(resultsHref)}>See results</Button>
        ) : (
          <>
            <QuizQuestionView
              key={current.id}
              question={{
                id: current.id,
                question: current.question,
                options: current.options,
                cardId: "",
                correctIndex: feedback[current.id]?.correctIndex ?? -1,
                explanation: feedback[current.id]?.explanation ?? "",
              }}
              number={currentIndex + 1}
              total={questions.length}
              selectedIndex={feedback[current.id]?.chosenIndex ?? null}
              revealed={revealedId === current.id}
              onSelect={(i) => void choose(i)}
            />
            {revealedId && (
              <Button className="mt-8" onClick={next} autoFocus>
                {isLast ? "See results" : "Next question"}
              </Button>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="mt-6 text-incorrect">
            {error}
          </p>
        )}
      </main>
    </>
  );
}

function QuizIntro({ count, retry, onStart }: { count: number; retry: boolean; onStart: () => void }) {
  const swipe = useAnimatedValue(1, 800, 200);
  return (
    <section className="max-w-2xl">
      <h1 className="font-serif text-[clamp(2.5rem,6vw,4.25rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
        <HighlightSwipe progress={swipe}>{retry ? "Second try" : "Quiz unlocked"}</HighlightSwipe>
      </h1>
      <p className="mt-6 font-serif text-[1.375rem] leading-relaxed">
        {retry
          ? "The questions you missed. Take another shot. This one is practice."
          : `${count} questions. Every wrong answer links back to the page that teaches it.`}
      </p>
      <Button className="mt-9" onClick={onStart}>
        Start quiz
      </Button>
      <p className="mt-4 text-[0.9375rem] text-ink-soft">Tip: answer with the 1 to 4 keys, then press Enter.</p>
    </section>
  );
}
```

- [ ] **Step 5: The results screen**

```tsx
// src/app-components/ScoreCounter.tsx
"use client";

import { ScoreView } from "@/components/ScoreView";
import { useAnimatedValue } from "./useAnimatedValue";

export function ScoreCounter({ correct, total, verdict }: { correct: number; total: number; verdict: string }) {
  const shown = Math.round(useAnimatedValue(correct, 900, 150));
  return <ScoreView correct={correct} total={total} shown={shown} verdict={verdict} />;
}
```

```tsx
// src/app/learn/lessons/[id]/results/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/app-components/PageShell";
import { ScoreCounter } from "@/app-components/ScoreCounter";
import { buttonClass } from "@/components/Button";
import type { AttemptResult } from "@/lib/quiz-types";
import { verdict } from "@/lib/scoring";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { AccessError, InputError, parseId } from "@/server/errors";
import { orNotFound } from "@/server/guard";
import { getAttemptResult, latestFinishedAttemptId } from "@/server/quiz";
import { getStudentLesson } from "@/server/student";

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const user = await requireUser("student");
  const [{ id }, { attempt }] = await Promise.all([params, searchParams]);
  const lesson = orNotFound(() => getStudentLesson(getDb(), user, parseId(id)));
  const base = `/learn/lessons/${lesson.id}`;
  const attemptId = attempt ? Number(attempt) : latestFinishedAttemptId(getDb(), user.id, lesson.id);
  if (!attemptId) redirect(`${base}/quiz`);

  let result: AttemptResult;
  try {
    result = getAttemptResult(getDb(), user, attemptId);
  } catch (error) {
    if (error instanceof InputError) redirect(`${base}/quiz`);
    if (error instanceof AccessError) notFound();
    throw error;
  }
  if (result.lessonId !== lesson.id) notFound();

  return (
    <PageShell user={user}>
      <p lang={lesson.language} className="mb-4 text-[1.0625rem] text-ink-soft">
        {result.lessonTitle} quiz
      </p>
      <ScoreCounter correct={result.correct} total={result.total} verdict={verdict(result.correct, result.total)} />
      {!result.isFirst && (
        <p className="mt-4 text-ink-soft">This was practice. Your teacher sees your first attempt.</p>
      )}

      {result.missed.length > 0 && (
        <section aria-labelledby="review-title" lang={lesson.language} className="mt-14 max-w-3xl">
          <h2 id="review-title" className="font-serif text-[1.625rem] font-semibold">
            Pages to review
          </h2>
          <ul className="mt-6 grid gap-8">
            {result.missed.map((m) => (
              <li key={m.id}>
                <p className="font-serif text-[1.25rem] leading-snug">{m.question}</p>
                <p className="mt-2">
                  <span className="text-incorrect">Your answer:</span> {m.yourAnswer}
                </p>
                <p className="mt-1">
                  <span className="text-correct">Right answer:</span> {m.rightAnswer}
                </p>
                {m.pageNumber !== null && (
                  <Link
                    href={`${base}/pages/${m.pageNumber}?review=1&attempt=${result.attemptId}`}
                    className={buttonClass("quiet", "mt-3")}
                  >
                    Review page {m.pageNumber}: {m.pageTitle}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4">
        {result.missed.length > 0 && (
          <Link href={`${base}/quiz?retry=1`} className={buttonClass("primary")}>
            Retry missed questions
          </Link>
        )}
        <Link href={`/learn/${lesson.subject}`} className={buttonClass(result.missed.length > 0 ? "quiet" : "primary")}>
          Back to {lesson.className}
        </Link>
      </div>
    </PageShell>
  );
}
```

- [ ] **Step 6: End-to-end test**

Append to `e2e/helpers.ts`:

```ts
/** Teacher: create a Biology class, upload the sample deck (fake AI) and publish it. */
export async function publishSampleLesson(page: Page, className = "8A Biology") {
  const { code, url } = await createClass(page, "biology", className);
  await page.locator('input[type="file"]').setInputFiles("samples/pdf/photosynthesis.pdf");
  await expect(page).toHaveURL(/\/teacher\/lessons\/\d+$/, { timeout: 30_000 });
  const lessonId = Number(page.url().match(/lessons\/(\d+)/)![1]);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("can open this lesson")).toBeVisible();
  return { code, classUrl: url, lessonId };
}
```

```ts
// e2e/classroom.spec.ts
import { expect, test, type Page } from "@playwright/test";
import demo from "../src/demo/photosynthesis.json" with { type: "json" };
import { joinClass, publishSampleLesson, signupStudent, signupTeacher } from "./helpers";

const lesson = demo.lesson;
const total = lesson.quiz.length;

/** Reads the shown question, finds it in the sample lesson, and answers right or wrong. */
async function answerCurrentQuestion(page: Page, right: boolean) {
  const text = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  const question = lesson.quiz.find((q) => q.question === text)!;
  const correctText = question.options[question.correctIndex];
  const options = page.locator("ol li button");
  const rightOption = options.filter({ has: page.getByText(correctText, { exact: true }) });
  if (right) await rightOption.click();
  else await options.filter({ hasNot: page.getByText(correctText, { exact: true }) }).first().click();
  await expect(page.getByText(right ? "Right." : "Not quite.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Next question|See results/ }).click();
}

test("a student reads a published lesson, takes the private quiz and never receives the answer key", async ({ page, browser }) => {
  await signupTeacher(page);
  const { code } = await publishSampleLesson(page);

  const student = await (await browser.newContext()).newPage();
  await signupStudent(student, "Mira");
  await joinClass(student, code);
  await expect(student).toHaveURL(/\/learn\/biology$/);
  await student.getByRole("link", { name: new RegExp(lesson.title) }).click();
  await expect(student.getByText(`${lesson.cards.length} pages, ${total} questions`)).toBeVisible();

  await student.getByRole("link", { name: "Start lesson" }).click();
  for (let n = 1; n < lesson.cards.length; n++) {
    await expect(student).toHaveURL(new RegExp(`/pages/${n}$`));
    await expect(student.getByRole("heading", { level: 1 })).toHaveText(lesson.cards[n - 1].title);
    await student.getByRole("link", { name: "Next page" }).click();
  }
  await student.getByRole("link", { name: "Finish lesson" }).click();

  await expect(student.getByRole("heading", { name: "Quiz unlocked" })).toBeVisible();
  const started = student.waitForResponse((r) => /\/api\/learn\/lessons\/\d+\/attempts$/.test(r.url()));
  await student.getByRole("button", { name: "Start quiz" }).click();
  const body = await (await started).text();
  expect(body).not.toContain("correctIndex");
  expect(body).not.toContain("explanation");
  await expect(student.getByText(`Question 1 of ${total}`)).toBeVisible();

  for (let i = 0; i < total; i++) await answerCurrentQuestion(student, i !== 0);
  await expect(student).toHaveURL(/\/results\?attempt=\d+$/);
  await expect(student.getByText(`${total - 1} / ${total}`)).toBeVisible();

  await student.getByRole("link", { name: /^Review page \d+/ }).click();
  await expect(student.getByText("You missed a question about this page.")).toBeVisible();
  await student.getByRole("link", { name: "Back to results" }).click();
  await expect(student).toHaveURL(/\/results\?attempt=\d+$/);

  await student.getByRole("link", { name: "Retry missed questions" }).click();
  await expect(student.getByRole("heading", { name: "Second try" })).toBeVisible();
  await student.getByRole("button", { name: "Start quiz" }).click();
  await expect(student.getByText("Question 1 of 1")).toBeVisible();
  await answerCurrentQuestion(student, true);
  await expect(student.getByText("1 / 1")).toBeVisible();
  await expect(student.getByText("This was practice.")).toBeVisible();

  await student.goto("/learn");
  await expect(student.getByRole("link", { name: /Biology/ })).toContainText("1 of 1 done");
  await student.goto("/learn/biology");
  await expect(student.getByRole("link", { name: new RegExp(lesson.title) })).toContainText(`${total - 1} / ${total}`);
});

test("a student outside the class gets nothing from the lesson pages or the quiz API", async ({ page, browser }) => {
  await signupTeacher(page);
  const { lessonId } = await publishSampleLesson(page);

  const outsider = await (await browser.newContext()).newPage();
  await signupStudent(outsider, "Dren");
  expect((await outsider.goto(`/learn/lessons/${lessonId}`))?.status()).toBe(404);
  expect((await outsider.goto(`/learn/lessons/${lessonId}/pages/1`))?.status()).toBe(404);
  const attempt = await outsider.request.post(`/api/learn/lessons/${lessonId}/attempts`, { data: { mode: "start" } });
  expect(attempt.status()).toBe(404);
  const answer = await outsider.request.post(`/api/learn/attempts/1/answers`, { data: { qid: "q1", index: 0 } });
  expect(answer.status()).toBe(404);
});
```

- [ ] **Step 7: Verify the slice**

Run: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run test:e2e`.
Expected: all pass. If `/learn/lessons/[id]/quiz` or other pages fail type checking on `params`, confirm each page types `params` as a `Promise`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: student lesson reader, private quiz and results screens" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

# Slice 5: real results, demo data, cleanup

### Task 14: Class report from real attempts

**Files:**
- Create: `src/lib/class-report.ts`, `src/server/results.ts`
- Test: `src/lib/class-report.test.ts`, `src/server/results.test.ts`

**Interfaces:**
- Consumes: `Card`, `getTeacherLesson`, `StoredLesson`, `SessionUser`, `Db`.
- Produces (`src/lib/class-report.ts`):
  - `STRUGGLE_THRESHOLD = 60`; `TopicMastery = { cardId; pageNumber; title; percent; struggling }`; `StudentStatus = "not-started" | "in-progress" | "finished"`; `ReportStudent = { name; status; correct: Record<string, boolean> }`; `StudentRow = { name; status; correctCount; total; percent: number | null; weakestTitle: string | null }`; `ClassReport = { enrolled; finished; classAverage; topics; weakest; insight; action; rows }`.
  - `buildClassReport({ cards, questions: { id; cardId }[], students }): ClassReport | null` (null when nobody has finished or there are no questions); `insightParts(report: Pick<ClassReport, "insight" | "weakest">): { before; highlight; after }`.
- Produces (`src/server/results.ts`): `getLessonResults(db, teacher, lessonId): { stored: StoredLesson; enrolled: number; report: ClassReport | null }` (only first attempts count); `type Attention = { lessonId; lessonTitle; classId; pageNumber; pageTitle }`; `listAttention(db, teacher): Attention[]` (published lessons whose weakest page is under the threshold).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/class-report.test.ts
import { describe, expect, it } from "vitest";
import { buildClassReport, insightParts, type ReportStudent } from "./class-report";

const card = (id: string, title: string) => ({ id, title, explanation: "e", keyPoints: ["k"], rememberThis: "r" });
const cards = [card("c1", "Topic 1"), card("c2", "Topic 2"), card("c3", "Topic 3")];
const questions = [
  { id: "q1", cardId: "c1" },
  { id: "q2", cardId: "c1" },
  { id: "q3", cardId: "c2" },
  { id: "q4", cardId: "c3" },
];
const student = (name: string, status: ReportStudent["status"], correct: Record<string, boolean>): ReportStudent => ({ name, status, correct });

const classOfFive = [
  student("Ana", "finished", { q1: true, q2: true, q3: true, q4: true }),
  student("Bora", "finished", { q1: true, q2: false, q3: false, q4: true }),
  student("Cena", "finished", { q1: true, q2: true, q3: false, q4: false }),
  student("Dren", "in-progress", { q1: true }),
  student("Era", "not-started", {}),
];

describe("buildClassReport", () => {
  it("averages finished students per page and finds the weakest", () => {
    const report = buildClassReport({ cards, questions, students: classOfFive })!;
    expect(report.topics).toEqual([
      { cardId: "c1", pageNumber: 1, title: "Topic 1", percent: 83, struggling: 1 },
      { cardId: "c2", pageNumber: 2, title: "Topic 2", percent: 33, struggling: 2 },
      { cardId: "c3", pageNumber: 3, title: "Topic 3", percent: 67, struggling: 1 },
    ]);
    expect(report.weakest.cardId).toBe("c2");
    expect(report).toMatchObject({
      enrolled: 5,
      finished: 3,
      classAverage: 67,
      insight: "2 of 3 students struggled with Topic 2.",
      action: "Re-teach page 2.",
    });
  });

  it("lists every student: finished ones who need help first, then in progress, then not started", () => {
    const { rows } = buildClassReport({ cards, questions, students: classOfFive })!;
    expect(rows.map((r) => [r.name, r.status, r.percent, r.weakestTitle])).toEqual([
      ["Bora", "finished", 50, "Topic 2"],
      ["Cena", "finished", 50, "Topic 2"],
      ["Ana", "finished", 100, null],
      ["Dren", "in-progress", null, null],
      ["Era", "not-started", null, null],
    ]);
    expect(rows[3]).toMatchObject({ correctCount: 1, total: 4 });
  });

  it("returns null while nobody has finished, with no students, or with no questions", () => {
    expect(buildClassReport({ cards, questions, students: [] })).toBeNull();
    expect(buildClassReport({ cards, questions, students: [student("Dren", "in-progress", { q1: true }), student("Era", "not-started", {})] })).toBeNull();
    expect(buildClassReport({ cards, questions: [], students: [student("Ana", "finished", {})] })).toBeNull();
  });

  it("says the class is solid when every page is above the threshold", () => {
    const report = buildClassReport({ cards, questions, students: [student("Ana", "finished", { q1: true, q2: true, q3: true, q4: true })] })!;
    expect(report.insight).toBe("The class is solid on every topic. Lowest: Topic 1 at 100%.");
  });

  it("uses the singular for one student", () => {
    const report = buildClassReport({ cards, questions, students: [student("Ana", "finished", { q1: true, q2: true, q3: false, q4: true })] })!;
    expect(report.insight).toBe("1 of 1 student struggled with Topic 2.");
  });

  it("skips pages that have no questions but keeps page numbers by position", () => {
    const withIntro = [card("c1", "Topic 1"), card("cx", "Intro"), card("c2", "Topic 2")];
    const qs = [
      { id: "q1", cardId: "c1" },
      { id: "q3", cardId: "c2" },
    ];
    const report = buildClassReport({ cards: withIntro, questions: qs, students: [student("Ana", "finished", { q1: true, q3: false })] })!;
    expect(report.topics.map((t) => [t.pageNumber, t.title])).toEqual([
      [1, "Topic 1"],
      [3, "Topic 2"],
    ]);
  });
});

describe("insightParts", () => {
  it("splits the sentence around the weakest title so it can be highlighted", () => {
    const report = buildClassReport({ cards, questions, students: classOfFive })!;
    expect(insightParts(report)).toEqual({ before: "2 of 3 students struggled with ", highlight: "Topic 2", after: "." });
  });
});
```

```ts
// src/server/results.test.ts
import { describe, expect, it } from "vitest";
import { makeLesson } from "../lib/test-fixtures";
import { createStudent, createTeacher } from "./accounts";
import { createClass, joinClass } from "./classes";
import { openDb, type Db } from "./db";
import { AccessError } from "./errors";
import { publishLesson, saveDraftLesson } from "./lessons";
import { getLessonResults, listAttention } from "./results";

type Raw = { first: boolean; answers: Record<string, number>; finished: boolean };

function attempt(db: Db, lessonId: number, studentId: number, a: Raw) {
  db.prepare(
    "INSERT INTO attempts (lesson_id, student_id, is_first, question_ids, shuffles, answers, total, score, started_at, finished_at) VALUES (?, ?, ?, '[]', '{}', ?, 5, ?, 0, ?)",
  ).run(lessonId, studentId, a.first ? 1 : 0, JSON.stringify(a.answers), a.finished ? 0 : null, a.finished ? 1 : null);
}

const allRight = { q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 };

async function world() {
  const db = openDb(":memory:");
  const teacher = await createTeacher(db, { name: "Ms Hoxha", email: "t@x.co", password: "password1" });
  const other = await createTeacher(db, { name: "Mr Berisha", email: "o@x.co", password: "password1" });
  const cls = createClass(db, teacher, { subject: "biology", name: "8A Biology" });
  const lessonId = saveDraftLesson(db, teacher, cls.id, makeLesson({ title: "Cells" }), 5);
  publishLesson(db, teacher, lessonId);
  const join = async (name: string) => {
    const { user } = await createStudent(db, { name, password: "password1" });
    joinClass(db, user, cls.joinCode);
    return user;
  };
  return { db, teacher, other, cls, lessonId, join };
}

describe("getLessonResults", () => {
  it("uses only first attempts and reports who finished", async () => {
    const { db, teacher, lessonId, join } = await world();
    const [ana, bora, cena, dren] = [await join("Ana"), await join("Bora"), await join("Cena"), await join("Dren")];
    await join("Era");
    attempt(db, lessonId, ana.id, { first: true, answers: allRight, finished: true });
    attempt(db, lessonId, bora.id, { first: true, answers: { ...allRight, q2: 1 }, finished: true });
    attempt(db, lessonId, cena.id, { first: true, answers: { ...allRight, q2: 1, q3: 1 }, finished: true });
    attempt(db, lessonId, dren.id, { first: true, answers: { q1: 0 }, finished: false });
    // Practice attempts never count, even when they are terrible.
    attempt(db, lessonId, ana.id, { first: false, answers: { q1: 1, q2: 1, q3: 1, q4: 1, q5: 1 }, finished: true });

    const { enrolled, report } = getLessonResults(db, teacher, lessonId);
    expect(enrolled).toBe(5);
    expect(report).toMatchObject({ finished: 3, insight: "2 of 3 students struggled with Topic 2.", action: "Re-teach page 2." });
    expect(report!.rows.map((r) => [r.name, r.status])).toEqual([
      ["Cena", "finished"],
      ["Bora", "finished"],
      ["Ana", "finished"],
      ["Dren", "in-progress"],
      ["Era", "not-started"],
    ]);
  });

  it("returns no report for a class with no students and for a lesson nobody finished", async () => {
    const { db, teacher, lessonId, join } = await world();
    expect(getLessonResults(db, teacher, lessonId)).toMatchObject({ enrolled: 0, report: null });
    const mira = await join("Mira");
    attempt(db, lessonId, mira.id, { first: true, answers: { q1: 0 }, finished: false });
    expect(getLessonResults(db, teacher, lessonId)).toMatchObject({ enrolled: 1, report: null });
  });

  it("is private to the teacher who owns the class", async () => {
    const { db, other, lessonId } = await world();
    expect(() => getLessonResults(db, other, lessonId)).toThrow(AccessError);
  });
});

describe("listAttention", () => {
  it("flags a published lesson whose weakest page is under 60 percent", async () => {
    const { db, teacher, other, cls, lessonId, join } = await world();
    expect(listAttention(db, teacher)).toEqual([]);
    const ana = await join("Ana");
    const bora = await join("Bora");
    attempt(db, lessonId, ana.id, { first: true, answers: { ...allRight, q3: 1 }, finished: true });
    attempt(db, lessonId, bora.id, { first: true, answers: { ...allRight, q3: 1 }, finished: true });
    expect(listAttention(db, teacher)).toEqual([
      { lessonId, lessonTitle: "Cells", classId: cls.id, pageNumber: 3, pageTitle: "Topic 3" },
    ]);
    expect(listAttention(db, other)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/class-report.test.ts src/server/results.test.ts`
Expected: FAIL, cannot resolve `./class-report` and `./results`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/class-report.ts
import type { Card } from "./lesson-schema";

export const STRUGGLE_THRESHOLD = 60;

export type TopicMastery = { cardId: string; pageNumber: number; title: string; percent: number; struggling: number };
export type StudentStatus = "not-started" | "in-progress" | "finished";
export type ReportStudent = { name: string; status: StudentStatus; correct: Record<string, boolean> };
export type StudentRow = {
  name: string;
  status: StudentStatus;
  correctCount: number;
  total: number;
  percent: number | null;
  weakestTitle: string | null;
};
export type ClassReport = {
  enrolled: number;
  finished: number;
  classAverage: number;
  topics: TopicMastery[];
  weakest: TopicMastery;
  insight: string;
  action: string;
  rows: StudentRow[];
};
export type ReportInput = { cards: Card[]; questions: { id: string; cardId: string }[]; students: ReportStudent[] };

const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const bare = (title: string) => title.replace(/[.?!:]+$/, "");
const RANK: Record<ReportStudent["status"], number> = { finished: 0, "in-progress": 1, "not-started": 2 };

/** The insight sentence split around the weakest topic's title, so the title can be highlighted in place. */
export function insightParts(report: Pick<ClassReport, "insight" | "weakest">): { before: string; highlight: string; after: string } {
  const highlight = bare(report.weakest.title);
  const at = report.insight.indexOf(highlight);
  if (at === -1) return { before: report.insight, highlight: "", after: "" };
  return { before: report.insight.slice(0, at), highlight, after: report.insight.slice(at + highlight.length) };
}

/** Only finished students feed the page averages. Returns null when there is nothing to average. */
export function buildClassReport({ cards, questions, students }: ReportInput): ClassReport | null {
  const finished = students.filter((s) => s.status === "finished");
  if (finished.length === 0) return null;

  const byCard = new Map<string, string[]>();
  for (const q of questions) byCard.set(q.cardId, [...(byCard.get(q.cardId) ?? []), q.id]);
  const cardPercent = (s: ReportStudent, cardId: string): number | null => {
    const ids = byCard.get(cardId);
    if (!ids?.length) return null;
    return (ids.filter((id) => s.correct[id]).length / ids.length) * 100;
  };

  const topics: TopicMastery[] = [];
  cards.forEach((card, i) => {
    const values = finished.map((s) => cardPercent(s, card.id)).filter((v): v is number => v !== null);
    if (values.length === 0) return;
    topics.push({
      cardId: card.id,
      pageNumber: i + 1,
      title: card.title,
      percent: Math.round(average(values)),
      struggling: values.filter((v) => v < STRUGGLE_THRESHOLD).length,
    });
  });
  if (topics.length === 0) return null;
  const weakest = topics.reduce((low, t) => (t.percent < low.percent ? t : low));

  const rows: StudentRow[] = students.map((s) => {
    const correctCount = questions.filter((q) => s.correct[q.id]).length;
    const isFinished = s.status === "finished";
    let weakestTitle: string | null = null;
    if (isFinished) {
      let low = 100;
      for (const card of cards) {
        const value = cardPercent(s, card.id);
        if (value !== null && value < low) {
          low = value;
          weakestTitle = card.title;
        }
      }
    }
    return {
      name: s.name,
      status: s.status,
      correctCount,
      total: questions.length,
      percent: isFinished ? Math.round((correctCount / questions.length) * 100) : null,
      weakestTitle,
    };
  });
  rows.sort((a, b) => RANK[a.status] - RANK[b.status] || (a.percent ?? 0) - (b.percent ?? 0) || a.name.localeCompare(b.name));

  const n = finished.length;
  const insight =
    weakest.percent < STRUGGLE_THRESHOLD
      ? `${weakest.struggling} of ${n} ${n === 1 ? "student" : "students"} struggled with ${bare(weakest.title)}.`
      : `The class is solid on every topic. Lowest: ${bare(weakest.title)} at ${weakest.percent}%.`;

  return {
    enrolled: students.length,
    finished: n,
    classAverage: Math.round(average(rows.filter((r) => r.percent !== null).map((r) => r.percent!))),
    topics,
    weakest,
    insight,
    action: `Re-teach page ${weakest.pageNumber}.`,
    rows,
  };
}
```

```ts
// src/server/results.ts
import { buildClassReport, STRUGGLE_THRESHOLD, type ClassReport, type ReportStudent } from "../lib/class-report";
import type { SessionUser } from "./accounts";
import type { Db } from "./db";
import { getTeacherLesson, type StoredLesson } from "./lessons";

export type LessonResults = { stored: StoredLesson; enrolled: number; report: ClassReport | null };

/** Only each student's first attempt counts. Practice attempts are never read here. */
export function getLessonResults(db: Db, teacher: SessionUser, lessonId: number): LessonResults {
  const stored = getTeacherLesson(db, teacher, lessonId);
  const students = db
    .prepare("SELECT u.id, u.name FROM enrollments e JOIN users u ON u.id = e.student_id WHERE e.class_id = ? ORDER BY u.name, u.id")
    .all(stored.classId) as { id: number; name: string }[];
  const firstAttempt = db.prepare("SELECT answers, finished_at FROM attempts WHERE lesson_id = ? AND student_id = ? AND is_first = 1");
  const { quiz, cards } = stored.lesson;

  const reportStudents: ReportStudent[] = students.map((s) => {
    const row = firstAttempt.get(stored.id, s.id) as { answers: string; finished_at: number | null } | undefined;
    if (!row) return { name: s.name, status: "not-started", correct: {} };
    const answers = JSON.parse(row.answers) as Record<string, number>;
    const correct: Record<string, boolean> = {};
    for (const q of quiz) if (answers[q.id] !== undefined) correct[q.id] = answers[q.id] === q.correctIndex;
    return { name: s.name, status: row.finished_at === null ? "in-progress" : "finished", correct };
  });

  return {
    stored,
    enrolled: students.length,
    report: buildClassReport({ cards, questions: quiz.map((q) => ({ id: q.id, cardId: q.cardId })), students: reportStudents }),
  };
}

export type Attention = { lessonId: number; lessonTitle: string; classId: number; pageNumber: number; pageTitle: string };

export function listAttention(db: Db, teacher: SessionUser): Attention[] {
  const lessons = db
    .prepare(
      `SELECT l.id FROM lessons l JOIN classes c ON c.id = l.class_id
       WHERE c.teacher_id = ? AND l.status = 'published' ORDER BY l.published_at DESC, l.id DESC`,
    )
    .all(teacher.id) as { id: number }[];
  return lessons.flatMap(({ id }) => {
    const { stored, report } = getLessonResults(db, teacher, id);
    if (!report || report.weakest.percent >= STRUGGLE_THRESHOLD) return [];
    return [
      {
        lessonId: id,
        lessonTitle: stored.lesson.title,
        classId: stored.classId,
        pageNumber: report.weakest.pageNumber,
        pageTitle: report.weakest.title,
      },
    ];
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/class-report.test.ts src/server/results.test.ts` then `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/class-report.ts src/lib/class-report.test.ts src/server/results.ts src/server/results.test.ts
git commit -m "feat: class report computed from real first attempts" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Teacher results screen

**Files:**
- Create: `src/app-components/ResultsView.tsx`, `src/app/teacher/lessons/[id]/results/page.tsx`
- Modify: `src/components/MasteryBars.tsx`, `src/app/teacher/page.tsx`, `src/app/teacher/lessons/[id]/page.tsx`, `e2e/classroom.spec.ts`

**Interfaces:**
- Consumes: `getLessonResults`, `listAttention`, `ClassReport`, `insightParts`, `MasteryBars`, `HighlightSwipe`, `useAnimatedValue`.
- Produces: `<ResultsView lessonId report />`.

- [ ] **Step 1: Point `MasteryBars` at the new type**

In `src/components/MasteryBars.tsx` change the first line to `import type { TopicMastery } from "@/lib/class-report";`.

- [ ] **Step 2: The results view and page**

```tsx
// src/app-components/ResultsView.tsx
"use client";

import Link from "next/link";
import { buttonClass } from "@/components/Button";
import { HighlightSwipe } from "@/components/HighlightSwipe";
import { MasteryBars } from "@/components/MasteryBars";
import { insightParts, type ClassReport, type StudentRow } from "@/lib/class-report";
import { useAnimatedValue } from "./useAnimatedValue";

const STATUS_TEXT: Record<StudentRow["status"], string> = {
  finished: "Finished",
  "in-progress": "In progress",
  "not-started": "Not started",
};

export function ResultsView({ lessonId, report }: { lessonId: number; report: ClassReport }) {
  const grow = useAnimatedValue(1, 700, 200);
  const swipe = useAnimatedValue(1, 800, 500);
  const insight = insightParts(report);

  return (
    <>
      <section aria-labelledby="insight" className="mt-10 max-w-3xl">
        <h2 id="insight" className="sr-only">
          What to do next
        </h2>
        <p className="font-serif text-[clamp(1.5rem,3.2vw,2.25rem)] leading-snug">
          {insight.before}
          {insight.highlight && <HighlightSwipe progress={swipe}>{insight.highlight}</HighlightSwipe>}
          {insight.after}
        </p>
        <Link href={`/teacher/lessons/${lessonId}#page-${report.weakest.pageNumber}`} className={buttonClass("primary", "mt-6")}>
          Re-teach page {report.weakest.pageNumber}
        </Link>
      </section>

      <section aria-labelledby="mastery-title" className="mt-16 max-w-4xl">
        <h2 id="mastery-title" className="font-serif text-[1.5rem] font-semibold">
          Topic mastery
        </h2>
        <div className="mt-6">
          <MasteryBars topics={report.topics} grow={grow} highlightCardId={report.weakest.cardId} />
        </div>
      </section>

      <section aria-labelledby="students-title" className="mt-16 max-w-4xl">
        <h2 id="students-title" className="font-serif text-[1.5rem] font-semibold">
          Students
        </h2>
        <table className="mt-5 w-full border-separate border-spacing-y-2 text-left text-[1.0625rem]">
          <thead className="text-[0.9375rem] text-ink-soft">
            <tr>
              <th scope="col" className="pr-4 font-normal">
                Student
              </th>
              <th scope="col" className="pr-4 font-normal">
                First attempt
              </th>
              <th scope="col" className="pr-4 font-normal">
                Status
              </th>
              <th scope="col" className="font-normal">
                Weakest topic
              </th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r, i) => {
              const done = r.status === "finished";
              return (
                <tr key={i}>
                  <th scope="row" className="pr-4 font-semibold">
                    {r.name}
                  </th>
                  <td className="pr-4 tabular-nums">{done ? `${r.correctCount} / ${r.total}` : "Not yet"}</td>
                  <td className="pr-4 text-ink-soft">{STATUS_TEXT[r.status]}</td>
                  <td className="text-ink-soft">{done ? (r.weakestTitle ?? "None") : "Not yet"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <p className="mt-16 text-[0.9375rem] text-ink-soft">
        Based on {report.finished} of {report.enrolled} students who finished the quiz. Class average {report.classAverage}%.
        Only each student&apos;s first attempt counts.
      </p>
    </>
  );
}
```

```tsx
// src/app/teacher/lessons/[id]/results/page.tsx
import Link from "next/link";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { ResultsView } from "@/app-components/ResultsView";
import { buttonClass } from "@/components/Button";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { parseId } from "@/server/errors";
import { orNotFound } from "@/server/guard";
import { getLessonResults } from "@/server/results";

export default async function LessonResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("teacher");
  const { id } = await params;
  const { stored, enrolled, report } = orNotFound(() => getLessonResults(getDb(), user, parseId(id)));
  return (
    <PageShell user={user} width="max-w-4xl">
      <Link href={`/teacher/lessons/${stored.id}`} className={buttonClass("quiet", "text-[0.9375rem]")}>
        Back to the lesson
      </Link>
      <p className="mt-8 text-ink-soft">{stored.className}, results</p>
      <PageTitle>{stored.lesson.title}</PageTitle>
      {report ? (
        <ResultsView lessonId={stored.id} report={report} />
      ) : (
        <p className="mt-8 max-w-[52ch] text-[1.125rem] leading-relaxed">
          {stored.status === "draft"
            ? "This lesson is a draft. Publish it so students can take the quiz."
            : `No results yet. ${enrolled} ${enrolled === 1 ? "student has" : "students have"} joined ${stored.className}. Results appear here as soon as someone finishes the quiz.`}
        </p>
      )}
    </PageShell>
  );
}
```

- [ ] **Step 3: Link to results and show attention lines**

In `src/app/teacher/lessons/[id]/page.tsx`, replace

```tsx
          <div className="mt-6">
            <UnpublishButton lessonId={stored.id} />
          </div>
```

with

```tsx
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
            <Link href={`/teacher/lessons/${stored.id}/results`} className={buttonClass("primary")}>
              See results
            </Link>
            <UnpublishButton lessonId={stored.id} />
          </div>
```

In `src/app/teacher/page.tsx` add `import { listAttention } from "@/server/results";`, add `const attention = listAttention(getDb(), user);` after `const classes = ...`, and inside each class `<li>` after the `</Link>` add:

```tsx
                    {attention
                      .filter((a) => a.classId === c.id)
                      .map((a) => (
                        <Link
                          key={a.lessonId}
                          href={`/teacher/lessons/${a.lessonId}/results`}
                          className="block rounded-[4px] px-4 pb-2 text-incorrect hover:underline"
                        >
                          {a.lessonTitle}: page {a.pageNumber} needs re-teaching.
                        </Link>
                      ))}
```

- [ ] **Step 4: End-to-end tests**

Append to `e2e/classroom.spec.ts`:

```ts
test("the teacher sees real results from two students", async ({ page, browser }) => {
  await signupTeacher(page);
  const { code, lessonId } = await publishSampleLesson(page);

  async function studentTakesQuiz(name: string, wrongFirst: boolean) {
    const student = await (await browser.newContext()).newPage();
    await signupStudent(student, name);
    await joinClass(student, code);
    await student.goto(`/learn/lessons/${lessonId}/quiz`);
    await student.getByRole("button", { name: "Start quiz" }).click();
    await expect(student.getByText(`Question 1 of ${total}`)).toBeVisible();
    for (let i = 0; i < total; i++) await answerCurrentQuestion(student, !(wrongFirst && i === 0));
    await expect(student).toHaveURL(/\/results\?attempt=\d+$/);
  }
  await studentTakesQuiz("Mira", true);
  await studentTakesQuiz("Leon", false);

  await page.goto(`/teacher/lessons/${lessonId}/results`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(lesson.title);
  await expect(page.getByRole("row", { name: new RegExp(`Mira ${total - 1} / ${total}`) })).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(`Leon ${total} / ${total}`) })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Re-teach page \d+$/ })).toBeVisible();
  await expect(page.getByText("Based on 2 of 2 students")).toBeVisible();
});

test("the results page explains when nobody has finished", async ({ page }) => {
  await signupTeacher(page);
  const { lessonId } = await publishSampleLesson(page);
  await page.goto(`/teacher/lessons/${lessonId}/results`);
  await expect(page.getByText("No results yet.")).toBeVisible();
});

test("another teacher cannot read the results", async ({ page, browser }) => {
  await signupTeacher(page);
  const { lessonId } = await publishSampleLesson(page);
  const other = await (await browser.newContext()).newPage();
  await signupTeacher(other, "Ms Two");
  expect((await other.goto(`/teacher/lessons/${lessonId}/results`))?.status()).toBe(404);
});
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run test:e2e`.
Expected: all pass. The MVP sample dashboard (`/sample-teacher`) still works until Task 17.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: teacher results screen with real data and attention lines" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Demo data

**Files:**
- Create: `src/lib/random.ts`, `src/lib/random.test.ts`, `src/server/seed.ts`, `scripts/seed.mts`
- Test: `src/server/seed.test.ts`
- Modify: `src/lib/sample-class.ts` (move the two helpers out), `package.json`

**Interfaces:**
- Produces: `hashString(text): number`, `mulberry32(seed): () => number` in `src/lib/random.ts`; `DEMO_TEACHER = { name, email, password }`, `DEMO_STUDENT_PASSWORD`; `seedDemo(db, rng?): Promise<SeedResult | "exists">` where `SeedResult = { classCode: string; classId: number; lessonId: number; students: { name: string; login: string }[] }`; `npm run seed`.

- [ ] **Step 1: Move the random helpers**

Create `src/lib/random.ts` by moving `hashString` and `mulberry32` (the exact functions, with their doc comment) out of `src/lib/sample-class.ts`:

```ts
// src/lib/random.ts
/** FNV-1a 32-bit. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (const ch of text) {
    hash ^= ch.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

In `src/lib/sample-class.ts` delete those two function definitions and add near the top, below the existing import:

```ts
import { hashString, mulberry32 } from "./random";
export { hashString, mulberry32 };
```

(The re-export keeps `sample-class.test.ts` passing until Task 17 deletes the file.)

```ts
// src/lib/random.test.ts
import { describe, expect, it } from "vitest";
import { hashString, mulberry32 } from "./random";

describe("mulberry32", () => {
  it("repeats the same sequence for the same seed and stays in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const first = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(first);
    expect(first.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(mulberry32(43)()).not.toBe(first[0]);
  });
});

describe("hashString", () => {
  it("is stable and differs between texts", () => {
    expect(hashString("a")).toBe(hashString("a"));
    expect(hashString("a")).not.toBe(hashString("b"));
  });
});
```

- [ ] **Step 2: Write the failing seed test**

```ts
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
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/server/seed.test.ts src/lib/random.test.ts`
Expected: FAIL, cannot resolve `./seed` (the random test passes once `random.ts` exists).

- [ ] **Step 4: Write the seed module and script**

```ts
// src/server/seed.ts
import { DEFAULT_DEMO_SLUG, getDemo } from "../demo";
import { mulberry32 } from "../lib/random";
import { createStudent, createTeacher } from "./accounts";
import { createClass, joinClass } from "./classes";
import type { Db } from "./db";
import { publishLesson, saveDraftLesson } from "./lessons";

export const DEMO_TEACHER = { name: "Ms Hoxha", email: "teacher@demo.test", password: "demo-teacher-1" };
export const DEMO_STUDENT_PASSWORD = "demo-student-1";

const STUDENT_NAMES = ["Arta", "Liam", "Sofia", "Noah", "Amira", "Leon", "Mia", "Yusuf", "Elena", "Kai", "Zara", "Luka"];
const WEAK_QUESTION_INDEX = 2;

export type SeedResult = { classCode: string; classId: number; lessonId: number; students: { name: string; login: string }[] };

/**
 * One demo teacher, a Biology class, a published lesson and 12 students. Ten finished the quiz (with one
 * page most of them missed), one is part way through and one has not started.
 */
export async function seedDemo(db: Db, rng: () => number = mulberry32(2026)): Promise<SeedResult | "exists"> {
  if (db.prepare("SELECT 1 FROM users WHERE login = ?").get(DEMO_TEACHER.email)) return "exists";

  const teacher = await createTeacher(db, DEMO_TEACHER);
  const cls = createClass(db, teacher, { subject: "biology", name: "8A Biology" });
  const demo = getDemo(DEFAULT_DEMO_SLUG)!;
  const lessonId = saveDraftLesson(db, teacher, cls.id, demo.lesson, demo.slideCount);
  publishLesson(db, teacher, lessonId);

  const { quiz } = demo.lesson;
  // A page that certainly has a question, so the demo always has one visibly weak page.
  const weakCardId = quiz[Math.min(WEAK_QUESTION_INDEX, quiz.length - 1)].cardId;
  const identity = [0, 1, 2, 3];
  const insertAttempt = db.prepare(
    "INSERT INTO attempts (lesson_id, student_id, is_first, question_ids, shuffles, answers, score, total, started_at, finished_at) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)",
  );

  const students: SeedResult["students"] = [];
  for (const [i, name] of STUDENT_NAMES.entries()) {
    const { user, login } = await createStudent(db, { name, password: DEMO_STUDENT_PASSWORD });
    joinClass(db, user, cls.joinCode);
    students.push({ name, login });
    if (i === STUDENT_NAMES.length - 1) continue; // never started

    const finished = i < 10;
    const ability = 0.6 + rng() * 0.35;
    const answers: Record<string, number> = {};
    for (const q of quiz.slice(0, finished ? quiz.length : 2)) {
      const chance = ability - (q.cardId === weakCardId ? 0.4 : 0);
      answers[q.id] = rng() < chance ? q.correctIndex : (q.correctIndex + 1) % 4;
    }
    const score = quiz.filter((q) => answers[q.id] === q.correctIndex).length;
    const now = Date.now();
    insertAttempt.run(
      lessonId,
      user.id,
      JSON.stringify(quiz.map((q) => q.id)),
      JSON.stringify(Object.fromEntries(quiz.map((q) => [q.id, identity]))),
      JSON.stringify(answers),
      finished ? score : null,
      quiz.length,
      now,
      finished ? now : null,
    );
  }
  return { classCode: cls.joinCode, classId: cls.id, lessonId, students };
}
```

```ts
// scripts/seed.mts
import { getDb } from "../src/server/db";
import { DEMO_STUDENT_PASSWORD, DEMO_TEACHER, seedDemo } from "../src/server/seed";

const result = await seedDemo(getDb());
if (result === "exists") {
  console.log("The demo data is already there. Delete data/slidekick.db to start fresh.");
} else {
  console.log("Demo data ready.\n");
  console.log(`Teacher   ${DEMO_TEACHER.email}   password ${DEMO_TEACHER.password}`);
  console.log(`Class     8A Biology   code ${result.classCode}`);
  console.log(`Students  password ${DEMO_STUDENT_PASSWORD}`);
  for (const s of result.students) console.log(`          ${s.login}`);
}
```

In `package.json` add to `scripts`: `"seed": "tsx --env-file-if-exists=.env.local scripts/seed.mts"`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/server/seed.test.ts src/lib/random.test.ts` then `npm test`
Expected: PASS. If the seed test's `weakest.percent < 60` fails for this rng, lower `ability` to `0.55 + rng() * 0.3`; the demo only needs one visibly weak page.

- [ ] **Step 6: Commit**

```bash
git add src/lib/random.ts src/lib/random.test.ts src/lib/sample-class.ts src/server/seed.ts src/server/seed.test.ts scripts/seed.mts package.json
git commit -m "feat: seed script with a demo class, lesson and attempts" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 17: New home page, remove the MVP, update the docs

**Files:**
- Create: `src/app-components/HomeScreen.tsx`
- Modify: `src/app/page.tsx`, `README.md`, `docs/presentation-day-checklist.md`, `e2e/accounts.spec.ts`
- Remove: `src/app/lesson`, `src/app/quiz`, `src/app/results`, `src/app/sample-teacher`, `src/app/api/generate`, `src/app-components/{UploadScreen,QuizScreen,ResultsScreen,LessonPageScreen,TeacherScreen}.tsx`, `src/app-components/{useRequiredLesson.ts,upload-state.ts,upload-state.test.ts}`, `src/lib/{lesson-state.ts,lesson-state.test.ts,lesson-store.tsx,sample-class.ts,sample-class.test.ts}`, `e2e/demo-flow.spec.ts`

**Interfaces:**
- Produces: `<HomeScreen />` (server component, no props).

- [ ] **Step 1: The home page**

```tsx
// src/app-components/HomeScreen.tsx
import Link from "next/link";
import { buttonClass } from "@/components/Button";
import { LessonPageView } from "@/components/LessonPageView";
import { BRAND } from "@/config/brand";
import { DEFAULT_DEMO_SLUG, getDemo } from "@/demo";
import { PageShell } from "./PageShell";

const demo = getDemo(DEFAULT_DEMO_SLUG)!;
const SAMPLE_CARD_INDEX = 3;

export function HomeScreen() {
  return (
    <PageShell>
      <div className="grid items-center gap-14 pt-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <h1 className="max-w-[17ch] font-serif text-[clamp(2.4rem,4.4vw,3.6rem)] font-semibold leading-[1.06] tracking-[-0.02em]">
            Turn tonight&apos;s slides into a lesson your class actually remembers.
          </h1>
          <p className="mt-6 max-w-[50ch] text-[1.25rem] leading-relaxed text-ink-soft">
            {BRAND.name} rewrites any deck into short pages students study at their own pace, then quizzes each of them
            privately and sends every wrong answer back to the page that teaches it. You see where the class got stuck.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/signup" className={buttonClass("primary")}>
              Get started
            </Link>
            <Link href="/login" className={buttonClass("quiet")}>
              Log in
            </Link>
          </div>
          <p className="mt-7 text-[0.9375rem] text-ink-soft">
            Works with PDF and PowerPoint. Ready in under a minute. Students join with a class code from their teacher.
          </p>
        </div>

        <figure className="relative mx-auto w-full max-w-[34rem]">
          <div aria-hidden className="-rotate-[1.2deg] rounded-[2px] border border-rule bg-sheet px-7 py-7 sm:px-9 sm:py-8">
            <LessonPageView
              card={demo.lesson.cards[SAMPLE_CARD_INDEX]}
              pageNumber={SAMPLE_CARD_INDEX + 1}
              totalPages={demo.lesson.cards.length}
              highlightProgress={1}
            />
          </div>
          <figcaption className="mt-5 text-center text-[0.875rem] text-ink-soft">
            A page from a lesson on {demo.lesson.title.toLowerCase()}.
          </figcaption>
        </figure>
      </div>
    </PageShell>
  );
}
```

```tsx
// src/app/page.tsx
import { redirect } from "next/navigation";
import { HomeScreen } from "@/app-components/HomeScreen";
import { homeFor } from "@/lib/roles";
import { verifySession } from "@/server/auth";

export default async function Home() {
  const user = await verifySession();
  if (user) redirect(homeFor(user.role));
  return <HomeScreen />;
}
```

- [ ] **Step 2: Remove the MVP**

```bash
git rm -r src/app/lesson src/app/quiz src/app/results src/app/sample-teacher src/app/api/generate
git rm src/app-components/UploadScreen.tsx src/app-components/QuizScreen.tsx src/app-components/ResultsScreen.tsx src/app-components/LessonPageScreen.tsx src/app-components/TeacherScreen.tsx
git rm src/app-components/useRequiredLesson.ts src/app-components/upload-state.ts src/app-components/upload-state.test.ts
git rm src/lib/lesson-state.ts src/lib/lesson-state.test.ts src/lib/lesson-store.tsx src/lib/sample-class.ts src/lib/sample-class.test.ts
git rm e2e/demo-flow.spec.ts
```

Confirm nothing still points at them. This must print nothing:

```bash
grep -rnE "sample-class|lesson-store|lesson-state|useRequiredLesson|UploadScreen|upload-state|sample-teacher" src e2e scripts
```

(`src/lib/handle-generate.test.ts` still names `/api/generate` in a fake request URL; that is harmless. `src/app/api` should now hold only `teacher` and `learn`.)

`src/lib/scoring.ts` stays (`verdict` is used by the student results page).

- [ ] **Step 3: Home page end-to-end test**

Append to `e2e/accounts.spec.ts`:

```ts
test("the home page sells the idea and sends a logged-in teacher to their classes", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Turn tonight's slides");
  await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();
  await signupTeacher(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/teacher$/);
});
```

- [ ] **Step 4: Update the docs**

Read `README.md` and `docs/presentation-day-checklist.md` in full first. Then:

1. In `README.md`, replace the whole "Demo mode (no internet needed)" section (and any other mention of the **D** key, the sample lesson button or the sample class dashboard) with:

````md
## Accounts and demo data

Slidekick has two kinds of account.

- **Teachers** sign up with an email and password, create a class for one of the five subjects (Biology, Chemistry, Math, Albanian, English) and get a six character class code. They upload slides, check the AI's pages and quiz, edit anything, and publish. Their results page shows where the class got stuck.
- **Students** sign up with their first name and a password. We add a number to make a login name such as `Mira#4821`. They enter the class code, read the lesson and take the quiz. The answers never reach the browser until a student has answered that question. Only each student's first attempt counts for the teacher; retries are practice.

Everything is stored in one file, `data/slidekick.db`. Delete it to start over.

For a demo with no setup, run:

```bash
npm run seed
```

It creates a teacher (`teacher@demo.test`, password `demo-teacher-1`), an 8A Biology class with a published Photosynthesis lesson, and 12 students with realistic results (password `demo-student-1`; the script prints their login names and the class code). Log in as the teacher to see the results page, or as any student to take the quiz.

The two sample lessons in `src/demo/` are used by the seed script and the home page. Once you have an API key you can replace them with real AI output with `npm run decks` and `npm run make-demos`.

## Tests

`npm test` runs the unit tests. `npm run test:e2e` runs the browser tests; stop `npm run dev` first. They use their own database (`data/e2e.db`) and a fake AI, so they never touch your data or spend credit.
````

2. In `docs/presentation-day-checklist.md`, replace any step about pressing **D**, loading the sample lesson, or opening the sample teacher dashboard with: "Run `npm run seed` once before the demo. Log in as the teacher (`teacher@demo.test`) in one browser window and as a student in a second window." Keep the rest of the checklist.

- [ ] **Step 5: Final verification**

Run each; expect success:

- `npx tsc --noEmit`
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run test:e2e` (stop any dev server first)

Then check the product by hand, because green tests do not prove the screens look right. With a clean `data/slidekick.db` (delete it), run `npm run seed` and `npm run dev`, and in a browser:

1. Home page: headline, one primary button, no leftover upload hero. Resize to phone width and confirm there is no horizontal scroll.
2. Log in as the demo teacher: classes list, the class page (code, lessons, 12 students), the lesson review (published, read-only), the results page (insight sentence with the highlighter, mastery bars, a four column table).
3. Log in as a demo student in a private window: five subjects, Biology lesson, pages, quiz, results with review links, retry.
4. In the browser developer tools, Network tab, start a quiz and confirm the response to `/attempts` has no correct answer and no explanation.
5. Upload `samples/pdf/photosynthesis.pdf` as a new teacher with `SLIDEKICK_FAKE_AI=1` set, or with a real `ANTHROPIC_API_KEY` for the real path.

Report anything that fails instead of working around it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: new home page, remove the single-session MVP screens, update docs" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review notes (writing-plans checklist)

- **Spec coverage:** roles and subjects (Tasks 2, 5, 6); data model (Task 1, with the deviations recorded in the spec by Task 1 Step 5); authentication, proxy, data access layer, rate limits, teacher-only generation (Tasks 2 to 4, 6, 9); teacher screens (Tasks 6, 9, 10, 15); student screens (Tasks 6, 13); authoring and publish rules (Tasks 8, 10); private quiz (Tasks 12, 13); teacher results (Tasks 14, 15); language and read-aloud (Task 7); demo data (Task 16); removal of the MVP routes (Task 17); testing (every task, plus the end-to-end specs in Tasks 4, 6, 10, 13, 15, 17).
- **Deviations from the approved spec, all recorded by Task 1 Step 5:** `users.login` replaces `users.email` plus a separate student suffix; `questions` is keyed by `(lesson_id, qid)`; `attempts` stores the question order and shuffles; a `reads` table backs the "read" status; the rate limiter is keyed by IP and login (login) and student id (join code); language is detected from the text instead of returned by the model; published lessons are read-only.
- **Type consistency:** `SessionUser`, `Role` (Task 2) are used unchanged by every later task. `StoredLesson` (Task 8) feeds `student.ts` and `results.ts`. `AttemptView`, `Feedback`, `AttemptResult` (Task 12) are what `QuizRunner` and the results page consume. `ClassReport` and `TopicMastery` (Task 14) are what `ResultsView` and `MasteryBars` consume.
