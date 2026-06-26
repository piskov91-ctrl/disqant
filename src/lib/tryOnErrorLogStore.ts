import crypto from "node:crypto";
import { getRedis } from "@/lib/apiKeyStore";

const RECORD_PREFIX = "fit-room:tryOnErrorLog:";
const INDEX_KEY = "fit-room:tryOnErrorLogs:index";
const UNREAD_KEY = "fit-room:tryOnErrorLogs:unreadCount";
export const TRY_ON_ERROR_LOGS_INDEX_MAX = 500;

export type TryOnErrorLogRecord = {
  id: string;
  createdAt: string;
  read: boolean;
  message: string;
  apiKey: string;
  statusCode?: number;
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

export function parseStoredTryOnErrorLog(raw: unknown): TryOnErrorLogRecord | null {
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
  const r = parsed as Partial<TryOnErrorLogRecord>;

  const id = typeof r.id === "string" ? r.id.trim() : "";
  const createdAt = typeof r.createdAt === "string" ? r.createdAt : "";
  const message = typeof r.message === "string" ? r.message.trim() : "";
  const apiKey = typeof r.apiKey === "string" ? r.apiKey.trim() : "";
  const read = typeof r.read === "boolean" ? r.read : false;
  const statusCode =
    typeof r.statusCode === "number" && Number.isFinite(r.statusCode) ? Math.floor(r.statusCode) : undefined;

  if (!id || !createdAt || !message) return null;

  return {
    id,
    createdAt,
    read,
    message,
    apiKey: apiKey || "(none)",
    ...(statusCode != null ? { statusCode } : {}),
  };
}

/** Expected quota errors — do not persist to the admin error log. */
export function shouldSkipTryOnErrorLog(message: string): boolean {
  const trimmed = message.trim();
  return trimmed === "Try-on limit exceeded.";
}

export async function recordTryOnErrorLog(params: {
  message: string;
  apiKey: string;
  statusCode?: number;
}): Promise<string | null> {
  const message = params.message.trim();
  if (!message || shouldSkipTryOnErrorLog(message)) return null;

  const redis = getRedis();
  const id = crypto.randomUUID();
  const row: TryOnErrorLogRecord = {
    id,
    createdAt: new Date().toISOString(),
    read: false,
    message,
    apiKey: params.apiKey.trim() || "(none)",
    ...(params.statusCode != null ? { statusCode: params.statusCode } : {}),
  };

  await redis.set(recordKey(id), row);
  await redis.lpush(INDEX_KEY, id);
  await redis.ltrim(INDEX_KEY, 0, TRY_ON_ERROR_LOGS_INDEX_MAX - 1);
  await syncUnreadTryOnErrorLogCountFromIndex();
  return id;
}

async function syncUnreadTryOnErrorLogCountFromIndex(): Promise<number> {
  const redis = getRedis();
  const idsRaw = await redis.lrange(INDEX_KEY, 0, TRY_ON_ERROR_LOGS_INDEX_MAX - 1);
  const ids = normalizeRedisIdList(idsRaw);
  if (!ids.length) {
    await redis.set(UNREAD_KEY, "0");
    return 0;
  }
  const keys = ids.map(recordKey);
  const rowsRaw = keys.length ? ((await redis.mget(...keys)) as unknown[]) : [];
  let unread = 0;
  for (const raw of rowsRaw) {
    const row = parseStoredTryOnErrorLog(raw);
    if (row && !row.read) unread++;
  }
  await redis.set(UNREAD_KEY, String(unread));
  return unread;
}

export async function getUnreadTryOnErrorLogCount(): Promise<number> {
  return syncUnreadTryOnErrorLogCountFromIndex();
}

export async function listTryOnErrorLogs(limit: number): Promise<TryOnErrorLogRecord[]> {
  const redis = getRedis();
  const cap = Math.min(Math.max(limit, 1), TRY_ON_ERROR_LOGS_INDEX_MAX);
  const idsRaw = await redis.lrange(INDEX_KEY, 0, cap - 1);
  const ids = normalizeRedisIdList(idsRaw);
  if (!ids.length) return [];
  const keys = ids.map(recordKey);
  const rowsRaw = keys.length ? ((await redis.mget(...keys)) as unknown[]) : [];
  const out: TryOnErrorLogRecord[] = [];
  for (let i = 0; i < ids.length; i++) {
    const row = parseStoredTryOnErrorLog(rowsRaw[i]);
    if (row) out.push(row);
  }
  return out;
}

export async function markAllTryOnErrorLogsRead(): Promise<void> {
  const redis = getRedis();
  const idsRaw = await redis.lrange(INDEX_KEY, 0, TRY_ON_ERROR_LOGS_INDEX_MAX - 1);
  const ids = normalizeRedisIdList(idsRaw);
  if (!ids.length) {
    await redis.set(UNREAD_KEY, "0");
    return;
  }
  const keys = ids.map(recordKey);
  const rowsRaw = keys.length ? ((await redis.mget(...keys)) as unknown[]) : [];
  for (let i = 0; i < ids.length; i++) {
    const row = parseStoredTryOnErrorLog(rowsRaw[i]);
    if (!row || row.read) continue;
    await redis.set(recordKey(row.id), { ...row, read: true });
  }
  await redis.set(UNREAD_KEY, "0");
}
