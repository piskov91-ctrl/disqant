"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import AdminClient from "./AdminClient";
import AdminGateClient from "./AdminGateClient";

export default function AdminPageClient() {
  const [authed, setAuthed] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    void fetch("/api/admin-auth", { method: "DELETE" }).finally(() => setCleared(true));
  }, []);

  if (!cleared) {
    return (
      <div className="w-full min-h-dvh bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl">
          <div className="flex h-16 w-full items-center justify-between px-6 md:px-10">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-100"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
                D
              </span>
              Disquant
            </Link>
            <Link href="/" className="text-sm text-zinc-400 transition hover:text-zinc-100">
              Back to landing
            </Link>
          </div>
        </header>
        <main className="w-full px-8 py-10">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400">
            Loading…
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="w-full min-h-dvh bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl">
          <div className="flex h-16 w-full items-center justify-between px-6 md:px-10">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-100"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
                D
              </span>
              Disquant
            </Link>
            <Link href="/" className="text-sm text-zinc-400 transition hover:text-zinc-100">
              Back to landing
            </Link>
          </div>
        </header>
        <main className="w-full px-8 py-10">
          <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-sm">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Admin</h1>
            <p className="mt-3 text-sm text-zinc-400">
              Enter the admin password to manage client API keys.
            </p>
            <AdminGateClient onSuccess={() => setAuthed(true)} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return <AdminClient />;
}
