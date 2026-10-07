// src/app/signup/teacher/page.tsx
import { signupTeacher } from "@/app/actions/auth";
import { ActionForm } from "@/app-components/ActionForm";
import { PageShell, PageTitle } from "@/app-components/PageShell";

export default function TeacherSignupPage() {
  return (
    <PageShell width="max-w-2xl">
      <PageTitle>Teacher account</PageTitle>
      <ActionForm
        action={signupTeacher}
        submit="Create account"
        fields={[
          { name: "name", label: "Name", autoComplete: "name" },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters." },
        ]}
      />
    </PageShell>
  );
}
