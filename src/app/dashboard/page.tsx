import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { retailerWelcomeGreetingName } from "@/lib/retailerDisplayName";
import { getRetailerSessionUser } from "@/lib/retailerAuth";
import { DashboardAnalyticsButton } from "./DashboardAnalyticsButton";
import { RetailerDashboardClient } from "./RetailerDashboardClient";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Wear Me API key, try-on usage, and top product images.",
};

export const runtime = "nodejs";

export default async function DashboardPage() {
  const user = await getRetailerSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  const greeting = retailerWelcomeGreetingName(user);
  const welcomeHeader = (
    <section className="border-b border-white/10 bg-zinc-950/95 px-6 pb-10 pt-5 md:pb-12 md:pt-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-balance text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
          Welcome back, {greeting}!
        </p>
        <p className="mt-2 text-sm font-medium uppercase tracking-wider text-zinc-500">Dashboard</p>
      </div>
    </section>
  );

  const client = user.clientId ? await getClientKeyRecordById(user.clientId) : null;

  if (user.clientId && !client) {
    return (
      <>
        <Header />
        <main className="min-h-dvh bg-zinc-950 pt-[60px]">
          {welcomeHeader}
          <div className="mx-auto max-w-6xl px-6 py-16">
            <p className="text-zinc-300">
              We couldn&apos;t load your API key record. Please contact{" "}
              <a href="mailto:hello@fit-room.com" className="text-accent underline-offset-2 hover:underline">
                hello@fit-room.com
              </a>
              .
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!client) {
    return (
      <>
        <Header />
        <main className="min-h-dvh bg-zinc-950 pt-[60px]">
          {welcomeHeader}
          <section className="py-16 md:py-20">
            <div className="mx-auto max-w-lg px-6">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-10 text-center shadow-xl shadow-black/20 backdrop-blur-sm md:p-12">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/80 text-zinc-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 3v3" />
                    <path d="M16.5 8.5 18 10" />
                    <path d="M21 12h-3" />
                    <path d="M18 16.5l-1.5 1.5" />
                    <path d="M12 21v-3" />
                    <path d="M7.5 15.5 6 18" />
                    <path d="M3 12h3" />
                    <path d="M6 7.5 7.5 6" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </div>
                <h2 className="mt-8 text-xl font-semibold tracking-tight text-zinc-100 md:text-2xl">
                  No active plan
                </h2>
                <p className="mt-4 text-base leading-relaxed text-zinc-400">
                  You don&apos;t have an active plan yet. Get started today!
                </p>
                <Link
                  href="/subscriptions"
                  className="btn-accent-gradient mt-10 inline-flex min-w-[10rem] items-center justify-center"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  const used = client.usageCount;
  const limit = client.usageLimit;
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const blocked = limit > 0 && used >= limit;

  return (
    <>
      <Header />
      <main className="min-h-dvh bg-zinc-950 pt-[60px]">
        {welcomeHeader}

        <section className="border-b border-white/10 py-10">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-lg leading-relaxed text-zinc-400">
                  {[
                    [user.firstName, user.lastName].filter(Boolean).join(" "),
                    user.companyName?.trim(),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Account"}{" "}
                  · Try-on usage and your embed API key.
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Website:{" "}
                  {user.websiteUrl ? (
                    <a
                      href={user.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-300 underline-offset-2 hover:underline"
                    >
                      {user.websiteUrl}
                    </a>
                  ) : (
                    <span className="text-zinc-600">Not provided</span>
                  )}
                </p>
              </div>
              <DashboardAnalyticsButton />
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="space-y-8">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 shadow-lg shadow-black/10 backdrop-blur-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-400">API key</p>
                    <p className="mt-2 break-all font-mono text-sm text-zinc-200">{client.key}</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Use this value as <span className="font-mono text-zinc-400">data-fit-room-key</span> on the
                      script tag, or pass <span className="font-mono text-zinc-400">?key=</span> in the script URL.
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0">
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
                </div>

                <RetailerDashboardClient apiKey={client.key} />

                <div className="mt-8 grid gap-6 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-6">
                    <p className="text-sm font-medium text-zinc-400">Try-ons used</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{used}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-6">
                    <p className="text-sm font-medium text-zinc-400">Try-ons remaining</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{remaining}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-6">
                    <p className="text-sm font-medium text-zinc-400">Try-on limit</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{limit}</p>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-zinc-300">
                    <span>
                      Try-ons used {used} / {limit}
                    </span>
                    <span className="tabular-nums text-zinc-400">{pct}% of limit</span>
                  </div>
                  <div className="mt-3 h-3 w-full overflow-hidden rounded-full border border-white/10 bg-zinc-950/50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
