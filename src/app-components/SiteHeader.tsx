import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-5 py-5 sm:px-8">
      <Link href="/" className="rounded-[2px]">
        <Wordmark />
      </Link>
      {right}
    </header>
  );
}
