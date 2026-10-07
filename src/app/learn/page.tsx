// src/app/learn/page.tsx  (placeholder, replaced in Task 6)
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { requireUser } from "@/server/auth";

export default async function LearnHome() {
  const user = await requireUser("student");
  return (
    <PageShell user={user}>
      <PageTitle>Hello, {user.name}</PageTitle>
    </PageShell>
  );
}
