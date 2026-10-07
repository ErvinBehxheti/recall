// src/app-components/PageShell.tsx
import Link from "next/link";
import { buttonClass } from "@/components/Button";
import type { SessionUser } from "@/server/accounts";
import { AppHeader } from "./AppHeader";
import { SiteHeader } from "./SiteHeader";

type Props = {
  user?: SessionUser | null;
  width?: "max-w-2xl" | "max-w-4xl" | "max-w-6xl";
  children: React.ReactNode;
};

export function PageShell({ user, width = "max-w-6xl", children }: Props) {
  return (
    <div className="flex min-h-dvh flex-col">
      {user ? (
        <AppHeader user={user} />
      ) : (
        <SiteHeader
          right={
            <Link href="/login" className={buttonClass("quiet")}>
              Log in
            </Link>
          }
        />
      )}
      <main className={`mx-auto w-full ${width} flex-1 px-5 pb-16 pt-10 sm:px-8 sm:pt-14`}>{children}</main>
    </div>
  );
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-serif text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.02em]">{children}</h1>
  );
}

export function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="font-serif text-[1.5rem] font-semibold">
      {children}
    </h2>
  );
}
