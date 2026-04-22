import Link from "next/link";
import AdminPageClient from "./AdminPageClient";

function AdminGate() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-surface-border bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              D
            </span>
            Disquant
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-zinc-600 transition hover:text-zinc-900">
              Back to landing
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-surface-border bg-surface-muted/50 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Admin</h1>
          <p className="mt-3 text-sm text-zinc-600">
            Enter the admin password to manage client API keys.
          </p>
          <AdminPageClient />
        </div>
      </main>
    </div>
  );
}

export default async function AdminPage() {
  return <AdminGate />;
}

