import crypto from "node:crypto";
/**
 * Redis: use `getRedis()` from `@/lib/apiKeyStore` only — one shared Upstash singleton for the whole app (do not call `new Redis()` here).
 * Feedback keys live under `fit-room:subscriptionsFeedback:`; client keys under `fit-room:clientKeys:*` — same DB, disjoint prefixes.
 */
import type { TestimonialSlide } from "@/data/marketingTestimonialSlides";
import { getRedis } from "@/lib/apiKeyStore";

/** Record JSON lives at `${FIT_ROOM_SUBSCRIPTIONS_FEEDBACK_KEY_PREFIX}<uuid>` */
export const FIT_ROOM_SUBSCRIPTIONS_FEEDBACK_KEY_PREFIX = "fit-room:subscriptionsFeedback:" as const;
/** Redis list IDs (newest first) for moderation queue consumed by `/api/admin/subscriptions-reviews`. */
export const FIT_ROOM_SUBSCRIPTIONS_FEEDBACK_PENDING_LIST_KEY =
  "fit-room:subscriptionsFeedback:pending:index" as const;

const RECORD_PREFIX = FIT_ROOM_SUBSCRIPTIONS_FEEDBACK_KEY_PREFIX;
const PENDING_INDEX = FIT_ROOM_SUBSCRIPTIONS_FEEDBACK_PENDING_LIST_KEY;
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

/**
 * Upstash REST returns deserialized JSON objects by default when reading values written via `set(key, object)`.
 * Older rows were stored as `JSON.stringify`; accept plain strings too.
 */
function redisFeedbackValueToParsedRecord(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
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

/**
 * IDs in {@link FIT_ROOM_SUBSCRIPTIONS_FEEDBACK_PENDING_LIST_KEY} must resolve from JSON at
 * {@link FIT_ROOM_SUBSCRIPTIONS_FEEDBACK_KEY_PREFIX}`<id>` — tolerate older blobs missing `status` / `storeName`.
 */
function parsePendingIndexedJson(parsed: Record<string, unknown>, indexId: string): SubscriptionsFeedbackRecord | null {
  if (parsed.status === "approved") return null;

  const strict = coerceRecord(parsed, indexId);
  if (strict?.status === "pending") return strict;

  const st = parsed.status;
  if (st !== undefined && st !== null && st !== "" && st !== "pending") return null;

  const id = typeof parsed.id === "string" ? parsed.id : indexId;
  const createdAt = typeof parsed.createdAt === "string" ? parsed.createdAt : "";
  const ratingRaw = parsed.rating;
  const rating = typeof ratingRaw === "number" ? ratingRaw : Number(ratingRaw);
  const message = typeof parsed.message === "string" ? parsed.message : "";
  const rawStore = typeof parsed.storeName === "string" ? parsed.storeName.trim() : "";
  const storeName = rawStore.length >= 2 ? rawStore : "(legacy submission — no store name)";

  if (!createdAt.length || !Number.isFinite(Date.parse(createdAt))) return null;
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;

  return {
    id,
    createdAt,
    rating: Math.round(rating),
    message,
    storeName,
    status: "pending",
  };
}

async function hydratePendingByIds(ids: string[]): Promise<SubscriptionsFeedbackRecord[]> {
  if (ids.length === 0) return [];
  const redis = getRedis();
  const rows: SubscriptionsFeedbackRecord[] = [];

  const rawList = await Promise.all(ids.map((did) => redis.get<SubscriptionsFeedbackRecord>(recordKey(did))));

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!;
    const raw = rawList[i];
    const parsed = redisFeedbackValueToParsedRecord(raw);
    if (!parsed) {
      console.warn("[fit-room][subscriptions-feedback][hydrate] SKIP — no Redis value for indexed id", {
        id,
        recordKey: recordKey(id),
      });
      continue;
    }
    const row = parsePendingIndexedJson(parsed, id);
    if (!row || row.status !== "pending") {
      console.warn("[fit-room][subscriptions-feedback][hydrate] SKIP — not a pending payload for indexed id", {
        id,
        parsedStatus: parsed.status,
        resolved: !!row,
      });
      continue;
    }
    rows.push(row);
  }
  return rows;
}

async function hydrateApprovedByIds(ids: string[]): Promise<SubscriptionsFeedbackRecord[]> {
  if (ids.length === 0) return [];
  const redis = getRedis();
  const rows: SubscriptionsFeedbackRecord[] = [];
  const rawList = await Promise.all(ids.map((did) => redis.get<SubscriptionsFeedbackRecord>(recordKey(did))));

  for (let i = 0; i < ids.length; i++) {
    const raw = rawList[i];
    const parsed = redisFeedbackValueToParsedRecord(raw);
    if (!parsed) continue;
    const row = coerceRecord(parsed, ids[i]!);
    if (row && row.status === "approved") rows.push(row);
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

  const key = recordKey(id);

  console.log("[feedback-debug] RECORD_PREFIX:", RECORD_PREFIX);
  console.log("[feedback-debug] writing to key:", key, "(object row, Upstash-serialized)");

  /**
   * Store plain object — `@upstash/redis` serializes consistently with typed GET deserialization (avoid manual JSON.stringify).
   * Sequential commands; auto-pipelining disabled on `getRedis()`.
   */
  await redis.set(key, row);
  await redis.lpush(PENDING_INDEX, id);
  await redis.ltrim(PENDING_INDEX, 0, SUBSCRIPTIONS_FEEDBACK_INDEX_MAX - 1);

  await redis.lpush(LEGACY_INDEX, id).catch(() => undefined);
  await redis.ltrim(LEGACY_INDEX, 0, SUBSCRIPTIONS_FEEDBACK_INDEX_MAX - 1).catch(() => undefined);

  try {
    const lenRaw = await redis.llen(PENDING_INDEX);
    const pendingLen = typeof lenRaw === "number" && Number.isFinite(lenRaw) ? Math.floor(lenRaw) : NaN;
    console.log("[fit-room][subscriptions-feedback][redis] write complete", {
      id,
      recordKey: recordKey(id),
      pendingIndexLength: pendingLen,
    });
  } catch (diagErr: unknown) {
    console.warn("[fit-room][subscriptions-feedback][redis] post-write llen diagnostics failed", {
      message: diagErr instanceof Error ? diagErr.message : String(diagErr),
    });
  }

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
  const hydrated = await hydratePendingByIds(ids);

  if (ids.length !== hydrated.length) {
    const kept = new Set(hydrated.map((r) => r.id));
    const dropped = ids.filter((x) => !kept.has(x));
    console.warn("[fit-room][subscriptions-feedback][listPending] hydrated fewer rows than pending index IDs", {
      pendingIndexRawCount: ids.length,
      hydratedCount: hydrated.length,
      ghostOrDroppedIds: dropped.slice(0, 50),
      droppedTruncated: dropped.length > 50,
    });
  } else if (process.env.NODE_ENV === "development" && ids.length > 0) {
    console.log("[fit-room][subscriptions-feedback][listPending] hydrate OK", {
      pendingIds: ids.length,
      hydratedRows: hydrated.length,
    });
  }

  return hydrated;
}

export async function listApprovedSubscriptionsFeedback(limit = 80): Promise<SubscriptionsFeedbackRecord[]> {
  const cap = Math.max(1, Math.min(limit, SUBSCRIPTIONS_FEEDBACK_INDEX_MAX));
  const redis = getRedis();
  const ids = ((await redis.lrange(APPROVED_INDEX, 0, cap - 1)) as string[]) ?? [];
  return hydrateApprovedByIds(ids);
}

/** Slides for marketing carousels (home + subscriptions) — approved Redis reviews, permanent until an admin deletes the record. */
export function mapApprovedSubscriptionsFeedbackToSlides(records: SubscriptionsFeedbackRecord[]): TestimonialSlide[] {
  return records.map((r) => ({
    id: r.id,
    rating: r.rating,
    quote: r.message,
    attribution: `— ${r.storeName}`,
  }));
}

export async function approveSubscriptionsFeedback(id: string): Promise<void> {
  const cleaned = id.trim();
  if (!cleaned.length) throw new Error("Missing id.");

  const redis = getRedis();
  const raw = await redis.get<SubscriptionsFeedbackRecord>(recordKey(cleaned));
  const parsed = redisFeedbackValueToParsedRecord(raw);
  if (!parsed) throw new Error("Review not found.");

  const current = parsePendingIndexedJson(parsed, cleaned);
  if (!current) throw new Error("Review cannot be moderated.");
  if (current.status !== "pending") throw new Error("Only pending feedback can be approved.");

  const updated: SubscriptionsFeedbackRecord = { ...current, status: "approved" };
  await redis.set(recordKey(cleaned), updated);
  await redis.lrem(PENDING_INDEX, 0, cleaned);
  await redis.lpush(APPROVED_INDEX, cleaned);
  await redis.ltrim(APPROVED_INDEX, 0, SUBSCRIPTIONS_FEEDBACK_INDEX_MAX - 1);
}

export async function rejectSubscriptionsFeedback(id: string): Promise<void> {
  const cleaned = id.trim();
  if (!cleaned.length) throw new Error("Missing id.");

  const redis = getRedis();
  await redis.lrem(PENDING_INDEX, 0, cleaned);
  await redis.lrem(LEGACY_INDEX, 0, cleaned).catch(() => undefined);
  await redis.del(recordKey(cleaned));
}

/** Removes a review regardless of status (pending or approved): all known indexes + record key. */
export async function deleteSubscriptionsFeedback(id: string): Promise<void> {
  const cleaned = id.trim();
  if (!cleaned.length) throw new Error("Missing id.");

  const redis = getRedis();
  await redis.lrem(PENDING_INDEX, 0, cleaned);
  await redis.lrem(APPROVED_INDEX, 0, cleaned);
  await redis.lrem(LEGACY_INDEX, 0, cleaned).catch(() => undefined);
  await redis.del(recordKey(cleaned));
}
