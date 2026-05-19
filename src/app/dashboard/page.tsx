import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { retailerWelcomeGreetingName } from "@/lib/retailerDisplayName";
import { getRetailerSessionUser } from "@/lib/retailerAuth";
import { subscriptionPlanCap } from "@/lib/clientTryOnBuckets";
import { planLabelFromTryOnLimit } from "@/lib/subscriptionPlans";
import { RetailerDashboardShell } from "./RetailerDashboardShell";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Wear Me API key, try-on usage, and top product images.",
};

export const runtime = "nodejs";

function welcomeStrip(greeting: string) {
  return (
    <section className="border-b border-white/10 bg-zinc-950/95 px-6 pb-8 pt-5 md:pb-10 md:pt-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-balance text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
          Welcome back, {greeting}!
        </p>
        <p className="mt-2 text-sm font-medium uppercase tracking-wider text-zinc-500">Dashboard</p>
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const user = await getRetailerSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  const greeting = retailerWelcomeGreetingName(user);

  const client = user.clientId ? await getClientKeyRecordById(user.clientId) : null;

  if (user.clientId && !client) {
    return (
      <>
        <Header />
        <main className="min-h-dvh bg-zinc-950 pt-[var(--site-header-height)]">
          {welcomeStrip(greeting)}
          <div className="mx-auto max-w-6xl px-6 py-16">
            <p className="text-zinc-300">
              We couldn&apos;t load your API key record. Please contact{" "}
              <a href="mailto:support@fit-room.com" className="text-accent underline-offset-2 hover:underline">
                support@fit-room.com
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
        <main className="min-h-dvh bg-zinc-950 pt-[var(--site-header-height)]">
          {welcomeStrip(greeting)}
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

  const planCap = subscriptionPlanCap(client);
  const planLabel = planLabelFromTryOnLimit(planCap);

  const accountSubtitle =
    [
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim(),
      user.companyName?.trim(),
    ]
      .filter(Boolean)
      .join(" · ") || "Your retailer account";

  return (
    <>
      <Header />
      <main className="min-h-dvh bg-zinc-950 pt-[var(--site-header-height)]">
        <RetailerDashboardShell
          welcomeHeading={`Welcome back, ${greeting}!`}
          accountSubtitle={accountSubtitle}
          websiteUrl={user.websiteUrl?.trim() ? user.websiteUrl.trim() : null}
          planLabel={planLabel}
          apiKey={client.key}
          initialPlanUsed={client.usageCount}
          initialPlanLimit={planCap}
          initialTopUpUsed={client.topUpUsageCount ?? 0}
          initialTopUpLimit={client.topUpLimit ?? 0}
        />
      </main>
      <Footer />
    </>
  );
}
