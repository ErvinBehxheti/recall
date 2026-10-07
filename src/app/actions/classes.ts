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
