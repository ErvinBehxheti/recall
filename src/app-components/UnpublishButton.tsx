// src/app-components/UnpublishButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";

export function UnpublishButton({ lessonId }: { lessonId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unpublish() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/teacher/lessons/${lessonId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "draft" }),
    });
    if (res.ok) return router.refresh();
    const data = await res.json().catch(() => null);
    setError(data?.error?.message ?? "Something went wrong. Try again.");
    setBusy(false);
  }

  return (
    <div>
      <Button variant="quiet" onClick={unpublish} disabled={busy}>
        Unpublish to edit
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-incorrect">
          {error}
        </p>
      )}
    </div>
  );
}
