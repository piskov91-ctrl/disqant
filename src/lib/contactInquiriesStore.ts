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

export type ContactInquiryInput = Omit<ContactInquiryRecord, "id" | "createdAt" | "read">;

/**
 * Persist a new contact form submission (Redis). Increments unread counter.
 */
export async function recordContactInquiry(fields: ContactInquiryInput): Promise<string> {
  const redis = getRedis();
  const id = crypto.randomUUID();
  const row: ContactInquiryRecord = {
    id,
    createdAt: new Date().toISOString(),
    read: false,
    ...fields,
  };
  await redis.set(recordKey(id), JSON.stringify(row));
  await redis.lpush(INDEX_KEY, id);
  await redis.ltrim(INDEX_KEY, 0, CONTACT_INQUIRIES_INDEX_MAX - 1);
  await redis.incr(UNREAD_KEY);
  return id;
}

export async function getUnreadContactInquiryCount(): Promise<number> {
  const redis = getRedis();
  const raw = await redis.get(UNREAD_KEY);
  const n = raw == null ? 0 : Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function listContactInquiries(limit: number): Promise<ContactInquiryRecord[]> {
  const redis = getRedis();
  const cap = Math.min(Math.max(limit, 1), CONTACT_INQUIRIES_INDEX_MAX);
  const ids = (await redis.lrange(INDEX_KEY, 0, cap - 1)) as string[] | null;
  if (!ids?.length) return [];
  const keys = ids.map(recordKey);
  const rowsRaw = (await redis.mget(...keys)) as unknown[];
  const out: ContactInquiryRecord[] = [];
  for (let i = 0; i < ids.length; i++) {
    const raw = rowsRaw[i];
    if (raw == null) continue;
    try {
      out.push(JSON.parse(String(raw)) as ContactInquiryRecord);
    } catch {
      /* skip corrupt */
    }
  }
  return out;
}

async function syncUnreadCountFromIndex(): Promise<number> {
  const redis = getRedis();
  const ids = (await redis.lrange(INDEX_KEY, 0, CONTACT_INQUIRIES_INDEX_MAX - 1)) as string[] | null;
  if (!ids?.length) {
    await redis.set(UNREAD_KEY, "0");
    return 0;
  }
  const keys = ids.map(recordKey);
  const rowsRaw = (await redis.mget(...keys)) as unknown[];
  let unread = 0;
  for (const raw of rowsRaw) {
    if (raw == null) continue;
    try {
      const row = JSON.parse(String(raw)) as ContactInquiryRecord;
      if (!row.read) unread++;
    } catch {
      /* skip */
    }
  }
  await redis.set(UNREAD_KEY, String(unread));
  return unread;
}

/** Marks every indexed inquiry as read and realigns the unread counter from index contents. */
export async function markAllContactInquiriesRead(): Promise<void> {
  const redis = getRedis();
  const ids = (await redis.lrange(INDEX_KEY, 0, CONTACT_INQUIRIES_INDEX_MAX - 1)) as string[] | null;
  if (!ids?.length) {
    await redis.set(UNREAD_KEY, "0");
    return;
  }
  const keys = ids.map(recordKey);
  const rowsRaw = (await redis.mget(...keys)) as unknown[];
  for (let i = 0; i < ids.length; i++) {
    const raw = rowsRaw[i];
    if (raw == null) continue;
    try {
      const row = JSON.parse(String(raw)) as ContactInquiryRecord;
      if (!row.read) {
        row.read = true;
        await redis.set(recordKey(String(ids[i]).trim()), JSON.stringify(row));
      }
    } catch {
      /* skip */
    }
  }
  await syncUnreadCountFromIndex();
}

/** Marks inquiry read and decrements unread counter once. Returns false if id unknown. */
export async function markContactInquiryRead(id: string): Promise<boolean> {
  const trimmed = id.trim();
  if (!trimmed) return false;

  const redis = getRedis();
  const key = recordKey(trimmed);
  const raw = await redis.get(key);
  if (raw == null) return false;

  let row: ContactInquiryRecord;
  try {
    row = JSON.parse(String(raw)) as ContactInquiryRecord;
  } catch {
    return false;
  }

  if (row.read) return true;

  row.read = true;
  await redis.set(key, JSON.stringify(row));
  const nextUnread = await redis.decr(UNREAD_KEY);
  const n = typeof nextUnread === "number" ? nextUnread : Number.parseInt(String(nextUnread), 10);
  if (Number.isFinite(n) && n < 0) {
    await redis.set(UNREAD_KEY, "0");
  }

  return true;
}
