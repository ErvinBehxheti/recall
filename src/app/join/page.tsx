// src/app/join/page.tsx
import { joinClassAction } from "@/app/actions/classes";
import { ActionForm } from "@/app-components/ActionForm";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { requireUser } from "@/server/auth";

export default async function JoinPage() {
  const user = await requireUser("student");
  return (
    <PageShell user={user} width="max-w-2xl">
      <PageTitle>Join a class</PageTitle>
      <ActionForm
        action={joinClassAction}
        submit="Join class"
        fields={[{ name: "code", label: "Class code", hint: "Six letters and numbers from your teacher." }]}
      />
    </PageShell>
  );
}
