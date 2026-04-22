"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
      <div className="w-full min-h-dvh bg-white">
        <header className="border-b border-surface-border bg-white/80 backdrop-blur-xl">
          <div className="flex h-16 w-full items-center justify-between px-6 md:px-10">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                D
              </span>
              Disquant
            </Link>
            <Link href="/" className="text-sm text-zinc-600 transition hover:text-zinc-900">
              Back to landing
            </Link>
          </div>
        </header>
        <main className="w-full px-8 py-10">
          <div className="rounded-2xl border border-surface-border bg-white px-4 py-3 text-sm text-zinc-600">
            Loading…
          </div>
        </main>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="w-full min-h-dvh bg-white">
        <header className="border-b border-surface-border bg-white/80 backdrop-blur-xl">
          <div className="flex h-16 w-full items-center justify-between px-6 md:px-10">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                D
              </span>
              Disquant
            </Link>
            <Link href="/" className="text-sm text-zinc-600 transition hover:text-zinc-900">
              Back to landing
            </Link>
          </div>
        </header>
        <main className="w-full px-8 py-10">
          <div className="w-full rounded-2xl border border-surface-border bg-surface-muted/30 p-8 shadow-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Admin</h1>
            <p className="mt-3 text-sm text-zinc-600">
              Enter the admin password to manage client API keys.
            </p>
            <AdminGateClient onSuccess={() => setAuthed(true)} />
          </div>
        </main>
      </div>
    );
  }

  return <AdminClient />;
}

