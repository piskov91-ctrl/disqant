"use client";

import { useEffect, useState } from "react";
import AdminClient from "./AdminClient";
import AdminGateClient from "./AdminGateClient";

export default function AdminPageClient() {
  const [authed, setAuthed] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    // Always clear the auth cookie on /admin page load.
    // This forces a password prompt every visit/refresh.
    void fetch("/api/admin-auth", { method: "DELETE" }).finally(() => setCleared(true));
  }, []);

  if (!cleared) {
    return (
      <div className="mt-6 rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-zinc-600">
        Loading…
      </div>
    );
  }

  if (!authed) {
    return <AdminGateClient onSuccess={() => setAuthed(true)} />;
  }

  return <AdminClient />;
}

