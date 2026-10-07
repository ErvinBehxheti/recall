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
