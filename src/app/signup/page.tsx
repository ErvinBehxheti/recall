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
