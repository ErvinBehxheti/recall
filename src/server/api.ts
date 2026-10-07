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
