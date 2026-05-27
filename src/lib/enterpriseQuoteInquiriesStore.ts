import crypto from "node:crypto";
import { getRedis } from "@/lib/apiKeyStore";

const RECORD_PREFIX = "fit-room:enterpriseQuote:";
const INDEX_KEY = "fit-room:enterpriseQuotes:index";
const UNREAD_KEY = "fit-room:enterpriseQuotes:unreadCount";
export const ENTERPRISE_QUOTE_INDEX_MAX = 500;

export type EnterpriseQuoteRecord = {
  id: string;
  createdAt: string;
  read: boolean;
  email: string;
  storeName: string;
  message: string;
  /** Legacy fields from older quote forms (optional on new submissions). */
  websiteUrl?: string;
  monthlyVisitors?: string;
  monthlyVisitorsLabel?: string;
  platform?: string;
  platformLabel?: string;
};

export type EnterpriseQuoteInput = {
  email: string;
  storeName: string;
  message: string;
};

function recordKey(id: string) {
  return `${RECORD_PREFIX}${id}`;
}

function normalizeRedisIdList(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const x of ids) {
    if (typeof x === "string") {
      const t = x.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

/** Upstash may return objects; older rows were JSON strings. */
export function parseStoredEnterpriseQuote(raw: unknown): EnterpriseQuoteRecord | null {
  if (raw == null) return null;

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const r = parsed as Partial<EnterpriseQuoteRecord>;

  const id = typeof r.id === "string" ? r.id.trim() : "";
  const email = typeof r.email === "string" ? r.email.trim() : "";
  const storeName = typeof r.storeName === "string" ? r.storeName.trim() : "";
  const createdAt = typeof r.createdAt === "string" ? r.createdAt : "";
  const read = typeof r.read === "boolean" ? r.read : false;
  const message = typeof r.message === "string" ? r.message : "";
  const websiteUrl = typeof r.websiteUrl === "string" ? r.websiteUrl : undefined;
  const monthlyVisitors = typeof r.monthlyVisitors === "string" ? r.monthlyVisitors : undefined;
  const monthlyVisitorsLabel =
    typeof r.monthlyVisitorsLabel === "string" ? r.monthlyVisitorsLabel : undefined;
  const platform = typeof r.platform === "string" ? r.platform : undefined;
  const platformLabel = typeof r.platformLabel === "string" ? r.platformLabel : undefined;

  if (!id || !storeName || !createdAt) return null;

  return {
    id,
    createdAt,
    read,
    email,
    storeName,
    message,
    ...(websiteUrl ? { websiteUrl } : {}),
    ...(monthlyVisitors ? { monthlyVisitors } : {}),
    ...(monthlyVisitorsLabel ? { monthlyVisitorsLabel } : {}),
    ...(platform ? { platform } : {}),
    ...(platformLabel ? { platformLabel } : {}),
  };
}

export async function recordEnterpriseQuote(fields: EnterpriseQuoteInput): Promise<string> {
  const redis = getRedis();
  const id = crypto.randomUUID();
  const row: EnterpriseQuoteRecord = {
    id,
    createdAt: new Date().toISOString(),
    read: false,
    ...fields,
  };
  await redis.set(recordKey(id), row);
  await redis.lpush(INDEX_KEY, id);
  await redis.ltrim(INDEX_KEY, 0, ENTERPRISE_QUOTE_INDEX_MAX - 1);
  await syncUnreadEnterpriseQuotesFromIndex();
  return id;
}

async function syncUnreadEnterpriseQuotesFromIndex(): Promise<number> {
  const redis = getRedis();
  const idsRaw = await redis.lrange(INDEX_KEY, 0, ENTERPRISE_QUOTE_INDEX_MAX - 1);
  const ids = normalizeRedisIdList(idsRaw);
  if (!ids.length) {
    await redis.set(UNREAD_KEY, "0");
    return 0;
  }
  const keys = ids.map(recordKey);
  const rowsRaw = keys.length ? ((await redis.mget(...keys)) as unknown[]) : [];
  let unread = 0;
  for (const raw of rowsRaw) {
    const row = parseStoredEnterpriseQuote(raw);
    if (row && !row.read) unread++;
  }
  await redis.set(UNREAD_KEY, String(unread));
  return unread;
}

export async function getUnreadEnterpriseQuoteCount(): Promise<number> {
  return syncUnreadEnterpriseQuotesFromIndex();
}

export async function listEnterpriseQuotes(limit: number): Promise<EnterpriseQuoteRecord[]> {
  const redis = getRedis();
  const cap = Math.min(Math.max(limit, 1), ENTERPRISE_QUOTE_INDEX_MAX);
  const idsRaw = await redis.lrange(INDEX_KEY, 0, cap - 1);
  const ids = normalizeRedisIdList(idsRaw);
  if (!ids.length) return [];
  const keys = ids.map(recordKey);
  const rowsRaw = keys.length ? ((await redis.mget(...keys)) as unknown[]) : [];
  const out: EnterpriseQuoteRecord[] = [];
  for (let i = 0; i < ids.length; i++) {
    const row = parseStoredEnterpriseQuote(rowsRaw[i]);
    if (row) out.push(row);
  }
  return out;
}

export async function getEnterpriseQuoteById(id: string): Promise<EnterpriseQuoteRecord | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;
  const redis = getRedis();
  const raw = await redis.get(recordKey(trimmed));
  return parseStoredEnterpriseQuote(raw);
}

export async function markAllEnterpriseQuotesRead(): Promise<void> {
  const redis = getRedis();
  const idsRaw = await redis.lrange(INDEX_KEY, 0, ENTERPRISE_QUOTE_INDEX_MAX - 1);
  const ids = normalizeRedisIdList(idsRaw);
  if (!ids.length) {
    await redis.set(UNREAD_KEY, "0");
    return;
  }
  const keys = ids.map(recordKey);
  const rowsRaw = keys.length ? ((await redis.mget(...keys)) as unknown[]) : [];
  for (let i = 0; i < ids.length; i++) {
    const row = parseStoredEnterpriseQuote(rowsRaw[i]);
    if (!row) continue;
    if (!row.read) {
      await redis.set(recordKey(ids[i]), { ...row, read: true });
    }
  }
  await syncUnreadEnterpriseQuotesFromIndex();
}

function redisTruthyCount(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v > 0;
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

export async function deleteEnterpriseQuote(id: string): Promise<boolean> {
  const trimmed = id.trim();
  if (!trimmed) return false;

  const redis = getRedis();
  const key = recordKey(trimmed);

  const [lremResult, existedResult] = await Promise.all([
    redis.lrem(INDEX_KEY, 0, trimmed),
    redis.exists(key),
  ]);

  const removedFromIndex = redisTruthyCount(lremResult);
  const hadRecordKey = redisTruthyCount(existedResult);

  await redis.del(key).catch(() => {});
  const { deleteInquiryThread } = await import("@/lib/inquiryConversationStore");
  await deleteInquiryThread("enterprise", trimmed);

  await syncUnreadEnterpriseQuotesFromIndex();

  return removedFromIndex || hadRecordKey;
}
