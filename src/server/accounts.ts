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
