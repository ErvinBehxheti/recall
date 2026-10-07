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
