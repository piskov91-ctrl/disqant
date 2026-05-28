import { getRedis } from "@/lib/apiKeyStore";

const USER_PREFIX = "fit-room:retailer:user:";
const LEGACY_USER_PREFIX = "disquant:retailer:user:";
const EMAIL_INDEX = "fit-room:retailer:email:";
const LEGACY_EMAIL_INDEX = "disquant:retailer:email:";

type RetailerUserShape = {
  id?: string;
  email?: string;
  storeName?: string;
  companyName?: string;
  clientId?: string | null;
  createdAt?: string;
  deletedAt?: string | null;
};

export type RetailerAdminAccountRow = {
  userId: string;
  storeName: string;
  email: string;
  createdAt: string;
  clientId: string | null;
  subscriptionStatus: "Active" | "No Plan";
};

function parseRetailerUserRaw(raw: unknown): RetailerUserShape | null {
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
  return parsed as RetailerUserShape;
}

function redisUserIdFromIndex(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    return s.length > 0 ? s : null;
  }
  return null;
}

function parseRedisScanCursor(raw: unknown): number {
  if (typeof raw === "string") {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  return 0;
}

function userKey(id: string) {
  return `${USER_PREFIX}${id}`;
}

function userKeyLegacy(id: string) {
  return `${LEGACY_USER_PREFIX}${id}`;
}

function userIdFromRetailerRedisKey(key: string): string | null {
  if (key.startsWith(USER_PREFIX)) {
    const id = key.slice(USER_PREFIX.length).trim();
    return id || null;
  }
  if (key.startsWith(LEGACY_USER_PREFIX)) {
    const id = key.slice(LEGACY_USER_PREFIX.length).trim();
    return id || null;
  }
  return null;
}

function subscriptionStatus(user: Pick<RetailerUserShape, "clientId">): "Active" | "No Plan" {
  return user.clientId?.trim() ? "Active" : "No Plan";
}

function retailerRowFromRecord(u: RetailerUserShape, keyUserId: string): RetailerAdminAccountRow | null {
  const userId = (typeof u.id === "string" && u.id.trim()) || keyUserId;
  if (!userId) return null;
  if (u.deletedAt?.trim()) return null;

  const email = typeof u.email === "string" ? u.email.trim() : "";
  const storeName =
    (typeof u.storeName === "string" ? u.storeName.trim() : "") ||
    (typeof u.companyName === "string" ? u.companyName.trim() : "") ||
    "—";
  const createdAt = typeof u.createdAt === "string" && u.createdAt.trim() ? u.createdAt : "";

  return {
    userId,
    storeName,
    email: email || "—",
    createdAt,
    clientId: u.clientId?.trim() || null,
    subscriptionStatus: subscriptionStatus(u),
  };
}

async function scanAllKeysWithPrefix(prefix: string, maxRounds = 500): Promise<string[]> {
  const redis = getRedis();
  const out: string[] = [];
  let cursor = 0;
  let rounds = 0;

  for (;;) {
    rounds += 1;
    if (rounds > maxRounds) {
      console.error("[fit-room][retailer-admin-list] scan max rounds exceeded", { prefix, rounds });
      break;
    }

    const tuple = await redis.scan(cursor, { match: `${prefix}*`, count: 500 });
    const nextCursor = parseRedisScanCursor(tuple[0]);
    const keys = (tuple[1] ?? []) as string[];
    for (const k of keys) {
      if (k.startsWith(prefix)) out.push(k);
    }
    if (nextCursor === 0) break;
    cursor = nextCursor;
  }

  return out;
}

async function mgetInChunks(keys: string[], chunkSize = 100): Promise<(unknown | null)[]> {
  if (!keys.length) return [];
  const redis = getRedis();
  const out: (unknown | null)[] = [];
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    const vals = (await redis.mget(...chunk)) as (unknown | null)[];
    out.push(...vals);
  }
  return out;
}

/** All non-deleted retailer accounts — email index + user keys, newest first. */
export async function listRetailerAccountsForAdmin(limit = 10_000): Promise<RetailerAdminAccountRow[]> {
  const userIds = new Set<string>();

  for (const prefix of [EMAIL_INDEX, LEGACY_EMAIL_INDEX]) {
    const indexKeys = await scanAllKeysWithPrefix(prefix);
    if (!indexKeys.length) continue;
    const indexVals = await mgetInChunks(indexKeys);
    for (const raw of indexVals) {
      const id = redisUserIdFromIndex(raw);
      if (id) userIds.add(id);
    }
  }

  for (const prefix of [USER_PREFIX, LEGACY_USER_PREFIX]) {
    for (const k of await scanAllKeysWithPrefix(prefix)) {
      const id = userIdFromRetailerRedisKey(k);
      if (id) userIds.add(id);
    }
  }

  const ids = [...userIds];
  const byId = new Map<string, RetailerAdminAccountRow>();

  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const keys = batch.flatMap((id) => [userKey(id), userKeyLegacy(id)]);
    const vals = await mgetInChunks(keys);
    for (let j = 0; j < batch.length; j++) {
      const id = batch[j]!;
      const u = parseRetailerUserRaw(vals[j * 2]) ?? parseRetailerUserRaw(vals[j * 2 + 1]);
      if (!u) continue;
      const row = retailerRowFromRecord(u, id);
      if (row) byId.set(row.userId, row);
    }
  }

  const rows = [...byId.values()];
  rows.sort((a, b) => {
    const ta = Date.parse(a.createdAt);
    const tb = Date.parse(b.createdAt);
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return tb - ta;
    return a.email.localeCompare(b.email);
  });
  return rows.slice(0, limit);
}

/** @deprecated Use {@link listRetailerAccountsForAdmin}. Re-export for existing imports. */
export async function listActiveRetailerAccountsForAdmin(limit = 10_000): Promise<RetailerAdminAccountRow[]> {
  return listRetailerAccountsForAdmin(limit);
}

export function retailerAdminSubscriptionStatusLabel(
  user: Pick<RetailerUserShape, "clientId">,
): "Active" | "No Plan" {
  return subscriptionStatus(user);
}
