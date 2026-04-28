import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { getRetailerSessionUser } from "@/lib/retailerAuth";

export const metadata: Metadata = {
  title: "My plan",
  description: "Your Wear Me subscription and try-on allowance.",
};

export default async function PlanPage() {
  const user = await getRetailerSessionUser();
  if (!user) redirect("/login?next=/plan");

  const client = user.clientId ? await getClientKeyRecordById(user.clientId) : null;
  const used = client?.usageCount ?? 0;
  const limit = client?.usageLimit ?? 0;
  const remaining = client ? Math.max(0, limit - used) : 0;
  const blocked = client ? limit > 0 && used >= limit : false;

  return (
    <>
      <Header />
      <main className="min-h-dvh bg-zinc-950 pt-20 md:pt-24">
        <div className="mx-auto max-w-2xl px-6 py-12 md:py-16">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">My plan</h1>
          <p className="mt-2 text-sm text-zinc-400">Your Wear Me subscription and API usage.</p>

          {!client ? (
            <div className="mt-10 rounded-2xl border border-white/10 bg-zinc-900/50 p-10 text-center shadow-xl shadow-black/20 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-zinc-100">No active plan</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                You don&apos;t have an active subscription yet. Choose a plan to get an API key and try-on bundle.
              </p>
              <Link
                href="/subscriptions"
                className="btn-accent-gradient mt-8 inline-flex items-center justify-center"
              >
                View Plans
              </Link>
            </div>
          ) : (
            <div className="mt-10 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 backdrop-blur-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-500">Account</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-100">{client.clientName}</p>
                    <p className="mt-3 text-sm text-zinc-400">
                      Integrator label for your Wear Me API key. Usage is tracked against this plan.
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${
                      blocked
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    }`}
                  >
                    {blocked ? "Limit reached" : "Active"}
                  </span>
                </div>

                <dl className="mt-8 grid gap-6 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Try-on limit</dt>
                    <dd className="mt-2 text-2xl font-semibold tabular-nums text-zinc-50">{limit}</dd>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Used</dt>
                    <dd className="mt-2 text-2xl font-semibold tabular-nums text-zinc-50">{used}</dd>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">Remaining</dt>
                    <dd className="mt-2 text-2xl font-semibold tabular-nums text-zinc-50">{remaining}</dd>
                  </div>
                </dl>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/dashboard"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-zinc-950/50 px-6 text-sm font-semibold text-zinc-100 transition hover:border-white/25 hover:bg-zinc-900/80"
                  >
                    Open dashboard
                  </Link>
                  <Link
                    href="/subscriptions"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-600 px-6 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800/80"
                  >
                    Change plan
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
        <p className="pb-12 text-center text-xs text-zinc-600">
          <Link href="/dashboard" className="underline-offset-2 hover:text-zinc-400 hover:underline">
            Dashboard
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
