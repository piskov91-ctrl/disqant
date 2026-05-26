/** Stored on {@link RetailerUser} and sent to support. */
export const SUBSCRIPTION_CANCELLATION_REASONS = [
  "too_expensive",
  "not_enough_tryons",
  "switching_service",
  "store_closing",
  "just_testing",
  "other",
] as const;

export type SubscriptionCancellationReasonCode = (typeof SUBSCRIPTION_CANCELLATION_REASONS)[number];

export const SUBSCRIPTION_CANCELLATION_REASON_LABELS: Record<SubscriptionCancellationReasonCode, string> = {
  too_expensive: "Too expensive",
  not_enough_tryons: "Not enough try-ons",
  switching_service: "Switching to another service",
  store_closing: "Store is closing",
  just_testing: "Just testing",
  other: "Other",
};

export function parseSubscriptionCancellationPayload(raw: unknown): {
  reason: SubscriptionCancellationReasonCode;
  comments: string;
  /** When true, clears queued plan fields on the linked API key after Stripe cancellation is scheduled. */
  clearPendingPlan: boolean;
  /** When set, schedule cancel only for this Stripe subscription (must belong to the signed-in retailer). */
  stripeSubscriptionId: string | null;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const reason = o.reason;
  if (typeof reason !== "string" || !SUBSCRIPTION_CANCELLATION_REASONS.includes(reason as SubscriptionCancellationReasonCode)) {
    return null;
  }
  const commentsRaw = o.comments;
  const comments =
    typeof commentsRaw === "string" ? commentsRaw.trim().slice(0, 2000) : "";
  const clearPendingPlan = o.clearPendingPlan === true;
  const sidRaw = o.stripeSubscriptionId;
  const stripeSubscriptionId =
    typeof sidRaw === "string" && sidRaw.trim().length > 0 ? sidRaw.trim() : null;
  return { reason: reason as SubscriptionCancellationReasonCode, comments, clearPendingPlan, stripeSubscriptionId };
}
