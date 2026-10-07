// src/app/signup/student/page.tsx
import { signupStudent } from "@/app/actions/auth";
import { ActionForm } from "@/app-components/ActionForm";
import { PageShell, PageTitle } from "@/app-components/PageShell";

export default function StudentSignupPage() {
  return (
    <PageShell width="max-w-2xl">
      <PageTitle>Student account</PageTitle>
      <ActionForm
        action={signupStudent}
        submit="Create account"
        fields={[
          { name: "name", label: "Your first name", autoComplete: "given-name", hint: "We add a number to it to make your login name." },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters." },
        ]}
      />
    </PageShell>
  );
}
