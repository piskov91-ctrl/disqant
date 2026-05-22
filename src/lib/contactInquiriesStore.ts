import crypto from "node:crypto";
import { getRedis } from "@/lib/apiKeyStore";

const RECORD_PREFIX = "fit-room:contactInquiry:";
const INDEX_KEY = "fit-room:contactInquiries:index";
const UNREAD_KEY = "fit-room:contactInquiries:unreadCount";
export const CONTACT_INQUIRIES_INDEX_MAX = 500;

export type ContactInquiryRecord = {
  id: string;
  createdAt: string;
  read: boolean;
  name: string;
  email: string;
  company: string;
  /** Resolved URL or "—". */
  websiteDisplay: string;
  monthlyVisitors: string;
  monthlyVisitorsLabel: string;
  message: string;
};

function recordKey(id: string) {
  return `${RECORD_PREFIX}${id}`;
}

/**
 * Upstash `@upstash/redis` often returns deserialized objects for GET/MGET; older rows may be JSON strings.
 * `JSON.parse(String(object))` throws — that left the admin Contact tab empty while `unreadCount` incr still showed a badge.
 */
export function parseStoredContactInquiry(raw: unknown): ContactInquiryRecord | null {
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
  const r = parsed as Partial<ContactInquiryRecord>;

  const id = typeof r.id === "string" ? r.id.trim() : "";
  const email = typeof r.email === "string" ? r.email.trim() : "";
  const name = typeof r.name === "string" ? r.name.trim() : "";
  const company = typeof r.company === "string" ? r.company.trim() : "";
  const message = typeof r.message === "string" ? r.message : "";
  const createdAt = typeof r.createdAt === "string" ? r.createdAt : "";
  const read = typeof r.read === "boolean" ? r.read : false;
  const websiteDisplay = typeof r.websiteDisplay === "string" ? r.websiteDisplay : "—";
  const monthlyVisitors = typeof r.monthlyVisitors === "string" ? r.monthlyVisitors : "";
  const monthlyVisitorsLabel = typeof r.monthlyVisitorsLabel === "string" ? r.monthlyVisitorsLabel : "";

  if (!id || !name || !createdAt) return null;

  return {
    id,
    createdAt,
    read,
    name,
    email,
    company: company || "—",
    websiteDisplay,
    monthlyVisitors,
    monthlyVisitorsLabel,
    message,
  };
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

export type ContactInquiryInput = Omit<ContactInquiryRecord, "id" | "createdAt" | "read">;

/**
 * Persist a new contact form submission (Redis list + record). Recalculates unread from indexed rows so the admin
 * badge matches what can be displayed.
 */
export async function recordContactInquiry(fields: ContactInquiryInput): Promise<string> {
  console.log("[fit-room][contactInquiry] recordContactInquiry called", {
    name: fields.name,
    email: fields.email,
    company: fields.company,
    websiteDisplay: fields.websiteDisplay,
    monthlyVisitors: fields.monthlyVisitors,
    monthlyVisitorsLabel: fields.monthlyVisitorsLabel,
    messageLength: fields.message.length,
    messagePreview:
      fields.message.length > 160 ? `${fields.message.slice(0, 160)}…` : fields.message,
  });

  try {
    const redis = getRedis();
    const id = crypto.randomUUID();
    const row: ContactInquiryRecord = {
      id,
      createdAt: new Date().toISOString(),
      read: false,
      ...fields,
    };
    const redisRecordKey = recordKey(id);
    /** Same pattern as API key records — Upstash persists JSON-friendly objects reliably for GET/MGET. */
    await redis.set(redisRecordKey, row);
    await redis.lpush(INDEX_KEY, id);
    await redis.ltrim(INDEX_KEY, 0, CONTACT_INQUIRIES_INDEX_MAX - 1);

    /** Single source of truth with list + record `read` flags (incr alone drifted from index / parse failures). */
    const unreadAfter = await syncUnreadCountFromIndex();

    console.log("[fit-room][contactInquiry] saved to Redis OK", {
      id,
      redisRecordKey,
      indexKey: INDEX_KEY,
      unreadCountAfterSync: unreadAfter,
    });

    return id;
  } catch (err) {
    console.error("[fit-room][contactInquiry] recordContactInquiry failed (Redis / getRedis)", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }
}

export async function getUnreadContactInquiryCount(): Promise<number> {
  return syncUnreadCountFromIndex();
}

export async function listContactInquiries(limit: number): Promise<ContactInquiryRecord[]> {
  const redis = getRedis();
  const cap = Math.min(Math.max(limit, 1), CONTACT_INQUIRIES_INDEX_MAX);
  const idsRaw = await redis.lrange(INDEX_KEY, 0, cap - 1);
  const ids = normalizeRedisIdList(idsRaw);
  if (!ids.length) return [];
  const keys = ids.map(recordKey);
  const rowsRaw = keys.length ? ((await redis.mget(...keys)) as unknown[]) : [];
  const out: ContactInquiryRecord[] = [];
  for (let i = 0; i < ids.length; i++) {
    const row = parseStoredContactInquiry(rowsRaw[i]);
    if (row) out.push(row);
  }
  return out;
}

export async function getContactInquiryById(id: string): Promise<ContactInquiryRecord | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;
  const redis = getRedis();
  const raw = await redis.get(recordKey(trimmed));
  return parseStoredContactInquiry(raw);
}

async function syncUnreadCountFromIndex(): Promise<number> {
  const redis = getRedis();
  const idsRaw = await redis.lrange(INDEX_KEY, 0, CONTACT_INQUIRIES_INDEX_MAX - 1);
  const ids = normalizeRedisIdList(idsRaw);
  if (!ids.length) {
    await redis.set(UNREAD_KEY, "0");
    return 0;
  }
  const keys = ids.map(recordKey);
  const rowsRaw = keys.length ? ((await redis.mget(...keys)) as unknown[]) : [];
  let unread = 0;
  for (const raw of rowsRaw) {
    const row = parseStoredContactInquiry(raw);
    if (row && !row.read) unread++;
  }
  await redis.set(UNREAD_KEY, String(unread));
  return unread;
}

/** Marks every indexed inquiry as read and realigns the unread counter from index contents. */
export async function markAllContactInquiriesRead(): Promise<void> {
  const redis = getRedis();
  const idsRaw = await redis.lrange(INDEX_KEY, 0, CONTACT_INQUIRIES_INDEX_MAX - 1);
  const ids = normalizeRedisIdList(idsRaw);
  if (!ids.length) {
    await redis.set(UNREAD_KEY, "0");
    return;
  }
  const keys = ids.map(recordKey);
  const rowsRaw = keys.length ? ((await redis.mget(...keys)) as unknown[]) : [];
  for (let i = 0; i < ids.length; i++) {
    const row = parseStoredContactInquiry(rowsRaw[i]);
    if (!row) continue;
    if (!row.read) {
      const next = { ...row, read: true };
      await redis.set(recordKey(ids[i]), next);
    }
  }
  await syncUnreadCountFromIndex();
}

/** Marks inquiry read and recomputes the unread tally. Returns false if id unknown / unparsable. */
export async function markContactInquiryRead(id: string): Promise<boolean> {
  const trimmed = id.trim();
  if (!trimmed) return false;

  const redis = getRedis();
  const key = recordKey(trimmed);
  const raw = await redis.get(key);
  const row = parseStoredContactInquiry(raw);
  if (!row) return false;

  if (row.read) return true;

  await redis.set(key, { ...row, read: true });
  await syncUnreadCountFromIndex();

  return true;
}
