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
