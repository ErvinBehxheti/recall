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
