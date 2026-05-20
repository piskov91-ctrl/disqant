import crypto from "node:crypto";
import { getRedis } from "@/lib/apiKeyStore";

const RECORD_PREFIX = "fit-room:subscriptionsFeedback:";
const PENDING_INDEX = "fit-room:subscriptionsFeedback:pending:index";
const APPROVED_INDEX = "fit-room:subscriptionsFeedback:approved:index";

/** @deprecated Old flat index kept for diagnostics; new submissions also push here best-effort. */
const LEGACY_INDEX = "fit-room:subscriptionsFeedback:index";

/** Updated when admin successfully loads `/api/admin/subscriptions-reviews` (pending list); badge counts pending rows newer than this. */
const ADMIN_REVIEWS_LAST_SEEN_AT = "fit-room:subscriptionsFeedback:adminReviewsLastSeenAt";

export const SUBSCRIPTIONS_FEEDBACK_INDEX_MAX = 300;

export type SubscriptionsFeedbackStatus = "pending" | "approved";

export type SubscriptionsFeedbackRecord = {
  id: string;
  createdAt: string;
  /** 1–5 */
  rating: number;
  message: string;
  storeName: string;
  status: SubscriptionsFeedbackStatus;
};

function recordKey(id: string) {
  return `${RECORD_PREFIX}${id}`;
}

function coerceRecord(parsed: Record<string, unknown>, idFallback: string): SubscriptionsFeedbackRecord | null {
  const id = typeof parsed.id === "string" ? parsed.id : idFallback;
  const createdAt = typeof parsed.createdAt === "string" ? parsed.createdAt : "";
  const ratingRaw = parsed.rating;
  const rating = typeof ratingRaw === "number" ? ratingRaw : Number(ratingRaw);
  const message = typeof parsed.message === "string" ? parsed.message : "";
  const storeName = typeof parsed.storeName === "string" ? parsed.storeName.trim() : "";
  const rawStatus = parsed.status;

  let status: SubscriptionsFeedbackStatus;
  if (rawStatus === "pending" || rawStatus === "approved") {
    status = rawStatus;
  } else if (parsed.status === undefined && message.length > 0) {
    /** Legacy archived rows lack status — never shown as pending/public. */
    return null;
  } else {
    return null;
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
  if (!createdAt) return null;
  if (!storeName) return null;

  return { id, createdAt, rating: Math.round(rating), message, storeName, status };
}

async function hydratePendingByIds(ids: string[]): Promise<SubscriptionsFeedbackRecord[]> {
  if (ids.length === 0) return [];
  const redis = getRedis();
  const rows: SubscriptionsFeedbackRecord[] = [];

  const rawList = await Promise.all(ids.map((did) => redis.get(recordKey(did)) as Promise<string | null>));

  for (let i = 0; i < ids.length; i++) {
    const raw = rawList[i];
    if (!raw || typeof raw !== "string") continue;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const row = coerceRecord(parsed, ids[i]!);
      if (row && row.status === "pending") rows.push(row);
    } catch {
      /* skip */
    }
  }
  return rows;
}

async function hydrateApprovedByIds(ids: string[]): Promise<SubscriptionsFeedbackRecord[]> {
  if (ids.length === 0) return [];
  const redis = getRedis();
  const rows: SubscriptionsFeedbackRecord[] = [];
  const rawList = await Promise.all(ids.map((did) => redis.get(recordKey(did)) as Promise<string | null>));

  for (let i = 0; i < ids.length; i++) {
    const raw = rawList[i];
    if (!raw || typeof raw !== "string") continue;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const row = coerceRecord(parsed, ids[i]!);
      if (row && row.status === "approved") rows.push(row);
    } catch {
      /* skip */
    }
  }
  return rows;
}

/** Queues moderated feedback (pending until admin approve). */
export async function recordPendingSubscriptionsFeedback(fields: {
  storeName: string;
  rating: number;
  message: string;
}): Promise<string> {
  const redis = getRedis();
  const id = crypto.randomUUID();
  const row: SubscriptionsFeedbackRecord = {
    id,
    createdAt: new Date().toISOString(),
    rating: fields.rating,
    message: fields.message,
    storeName: fields.storeName.trim(),
    status: "pending",
  };

  await redis.set(recordKey(id), JSON.stringify(row));
  await redis.lpush(PENDING_INDEX, id);
  await redis.ltrim(PENDING_INDEX, 0, SUBSCRIPTIONS_FEEDBACK_INDEX_MAX - 1);

  await redis.lpush(LEGACY_INDEX, id).catch(() => undefined);
  await redis.ltrim(LEGACY_INDEX, 0, SUBSCRIPTIONS_FEEDBACK_INDEX_MAX - 1).catch(() => undefined);

  return id;
}

export async function getPendingSubscriptionsFeedbackCount(): Promise<number> {
  const redis = getRedis();
  const n = await redis.llen(PENDING_INDEX);
  return typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export async function getAdminSubscriptionsReviewsLastSeenAt(): Promise<string | null> {
  const redis = getRedis();
  const v = (await redis.get(ADMIN_REVIEWS_LAST_SEEN_AT)) as string | null;
  const t = typeof v === "string" ? v.trim() : "";
  return t.length > 0 ? t : null;
}

/** Call after admin pulls the pending list so badge reflects only submissions newer than this instant. */
export async function touchAdminSubscriptionsReviewsSeenAt(isoTimestamp?: string): Promise<void> {
  const redis = getRedis();
  await redis.set(ADMIN_REVIEWS_LAST_SEEN_AT, isoTimestamp ?? new Date().toISOString());
}

/** Pending rows submitted after {@link getAdminSubscriptionsReviewsLastSeenAt} (unset → all pending are unread). */
export async function getUnreadPendingSubscriptionsFeedbackCount(
  limit = SUBSCRIPTIONS_FEEDBACK_INDEX_MAX,
): Promise<number> {
  const [pending, lastSeen] = await Promise.all([
    listPendingSubscriptionsFeedback(Math.max(1, Math.min(limit, SUBSCRIPTIONS_FEEDBACK_INDEX_MAX))),
    getAdminSubscriptionsReviewsLastSeenAt(),
  ]);

  if (!lastSeen || !Number.isFinite(Date.parse(lastSeen))) {
    return pending.length;
  }

  const cutoff = Date.parse(lastSeen);
  return pending.reduce((acc, r) => acc + (Date.parse(r.createdAt) > cutoff ? 1 : 0), 0);
}

export async function listPendingSubscriptionsFeedback(limit = 100): Promise<SubscriptionsFeedbackRecord[]> {
  const cap = Math.max(1, Math.min(limit, SUBSCRIPTIONS_FEEDBACK_INDEX_MAX));
  const redis = getRedis();
  const ids = ((await redis.lrange(PENDING_INDEX, 0, cap - 1)) as string[]) ?? [];
  return hydratePendingByIds(ids);
}

export async function listApprovedSubscriptionsFeedback(limit = 80): Promise<SubscriptionsFeedbackRecord[]> {
  const cap = Math.max(1, Math.min(limit, SUBSCRIPTIONS_FEEDBACK_INDEX_MAX));
  const redis = getRedis();
  const ids = ((await redis.lrange(APPROVED_INDEX, 0, cap - 1)) as string[]) ?? [];
  return hydrateApprovedByIds(ids);
}

export async function approveSubscriptionsFeedback(id: string): Promise<void> {
  const cleaned = id.trim();
  if (!cleaned.length) throw new Error("Missing id.");

  const redis = getRedis();
  const raw = (await redis.get(recordKey(cleaned))) as string | null;
  if (!raw) throw new Error("Review not found.");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Review data is unreadable.");
  }

  const current = coerceRecord(parsed, cleaned);
  if (!current) throw new Error("Review cannot be moderated.");
  if (current.status !== "pending") throw new Error("Only pending feedback can be approved.");

  const updated: SubscriptionsFeedbackRecord = { ...current, status: "approved" };
  await redis.set(recordKey(cleaned), JSON.stringify(updated));
  await redis.lrem(PENDING_INDEX, 0, cleaned);
  await redis.lpush(APPROVED_INDEX, cleaned);
  await redis.ltrim(APPROVED_INDEX, 0, SUBSCRIPTIONS_FEEDBACK_INDEX_MAX - 1);
}

export async function rejectSubscriptionsFeedback(id: string): Promise<void> {
  const cleaned = id.trim();
  if (!cleaned.length) throw new Error("Missing id.");

  const redis = getRedis();
  await redis.lrem(PENDING_INDEX, 0, cleaned);
  await redis.del(recordKey(cleaned));
}
