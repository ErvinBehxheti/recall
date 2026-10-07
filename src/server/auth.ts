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
