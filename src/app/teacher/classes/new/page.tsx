// src/app/teacher/classes/new/page.tsx
import { createClassAction } from "@/app/actions/classes";
import { ActionForm } from "@/app-components/ActionForm";
import { PageShell, PageTitle } from "@/app-components/PageShell";
import { SUBJECT_LABELS, SUBJECTS } from "@/lib/subjects";
import { requireUser } from "@/server/auth";

export default async function NewClassPage() {
  const user = await requireUser("teacher");
  return (
    <PageShell user={user} width="max-w-2xl">
      <PageTitle>New class</PageTitle>
      <ActionForm
        action={createClassAction}
        submit="Create class"
        fields={[
          { name: "subject", label: "Subject", options: SUBJECTS.map((s) => ({ value: s, label: SUBJECT_LABELS[s] })) },
          { name: "name", label: "Class name", hint: "For example 8A Biology." },
        ]}
      />
    </PageShell>
  );
}
