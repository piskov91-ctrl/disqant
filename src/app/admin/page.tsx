import Link from "next/link";
import { cookies } from "next/headers";
import AdminClient from "./AdminClient";
import AdminGateClient from "./AdminGateClient";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";

function AdminGate() {
  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-surface-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
              D
            </span>
            Disquant
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-zinc-400 transition hover:text-white">
              Back to landing
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-surface-border bg-surface-raised/30 p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Admin</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Enter the admin password to manage client API keys.
          </p>
          <AdminGateClient />
        </div>
      </main>
    </div>
  );
}

export default async function AdminPage() {
  const jar = await cookies();
  const authed = isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
  if (!authed) return <AdminGate />;
  return <AdminClient />;
}

