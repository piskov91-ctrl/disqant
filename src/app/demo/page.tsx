import { cookies } from "next/headers";
import DemoClient from "./DemoClient";
import AccessCodeGateClient from "./AccessCodeGateClient";
import { DEMO_AUTH_COOKIE, isDemoAuthorizedCookieValue } from "@/lib/demoAuth";

function AccessCodeGate() {
  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-surface-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
              D
            </span>
            Disquant
          </a>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-zinc-400 transition hover:text-white">
              Back to landing
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-surface-border bg-surface-raised/30 p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Enter access code</h1>
          <p className="mt-3 text-sm text-zinc-400">
            This demo is gated. Enter the access code to continue.
          </p>

          <AccessCodeGateClient />
        </div>
      </main>
    </div>
  );
}

export default async function DemoPage() {
  const jar = await cookies();
  const authed = isDemoAuthorizedCookieValue(jar.get(DEMO_AUTH_COOKIE)?.value);
  if (!authed) return <AccessCodeGate />;
  return <DemoClient />;
}

