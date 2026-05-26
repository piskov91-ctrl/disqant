"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import {
  SUBSCRIPTION_CANCELLATION_REASON_LABELS,
  SUBSCRIPTION_CANCELLATION_REASONS,
  type SubscriptionCancellationReasonCode,
} from "@/lib/subscriptionCancellation";
import type { SubscriptionPlanKey } from "@/lib/subscriptionPlans";

export type DashboardSubscriptionBillingProps = {
  canRequestCancellation: boolean;
  cancellationScheduled: boolean;
  accessUntilIso: string | null;
  canceledAtIso: string | null;
  cancellationReasonLabel: string | null;
  /** Linked client plan label for confirmation copy (e.g. Fit Room Starter). */
  planDisplayName: string;
  /** When set, Renew starts Stripe Checkout for this tier; otherwise Renew sends the user to /subscriptions. */
  renewSubscriptionPlanKey: SubscriptionPlanKey | null;
  /** Hide while an uncancelled Stripe subscription is active (avoids duplicate checkout). */
  showRenewSubscriptionButton: boolean;
  /** True when a subscription tier is queued in Redis (before monthly bucket exhaust). */
  hasQueuedPlanUpgrade?: boolean;
};

type DashboardCancelPhase = "idle" | "step1" | "step2" | "form";

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

export function DashboardCancelSubscriptionPanel(props: DashboardSubscriptionBillingProps) {
  const router = useRouter();
  const dialogTitleId = useId();
  const descId = useId();
  const [phase, setPhase] = useState<DashboardCancelPhase>("idle");
  const [reason, setReason] = useState<SubscriptionCancellationReasonCode>("too_expensive");
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alsoRemoveQueuedUpgrade, setAlsoRemoveQueuedUpgrade] = useState(false);

  const planLabelShort = props.planDisplayName.trim() || "subscription";

  const close = useCallback(() => {
    if (busy) return;
    setPhase("idle");
    setError(null);
    setAlsoRemoveQueuedUpgrade(false);
  }, [busy]);

  useEffect(() => {
    if (phase === "idle") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, close]);

  async function onConfirm() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reason,
          comments: comments.trim(),
          clearPendingPlan: Boolean(props.hasQueuedPlanUpgrade && alsoRemoveQueuedUpgrade),
        }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setError(data.error || "Could not cancel subscription.");
        return;
      }
      setPhase("idle");
      setComments("");
      setAlsoRemoveQueuedUpgrade(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const accessEnded = subscriptionAccessEnded(props.accessUntilIso);
  const subscriptionStatusLabel = props.cancellationScheduled
    ? "Cancellation scheduled"
    : accessEnded
      ? "Subscription ended"
      : props.canRequestCancellation
        ? "Active"
        : "Subscription";

  return (
    <div className="mt-8 border-t border-[#c6a77d]/15 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4bc94]/85">Subscription</p>
          <p className="mt-2 text-sm font-semibold text-zinc-200">{subscriptionStatusLabel}</p>
        </div>
        {props.showRenewSubscriptionButton ? (
          <DashboardRenewSubscriptionButton planKey={props.renewSubscriptionPlanKey} />
        ) : null}
      </div>

      {props.cancellationScheduled ? (
        <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/[0.09] px-4 py-4 text-sm leading-relaxed text-amber-50/95">
          <p className="font-semibold text-amber-100">Cancellation scheduled</p>
          <p className="mt-2 text-amber-50/90">
            You keep full Wear Me access until the end of your current billing period (
            <span className="font-medium tabular-nums text-amber-50">{formatUtcLong(props.accessUntilIso)}</span>
            ). No further subscription charges will occur after that date.
          </p>
          {props.canceledAtIso ? (
            <p className="mt-3 text-xs text-amber-200/75">
              Request received:{" "}
              <span className="tabular-nums">{formatUtcLong(props.canceledAtIso)}</span>
            </p>
          ) : null}
          {props.cancellationReasonLabel ? (
            <p className="mt-2 text-xs text-amber-200/75">
              Reason: <span className="font-medium text-amber-100">{props.cancellationReasonLabel}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {props.canRequestCancellation ? (
        <>
          <p className="mt-4 text-sm leading-relaxed text-zinc-500">
            Cancel stops renewal charges at the end of your current Stripe billing period. Your embed and dashboard
            stay active until then.
            {props.hasQueuedPlanUpgrade ? (
              <>
                {" "}
                Any <span className="text-zinc-400">queued plan upgrade</span> stays on your key unless you remove it in
                the cancellation flow or cancel the queue separately under Try-on allowance.
              </>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => setPhase("step1")}
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-red-400/35 bg-red-500/[0.08] px-4 py-3 text-sm font-semibold text-red-100/95 transition hover:border-red-400/50 hover:bg-red-500/[0.12]"
          >
            Cancel subscription
          </button>
        </>
      ) : null}

      {phase !== "idle" ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close cancellation dialog"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            aria-describedby={descId}
            className="relative z-[81] w-full max-w-lg rounded-3xl border border-[#c6a77d]/30 bg-zinc-950/95 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-8"
          >
            <h2 id={dialogTitleId} className="text-lg font-semibold tracking-tight text-zinc-50">
              Cancel subscription
            </h2>

            {phase === "step1" ? (
              <>
                <p id={descId} className="mt-4 text-sm leading-relaxed text-zinc-200">
                  Are you sure you want to cancel your{" "}
                  <span className="font-semibold text-zinc-100">{planLabelShort}</span> subscription?
                </p>
                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={close}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-transparent px-5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhase("step2")}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-[#c6a77d]/40 bg-[#c6a77d]/12 px-5 text-sm font-semibold text-[#f0e6d8] shadow-sm transition hover:border-[#d4bc94]/55 hover:bg-[#c6a77d]/20"
                  >
                    Confirm
                  </button>
                </div>
              </>
            ) : null}

            {phase === "step2" ? (
              <>
                <p id={descId} className="mt-4 text-sm leading-relaxed text-zinc-200">
                  This will stop your <span className="font-semibold text-zinc-100">{planLabelShort}</span> plan at the
                  end of the current billing period. Your access continues until then. This cannot be undone. Cancel
                  subscription?
                </p>
                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setPhase("step1")}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-transparent px-5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06]"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhase("form")}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-red-400/45 bg-red-600/90 px-5 text-sm font-semibold text-white shadow-lg shadow-red-950/40 transition hover:bg-red-600"
                  >
                    Yes, Cancel
                  </button>
                </div>
              </>
            ) : null}

            {phase === "form" ? (
              <>
                <p id={descId} className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Tell us why you are leaving. We&apos;ll confirm by email and notify our team.
                </p>
                {props.hasQueuedPlanUpgrade ? (
                  <div className="mt-5 rounded-xl border border-amber-500/35 bg-amber-950/30 px-4 py-4 text-sm leading-relaxed text-amber-50/95">
                    <p>
                      You have a <span className="font-semibold">queued plan upgrade</span>. Cancelling Stripe stops
                      renewal at the end of this billing period; by default we keep that queue so your new tier can still
                      apply when your current monthly try-on bucket is fully used. Uncheck below only if you want to drop
                      it.
                    </p>
                    <label className="mt-4 flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={alsoRemoveQueuedUpgrade}
                        onChange={(e) => setAlsoRemoveQueuedUpgrade(e.target.checked)}
                        className="mt-1 border-white/30 bg-zinc-900 text-[#c6a77d] focus:ring-[#c6a77d]/40"
                      />
                      <span className="text-zinc-200">
                        Also remove my queued plan upgrade from this storefront key{" "}
                        <span className="font-normal text-zinc-500">(optional)</span>
                      </span>
                    </label>
                  </div>
                ) : null}

                <fieldset className="mt-6 space-y-3 border-0 p-0">
                  <legend className="sr-only">Cancellation reason</legend>
                  {SUBSCRIPTION_CANCELLATION_REASONS.map((code) => (
                    <label
                      key={code}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 transition hover:border-[#c6a77d]/25"
                    >
                      <input
                        type="radio"
                        name="cancel-reason"
                        value={code}
                        checked={reason === code}
                        onChange={() => setReason(code)}
                        className="mt-1 border-white/30 bg-zinc-900 text-[#c6a77d] focus:ring-[#c6a77d]/40"
                      />
                      <span className="text-sm text-zinc-200">{SUBSCRIPTION_CANCELLATION_REASON_LABELS[code]}</span>
                    </label>
                  ))}
                </fieldset>

                <label className="mt-5 block">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Additional comments <span className="font-normal normal-case text-zinc-600">(optional)</span>
                  </span>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value.slice(0, 2000))}
                    rows={3}
                    placeholder="Anything else we should know…"
                    className="mt-2 w-full resize-y rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-[#c6a77d]/25 placeholder:text-zinc-600 focus:border-[#c6a77d]/40 focus:ring-2"
                  />
                </label>

                {error ? (
                  <p className="mt-4 text-sm text-red-300/90" role="alert">
                    {error}
                  </p>
                ) : null}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPhase("step2")}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-transparent px-5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onConfirm()}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-red-400/45 bg-red-600/90 px-5 text-sm font-semibold text-white shadow-lg shadow-red-950/40 transition hover:bg-red-600 disabled:opacity-50"
                  >
                    {busy ? "Processing…" : "Confirm cancellation"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
