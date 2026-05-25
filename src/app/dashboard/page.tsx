import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getClientKeyRecordById } from "@/lib/apiKeyStore";
import { retailerWelcomeGreetingName } from "@/lib/retailerDisplayName";
import { getRetailerSessionUser, retailerEligibleForTryOnTopUps } from "@/lib/retailerAuth";
import { storedOrDerivedBasePlanLimit } from "@/lib/clientTryOnBuckets";
import { getNextMonthlyResetUtcDateForDisplay, resolveBillingAnchorDay } from "@/lib/billingCycle";
import { catalogSubscriptionPlanKeyFromTryOnLimit, retailerDashboardPlanFromBaseLimit } from "@/lib/subscriptionPlans";
import {
  SUBSCRIPTION_CANCELLATION_REASON_LABELS,
  SUBSCRIPTION_CANCELLATION_REASONS,
  type SubscriptionCancellationReasonCode,
} from "@/lib/subscriptionCancellation";
import { RetailerDashboardShell } from "./RetailerDashboardShell";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Wear Me API key, try-on usage, and top product images.",
};

export const runtime = "nodejs";

function cancellationReasonLabelFromStored(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim() as SubscriptionCancellationReasonCode;
  if ((SUBSCRIPTION_CANCELLATION_REASONS as readonly string[]).includes(t)) {
    return SUBSCRIPTION_CANCELLATION_REASON_LABELS[t];
  }
  return raw.trim();
}

function welcomeStrip(greeting: string) {
  return (
    <section className="border-b border-[#c6a77d]/15 bg-black/40 px-6 pb-8 pt-5 backdrop-blur-md md:pb-10 md:pt-6">
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
        <main className="relative min-h-dvh pt-[var(--site-header-height)]">
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
        <main className="relative min-h-dvh pt-[var(--site-header-height)]">
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

  const planCap = storedOrDerivedBasePlanLimit(client);
  const planBits = retailerDashboardPlanFromBaseLimit(planCap);
  const billingAnchorDayUtc = resolveBillingAnchorDay(client);
  const nextResetUtc = getNextMonthlyResetUtcDateForDisplay(client);
  const nextResetLabel = `${new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(nextResetUtc)} (UTC)`;
  const monthlyPriceLabel =
    typeof planBits.priceGbpPence === "number"
      ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(planBits.priceGbpPence / 100)
      : null;

  const planSummary = {
    planName: planBits.planName,
    monthlyTryOnLimit: planBits.monthlyTryOnLimit,
    monthlyPriceLabel,
    nextResetLabel,
    billingAnchorDayUtc,
  };
  const accountSubtitle =
    [
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim(),
      user.companyName?.trim(),
    ]
      .filter(Boolean)
      .join(" · ") || "Your retailer account";

  const canceledAtStored = user.subscriptionCanceledAt?.trim() || null;
  const accessUntilIso = user.subscriptionAccessUntil?.trim() || null;
  const accessUntilMs = accessUntilIso ? Date.parse(accessUntilIso) : NaN;
  const subscriptionAccessEnded = Number.isFinite(accessUntilMs) && accessUntilMs <= Date.now();
  const hasStripeSubscription = Boolean(user.stripeSubscriptionId?.trim());

  /** Avoid duplicate Stripe checkouts while a normal billed subscription runs uncancelled. */
  const showRenewSubscriptionButton =
    !hasStripeSubscription || Boolean(canceledAtStored) || subscriptionAccessEnded;

  const subscriptionBilling = {
    canRequestCancellation: !canceledAtStored,
    cancellationScheduled: Boolean(canceledAtStored),
    accessUntilIso,
    canceledAtIso: canceledAtStored,
    cancellationReasonLabel: cancellationReasonLabelFromStored(user.cancellationReason),
    renewSubscriptionPlanKey: catalogSubscriptionPlanKeyFromTryOnLimit(planCap),
    showRenewSubscriptionButton,
  };

  const topUpEligible = retailerEligibleForTryOnTopUps(user);

  return (
    <>
      <Header />
      <main className="relative min-h-dvh pt-[var(--site-header-height)]">
        <RetailerDashboardShell
          welcomeHeading={`Welcome back, ${greeting}!`}
          accountSubtitle={accountSubtitle}
          websiteUrl={user.websiteUrl?.trim() ? user.websiteUrl.trim() : null}
          planSummary={planSummary}
          subscriptionBilling={subscriptionBilling}
          topUpEligible={topUpEligible}
          apiKey={client.key}
          initialPlanUsed={client.usageCount}
          initialBasePlanLimit={planCap}
          initialTopUpUsed={client.topUpUsageCount ?? 0}
          initialTopUpLimit={client.topUpLimit ?? 0}
        />
      </main>
      <Footer />
    </>
  );
}
