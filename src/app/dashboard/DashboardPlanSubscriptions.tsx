"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { SubscriptionPlanKey } from "@/lib/subscriptionPlans";
import { DashboardStripeSubscriptionCancelWizard } from "./DashboardStripeSubscriptionCancelWizard";

export type DashboardPlanSubscriptionsProps = {
  stripeSubscriptionId: string | null;
  current: {
    planDisplayName: string;
    planUsageCount: number;
    planTryOnLimit: number;
    monthlyPriceLabel: string | null;
    canRequestStripeCancellation: boolean;
    cancellationScheduled: boolean;
    accessUntilIso: string | null;
    canceledAtIso: string | null;
    cancellationReasonLabel: string | null;
    showRenewSubscriptionButton: boolean;
    renewSubscriptionPlanKey: SubscriptionPlanKey | null;
    hasQueuedPlanUpgrade: boolean;
  };
  pending: null | {
    clientId: string;
    pendingPlanDisplayName: string;
    pendingTryOnLimit: number;
  };
};

function formatUtcLong(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return iso;
    return `${new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(d)} (UTC)`;
  } catch {
    return iso;
  }
}

function subscriptionAccessEnded(accessUntilIso: string | null): boolean {
  const raw = accessUntilIso?.trim();
  if (!raw) return false;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) && ms <= Date.now();
}

function DashboardRenewSubscriptionButton({ planKey }: { planKey: SubscriptionPlanKey | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = useCallback(() => {
    void (async () => {
      setError(null);
      if (!planKey) {
        router.push("/subscriptions");
        return;
      }
      setPending(true);
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ plan: planKey }),
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (data.url) {
          window.location.assign(data.url);
          return;
        }
        if (res.status === 401) {
          router.push("/login?next=/dashboard");
          return;
        }
        setError(data.error || "Could not start checkout.");
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setPending(false);
      }
    })();
  }, [planKey, router]);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={onClick}
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/[0.12] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100/95 transition hover:border-emerald-400/55 hover:bg-emerald-500/[0.18] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {pending ? "Loading…" : "Renew subscription"}
      </button>
      {error ? (
        <p className="max-w-[14rem] text-right text-[11px] leading-snug text-red-300/90" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "active" | "scheduled" | "ended" | "queued" }) {
  const toneClass =
    tone === "scheduled"
      ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
      : tone === "ended"
        ? "border-zinc-600 bg-zinc-900/65 text-zinc-400"
        : tone === "queued"
          ? "border-[#c6a77d]/45 bg-[#c6a77d]/10 text-[#f0e6d8]"
          : "border-emerald-400/35 bg-emerald-500/12 text-emerald-100";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${toneClass}`}
    >
      {label}
    </span>
  );
}

export function DashboardPlanSubscriptions({ stripeSubscriptionId, current, pending }: DashboardPlanSubscriptionsProps) {
  const router = useRouter();
  const [stripeWizardOpen, setStripeWizardOpen] = useState(false);
  const [pendingAwaitConfirm, setPendingAwaitConfirm] = useState(false);
  const [pendingBusy, setPendingBusy] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const accessEnded = subscriptionAccessEnded(current.accessUntilIso);
  const statusText = current.cancellationScheduled
    ? "Cancellation scheduled"
    : accessEnded
      ? "Subscription ended"
      : "Active";

  const stripeBadgeTone =
    current.cancellationScheduled && !accessEnded ? "scheduled" : accessEnded ? "ended" : "active";

  async function clearQueuedPlan(clientId: string) {
    setPendingError(null);
    setPendingBusy(true);
    try {
      const res = await fetch("/api/retailer/pending-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "clear", clientId }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setPendingError(data.error || "Could not remove the queued plan.");
        return;
      }
      setPendingAwaitConfirm(false);
      router.refresh();
    } catch {
      setPendingError("Something went wrong. Please try again.");
    } finally {
      setPendingBusy(false);
    }
  }

  return (
    <>
      <div className="mt-8 space-y-5 border-t border-[#c6a77d]/15 pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4bc94]/85">Plans</p>

        <div className="rounded-2xl border border-[#c6a77d]/20 bg-black/[0.22] px-5 py-5 shadow-inner shadow-black/35 backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Current billed plan</p>
              <p className="text-lg font-semibold tracking-tight text-zinc-50">{current.planDisplayName}</p>
            </div>
            <StatusBadge label={statusText} tone={stripeBadgeTone} />
          </div>

          <p className="mt-4 text-sm text-zinc-400">
            <span className="font-medium text-zinc-300">Plan try-ons </span>(
            <span className="tabular-nums">{current.planUsageCount.toLocaleString()}</span>
            {" / "}
            <span className="tabular-nums">
              {current.planTryOnLimit > 0 ? current.planTryOnLimit.toLocaleString() : "—"}
            </span>
            {" "}
            this cycle)
          </p>

          {current.monthlyPriceLabel ? (
            <p className="mt-2 text-sm text-zinc-500">
              {current.monthlyPriceLabel}
              <span className="text-zinc-600"> / month</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Pricing follows your Fit Room tier or custom agreement — see{" "}
              <Link href="/subscriptions" className="text-[#d4bc94] underline underline-offset-2 hover:text-[#f0e6d8]">
                plans
              </Link>
              .
            </p>
          )}

          {current.cancellationScheduled && !accessEnded ? (
            <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/[0.08] px-4 py-3 text-sm leading-relaxed text-amber-50/95">
              <p className="font-semibold text-amber-100">Renewal cancelled</p>
              <p className="mt-2 text-amber-50/90">
                Full access continues through{" "}
                <span className="font-medium tabular-nums text-amber-50">{formatUtcLong(current.accessUntilIso)}</span>.
              </p>
              {current.canceledAtIso ? (
                <p className="mt-2 text-xs text-amber-200/75">
                  Request received{" "}
                  <span className="tabular-nums">{formatUtcLong(current.canceledAtIso)}</span>
                </p>
              ) : null}
              {current.cancellationReasonLabel ? (
                <p className="mt-2 text-xs text-amber-200/75">
                  Reason: <span className="font-medium text-amber-100">{current.cancellationReasonLabel}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {current.showRenewSubscriptionButton || current.canRequestStripeCancellation ? (
            <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-[#c6a77d]/12 pt-4">
              {current.showRenewSubscriptionButton ? (
                <DashboardRenewSubscriptionButton planKey={current.renewSubscriptionPlanKey} />
              ) : null}
              {current.canRequestStripeCancellation ? (
                <button
                  type="button"
                  onClick={() => setStripeWizardOpen(true)}
                  className="inline-flex items-center justify-center rounded-xl border border-red-400/35 bg-red-500/[0.08] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-red-100/95 transition hover:border-red-400/50 hover:bg-red-500/[0.12]"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {pending ? (
          <div className="rounded-2xl border border-[#c6a77d]/25 bg-black/[0.18] px-5 py-5 shadow-inner shadow-black/35 backdrop-blur-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Queued upgrade</p>
                <p className="text-lg font-semibold tracking-tight text-zinc-50">{pending.pendingPlanDisplayName}</p>
              </div>
              <StatusBadge label="Queued" tone="queued" />
            </div>
            <p className="mt-4 text-sm text-zinc-400">
              <span className="font-medium text-zinc-300">Monthly try-ons after switch </span>(
              <span className="tabular-nums">{pending.pendingTryOnLimit.toLocaleString()}</span>)
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Applies automatically when your current monthly plan bucket is fully used. Stripe does not charge for this
              queued tier until it becomes your active billed plan.
            </p>

            {pendingAwaitConfirm ? (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3">
                <p className="text-sm text-amber-50/95">Drop this queued tier from your linked key? Stripe billing stays as your current plan.</p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={pendingBusy}
                    onClick={() => setPendingAwaitConfirm(false)}
                    className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/[0.06]"
                  >
                    Never mind
                  </button>
                  <button
                    type="button"
                    disabled={pendingBusy}
                    onClick={() => void clearQueuedPlan(pending.clientId)}
                    className="rounded-lg border border-red-400/45 bg-red-600/85 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600"
                  >
                    {pendingBusy ? "Removing…" : "Remove queue"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex justify-end border-t border-[#c6a77d]/12 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setPendingError(null);
                    setPendingAwaitConfirm(true);
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-red-400/35 bg-red-500/[0.08] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-red-100/95 transition hover:border-red-400/50 hover:bg-red-500/[0.12]"
                >
                  Cancel
                </button>
              </div>
            )}
            {pendingError ? (
              <p className="mt-3 text-xs text-red-300/95" role="alert">
                {pendingError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <DashboardStripeSubscriptionCancelWizard
        open={stripeWizardOpen}
        onClose={() => setStripeWizardOpen(false)}
        stripeSubscriptionId={stripeSubscriptionId}
        planDisplayName={current.planDisplayName}
        hasQueuedPlanUpgrade={current.hasQueuedPlanUpgrade}
      />
    </>
  );
}
