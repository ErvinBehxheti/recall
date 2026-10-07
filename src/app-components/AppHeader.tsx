// src/app-components/AppHeader.tsx
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/Button";
import { Wordmark } from "@/components/Wordmark";
import { homeFor } from "@/lib/roles";
import type { SessionUser } from "@/server/accounts";

export function AppHeader({ user }: { user: SessionUser }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-5 py-5 sm:px-8">
      <Link href={homeFor(user.role)} className="rounded-[2px]">
        <Wordmark />
      </Link>
      <div className="flex items-center gap-5">
        <span className="text-ink-soft">{user.name}</span>
        <form action={logout}>
          <Button variant="quiet" type="submit">
            Log out
          </Button>
        </form>
      </div>
    </header>
  );
}
