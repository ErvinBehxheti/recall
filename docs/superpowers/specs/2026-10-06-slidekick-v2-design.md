# Slidekick v2: accounts, subjects and private quizzes

Date: 2026-10-06
Status: draft for review
Builds on: `2026-10-04-slidekick-design.md` (the MVP spec). That spec listed accounts, saved lessons and real students as out of scope. This spec replaces those non-goals.

## 1. Goal

A teacher publishes a lesson to a class. Students in that class read it, take a private quiz, and the teacher sees who learned what. Everything the MVP already does well (one-idea pages, instant quiz feedback, wrong answer links back to the page that teaches it) stays.

Success looks like this: a teacher signs up, creates a Biology class and gets a code. Two students sign up and join with the code. The teacher uploads slides, fixes one quiz question and publishes. Each student reads the lesson and takes the quiz. The teacher's results page shows the real scores and the real weakest page. At no point does a student-facing response contain a correct answer before that student has answered.

## 2. Decisions already made

- Runs on one laptop. No hosted services, no deployment.
- Database: SQLite through Node's built-in `node:sqlite` (Node 24 is already required; checked on 24.18.0).
- Students join with a class code. Teachers register with email and password. Students register with a name and password.
- Quiz questions are AI drafts that the teacher edits. A live Kahoot-style session is out of scope here.
- The promo video (Plan 2) is still the priority for the pitch. This work is sliced so each slice can ship alone and the app is never left broken.

## 3. Roles and subjects

- Two roles: `teacher` and `student`. A user has exactly one role, fixed at sign-up.
- Five fixed subjects: Biology, Chemistry, Math, Albanian, English. Stored as a TypeScript union and a CHECK constraint, not a table.
- A class belongs to one teacher and one subject and has a name such as "8A Biology" and a join code.
- A student can be in many classes. The student home always lists all five subjects. A subject with no joined class shows an "Enter a class code" action in place of lessons.

## 4. Data model

SQLite file at `data/slidekick.db` (git-ignored). All access goes through one module, `src/server/db.ts`. Nothing else imports `node:sqlite`.

| Table | Columns |
|---|---|
| users | id, role, name, login (unique and lowercase: the teacher's email or the student's "name#1234"), password_hash, created_at |
| sessions | token_hash (primary key), user_id, expires_at |
| classes | id, teacher_id, subject, name, join_code (unique), created_at |
| enrollments | class_id, student_id, joined_at (primary key on both ids) |
| lessons | id, class_id, title, language, cards (JSON), status (`draft` or `published`), created_at, published_at |
| questions | lesson_id, qid, position, question, options (JSON, 4 strings), correct_index, explanation, card_id (primary key is lesson_id and qid) |
| attempts | id, lesson_id, student_id, is_first (boolean), question_ids (JSON, shown order), shuffles (JSON, per question), answers (JSON), score, total, started_at, finished_at |
| reads | lesson_id, student_id, read_at |

Rules:
- Student login name: students sign in with the name they registered plus a 4-digit suffix the app assigns, shown once ("Mira#4821"). This removes the duplicate name problem without asking for an email.
- Deleting a lesson deletes its questions and attempts. Deleting a class is not in the MVP.
- Cards keep the existing shape (`id, title, explanation, keyPoints, rememberThis`). Questions keep the existing shape plus `position`. The existing zod schemas in `src/lib/lesson-schema.ts` stay the source of truth for AI output and are reused for edits.

## 5. Authentication

- Passwords: `scrypt` from `node:crypto` with a random salt per user, minimum 8 characters.
- Session: a random 32-byte token in an `httpOnly`, `sameSite=lax` cookie. Only its SHA-256 hash is stored. 14-day expiry. Logout deletes the row.
- Next 16 conventions, from `node_modules/next/dist/docs/01-app/02-guides/authentication.md`:
  - `cookies()` is async and is awaited.
  - `proxy.ts` replaces `middleware.ts`. It runs on the Node runtime. It does an optimistic check only (is the cookie present, redirect to `/login` if not) and never touches the database.
  - The real check is a data access layer, `src/server/auth.ts`, with `verifySession()` (memoized with React `cache`) and `requireRole(role)`. Every route handler, server action and page that reads data calls it first.
- Ownership checks live in the same layer: a teacher can touch only their own classes and lessons, a student can read only lessons of classes they are enrolled in and only if `status = 'published'`.
- Rate limiting: failed logins are limited per IP and login name (5 failures per minute) and also per login name alone (20 failures per 10 minutes), because the IP comes from a header a client can set. Wrong join codes are limited per student account (5 failures per minute). All in memory, so one mistyped login on a shared laptop cannot lock out a class. Join codes are 6 characters from an alphabet without look-alike letters.
- `/api/generate` requires a teacher session. This also closes the open-API-key gap from the MVP.

## 6. Screens and routes

Teacher (all under `/teacher`):
- `/teacher`: the five subjects, each listing the teacher's classes and a "needs attention" line when a published lesson has a weak page. One primary action: create class.
- `/teacher/classes/[id]`: join code, student count, lessons with draft or published status. One primary action: upload slides.
- `/teacher/lessons/[id]`: review. The generated pages and the questions, editable (see section 7). Publish and unpublish.
- `/teacher/lessons/[id]/results`: real results. Weakest page with "Re-teach page N", and a table with at most four columns: student, first-attempt score, status, weakest topic.

Student (all under `/learn`):
- `/learn`: the five subjects as a plain list with progress counts.
- `/learn/[subject]`: published lessons from the student's classes in that subject, each marked not started, read, or a score.
- `/learn/lessons/[id]` and `/learn/lessons/[id]/pages/[n]`: the existing lesson pages, served from the database.
- `/learn/lessons/[id]/quiz` and `/learn/lessons/[id]/results`: the private quiz and the student's own results, with the existing review links.

Shared: `/login`, `/signup` (role chosen first), `/join` (enter class code). The MVP's fake `/teacher` page is replaced by the real one in slice 2. The MVP routes `/`, `/lesson`, `/quiz` and `/results` are removed in slice 5, after the demo path moves to the seed data.

The design rules in the project memory still apply to every new screen: no card grids, no tabs for two or three options, one primary action per screen, skeleton loaders, no emojis, no em dashes.

## 7. Teacher quiz authoring

- Upload runs the existing generation, then saves a draft lesson and its questions.
- The review screen lets the teacher: edit a question, its four options and the correct option, edit the explanation, change which page a question teaches, delete a question, add a question by hand, and delete or edit a page's text.
- Validation reuses `src/lib/validate-lesson.ts`: 4 to 15 pages, 5 to 10 questions, four distinct options, every `card_id` exists. Publish is blocked with a plain message until the lesson passes.
- AI regeneration of a single question is not in the MVP.
- A published lesson is read-only. To edit it the teacher unpublishes it, which is allowed only while no student has an attempt on it.

## 8. The private quiz

The goal is "did they really learn it", so the answer key must stay on the server.

- Starting the quiz creates an in-progress attempt. The response contains questions and options with the options shuffled for this student, and no `correct_index` and no `explanation`.
- Answering a question is a POST of the chosen option. The server records it and returns right or wrong plus the correct option and the explanation for that one question. Instant feedback is kept because it is the MVP's best teaching moment.
- Because feedback is per question, an answered question is locked and cannot be changed.
- The first completed attempt per student per lesson is marked `is_first` and is the only one the teacher sees in scores. Later attempts, including "Retry missed questions", are practice and visible only to the student.
- A student cannot open a lesson's questions unless enrolled and the lesson is published. A teacher cannot take the quiz.
- Known limit: this does not stop a student copying answers from a friend. It stops reading the key from the page or the network.

## 9. Results for the teacher

Only the first attempts count. Per page mastery is the share of first-attempt answers that were right for questions tied to that page. The existing `ClassReport` shape and insight sentence ("Re-teach page N") are kept, but computed from attempts instead of `src/lib/sample-class.ts`. Students who have not finished show as "Not started" or "In progress", not as zero.

## 10. Language

- The generation prompt is changed to write the lesson in the language of the slides. `lessons.language` is `sq` or `en`, detected from the generated text, so the strict AI output schema does not change.
- The `lang` attribute follows the lesson. The read-aloud button is hidden unless the browser reports a voice for the lesson's language (Albanian voices are rare).
- The product UI stays English. Translating the interface is out of scope.

## 11. Demo data

`npm run seed` creates a demo teacher, a Biology class, 12 students and a published lesson with realistic first attempts, using the two existing demo lessons. This replaces the fake class generator and keeps the stage demo working from one command. Demo logins are printed by the script and listed in the README.

## 12. Testing

- Vitest, against an in-memory SQLite database: password hashing, session create, expire and logout, role and ownership checks (a teacher cannot read another teacher's class, a student cannot read an unpublished lesson or a class they have not joined), join code rate limit, shuffle and grading, first-attempt rule, result aggregation, publish validation.
- A test that fails if any student-facing response (`/learn` data and quiz start) contains `correct_index` or `explanation` before answering.
- Playwright: teacher signs up, creates a class, uploads a sample deck (AI mocked), edits a question and publishes. Two students join and finish the quiz. The teacher's results page shows both scores.
- Existing tests keep passing at the end of each slice.

## 13. Build slices

Each slice ends with passing tests and a working app.

1. Database module, migrations, sign-up, login, logout, `proxy.ts`, DAL, role guards.
2. Classes, the five subjects, join codes, enrollment, the subject lists for both roles.
3. Persisted lessons: generation saves a draft, review and edit screen, publish.
4. Student flow: lesson pages from the database, server-graded private quiz, own results and review links.
5. Real results dashboard, seed script, removal of the MVP routes and the fake class generator, README update.

## 14. Out of scope

Live Kahoot-style sessions, slide image thumbnails, messaging, grade history over time, password reset by email, deleting classes, translating the UI, online deployment, per-question AI regeneration.

## 15. Risks

- `node:sqlite` is synchronous. Fine for one laptop and a classroom, and it keeps the code simple. If the app is ever deployed, the single `db.ts` module is the swap point for a hosted database.
- Moving state from the browser to the server changes most screens. Reusing the presentational components in `src/components` and the existing schemas limits the rewrite to the stateful screens in `src/app-components`.
- Time. Slices 1 to 3 give a teacher who can publish. Slices 4 and 5 make it real for students. If time runs short before the competition, stop after slice 5 and keep the seeded demo; do not start live mode.
