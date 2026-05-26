"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import {
  SUBSCRIPTION_CANCELLATION_REASON_LABELS,
  SUBSCRIPTION_CANCELLATION_REASONS,
  type SubscriptionCancellationReasonCode,
} from "@/lib/subscriptionCancellation";

export type DashboardStripeSubscriptionCancelWizardProps = {
  open: boolean;
  onClose: () => void;
  /** Stripe subscription id to cancel-at-period-end; server rejects ids that don’t belong to this retailer. */
  stripeSubscriptionId: string | null;
  planDisplayName: string;
  hasQueuedPlanUpgrade: boolean;
};

type CancelPhase = "step1" | "step2" | "form";

export function DashboardStripeSubscriptionCancelWizard({
  open,
  onClose,
  stripeSubscriptionId,
  planDisplayName,
  hasQueuedPlanUpgrade,
}: DashboardStripeSubscriptionCancelWizardProps) {
  const router = useRouter();
  const dialogTitleId = useId();
  const descId = useId();
  const [phase, setPhase] = useState<CancelPhase>("step1");
  const [reason, setReason] = useState<SubscriptionCancellationReasonCode>("too_expensive");
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alsoRemoveQueuedUpgrade, setAlsoRemoveQueuedUpgrade] = useState(false);

  const planLabelShort = planDisplayName.trim() || "subscription";

  useEffect(() => {
    if (!open) return;
    setPhase("step1");
    setError(null);
    setAlsoRemoveQueuedUpgrade(false);
  }, [open, stripeSubscriptionId]);

  const close = useCallback(() => {
    if (busy) return;
    setError(null);
    setAlsoRemoveQueuedUpgrade(false);
    onClose();
  }, [busy, onClose]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

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
          clearPendingPlan: Boolean(hasQueuedPlanUpgrade && alsoRemoveQueuedUpgrade),
          stripeSubscriptionId,
        }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setError(data.error || "Could not cancel subscription.");
        return;
      }
      setComments("");
      setAlsoRemoveQueuedUpgrade(false);
      onClose();
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
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
          Cancel Stripe subscription
        </h2>

        {phase === "step1" ? (
          <>
            <p id={descId} className="mt-4 text-sm leading-relaxed text-zinc-200">
              Cancel only your <span className="font-semibold text-zinc-100">{planLabelShort}</span> billed plan? This stops
              renewal at the end of the current Stripe billing period. Other storefront keys stay as they are.
            </p>
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={close}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-transparent px-5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06]"
              >
                Stay subscribed
              </button>
              <button
                type="button"
                onClick={() => setPhase("step2")}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#c6a77d]/40 bg-[#c6a77d]/12 px-5 text-sm font-semibold text-[#f0e6d8] shadow-sm transition hover:border-[#d4bc94]/55 hover:bg-[#c6a77d]/20"
              >
                Continue
              </button>
            </div>
          </>
        ) : null}

        {phase === "step2" ? (
          <>
            <p id={descId} className="mt-4 text-sm leading-relaxed text-zinc-200">
              This schedules cancel-at-period-end for this subscription only. Your access continues through the current
              period. This cannot be undone from here. Confirm cancellation?
            </p>
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPhase("step1")}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-transparent px-5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06]"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={() => setPhase("form")}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-red-400/45 bg-red-600/90 px-5 text-sm font-semibold text-white shadow-lg shadow-red-950/40 transition hover:bg-red-600"
              >
                Yes, cancel this plan
              </button>
            </div>
          </>
        ) : null}

        {phase === "form" ? (
          <>
            <p id={descId} className="mt-2 text-sm leading-relaxed text-zinc-400">
              Tell us why you are leaving. We&apos;ll confirm by email and notify our team.
            </p>
            {hasQueuedPlanUpgrade ? (
              <div className="mt-5 rounded-xl border border-amber-500/35 bg-amber-950/30 px-4 py-4 text-sm leading-relaxed text-amber-50/95">
                <p>
                  You have a <span className="font-semibold">queued plan upgrade</span>. Cancelling Stripe stops renewal
                  for this subscription only; by default we keep that queue so your new tier can still apply when this
                  plan&apos;s monthly try-on bucket is fully used.
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
                    name="cancel-reason-modal"
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
                Go back
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
  );
}
