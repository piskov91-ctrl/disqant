"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import {
  SUBSCRIPTION_CANCELLATION_REASON_LABELS,
  SUBSCRIPTION_CANCELLATION_REASONS,
  type SubscriptionCancellationReasonCode,
} from "@/lib/subscriptionCancellation";

export type DashboardSubscriptionBillingProps = {
  canRequestCancellation: boolean;
  cancellationScheduled: boolean;
  accessUntilIso: string | null;
  canceledAtIso: string | null;
  cancellationReasonLabel: string | null;
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

export function DashboardCancelSubscriptionPanel(props: DashboardSubscriptionBillingProps) {
  const router = useRouter();
  const dialogTitleId = useId();
  const descId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<SubscriptionCancellationReasonCode>("too_expensive");
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
    setError(null);
  }, [busy]);

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
        body: JSON.stringify({ reason, comments: comments.trim() }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setError(data.error || "Could not cancel subscription.");
        return;
      }
      setOpen(false);
      setComments("");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 border-t border-[#c6a77d]/15 pt-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d4bc94]/85">
        Subscription
      </p>

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
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-red-400/35 bg-red-500/[0.08] px-4 py-3 text-sm font-semibold text-red-100/95 transition hover:border-red-400/50 hover:bg-red-500/[0.12]"
          >
            Cancel subscription
          </button>
        </>
      ) : null}

      {open ? (
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
            <p id={descId} className="mt-2 text-sm leading-relaxed text-zinc-400">
              Tell us why you are leaving. We&apos;ll confirm by email and notify our team.
            </p>

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
                onClick={close}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-transparent px-5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                Back
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
