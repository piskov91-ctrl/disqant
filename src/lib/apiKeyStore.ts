import crypto from "node:crypto";
import { Redis } from "@upstash/redis";
import { isFitRoomEmailConfigured } from "@/lib/fitRoomEmail";
import {
  usageIncrementReachedQuotaLimit,
  usageIncrementShouldPersistNinetyNinePctEmailFlag,
  usageIncrementShouldPersistSeventyFivePctEmailFlag,
} from "@/lib/usageTryOnQuotaEmailPolicy";
import {
  applyAllDueMonthlyUsageResets,
  billingAnchorDayFromUtcDate,
  monthlyBillingCycleChanged,
} from "@/lib/billingCycle";

export type ClientApiKeyRecord = {
  id: string;
  clientName: string;
  /** Primary contact / billing email for this client (admin). */
  contactEmail?: string;
  key: string;
  fashnApiKey: string;
  usageLimit: number;
  usageCount: number;
  /**
   * UTC calendar day-of-month (1–31) for automatic monthly `usageCount` reset.
   * Usually the subscription signup day; shorter months use the last day when anchor > length.
   */
  billingAnchorDay?: number;
  /** YYYY-MM-DD (UTC) of the last automatic monthly reset applied. */
  lastAutoBillingResetYyyymmdd?: string;
  /** When equal to usageLimit, the 75% try-on quota email was already sent for this limit tier (reset on usage reset). */
  usageSeventyFivePctEmailSentForLimit?: number;
  /** When equal to usageLimit, the 99% try-on quota email was already sent for this limit tier (reset on usage reset). */
  usageNinetyNinePctEmailSentForLimit?: number;
  createdAt: string; // ISO
  /** Soft-delete timestamp (e.g. retailer deleted account). Deleted keys are removed from active admin lists and rejected for usage. */
  deletedAt?: string | null;
};

const KEY_INDEX = "fit-room:clientKeys:index"; // list of ids (newest first)
const KEY_PREFIX = "fit-room:clientKeys:byId:"; // + id
const KEY_BY_KEY_PREFIX = "fit-room:clientKeys:byKey:"; // + apiKey -> id

/** Pre-rename keys in Upstash (demo still reads these until data is recreated or migrated). */
const LEGACY_KEY_INDEX = "disquant:clientKeys:index";
const LEGACY_KEY_PREFIX = "disquant:clientKeys:byId:";
const LEGACY_KEY_BY_KEY_PREFIX = "disquant:clientKeys:byKey:";

function recordKey(id: string) {
  return `${KEY_PREFIX}${id}`;
}

function keyLookupKey(apiKey: string) {
  return `${KEY_BY_KEY_PREFIX}${apiKey}`;
}

function recordKeyLegacy(id: string) {
  return `${LEGACY_KEY_PREFIX}${id}`;
}

function keyLookupKeyLegacy(apiKey: string) {
  return `${LEGACY_KEY_BY_KEY_PREFIX}${apiKey}`;
}

async function getRecordForMutation(id: string): Promise<{
  rec: ClientApiKeyRecord;
  redisKey: string;
} | null> {
  const redis = getRedis();
  const fromNew = (await redis.get(recordKey(id))) as ClientApiKeyRecord | null;
  if (fromNew) return { rec: fromNew, redisKey: recordKey(id) };
  const fromLegacy = (await redis.get(recordKeyLegacy(id))) as ClientApiKeyRecord | null;
  if (fromLegacy) return { rec: fromLegacy, redisKey: recordKeyLegacy(id) };
  return null;
}

let redisSingleton: Redis | null = null;

/** @internal Shared Upstash client for `apiKeyStore` and `tryOnAnalytics`. */
export function getRedis() {
  if (redisSingleton) return redisSingleton;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing Redis env vars. Set KV_REST_API_URL and KV_REST_API_TOKEN.",
    );
  }

  // Prefer write token since admin needs writes. (Read-only token is optional and unused here.)
  redisSingleton = new Redis({ url, token });
  return redisSingleton;
}

export async function listClientKeys() {
  // Read IDs from index, then mget full records. If the fit-room index is empty,
  // fall back to legacy `disquant:*` keys so existing deployments keep working.
  const redis = getRedis();
  let ids = (await redis.lrange<string>(KEY_INDEX, 0, 499)) ?? [];
  const recordKeyFn: (id: string) => string =
    ids.length > 0 ? recordKey : recordKeyLegacy;
  if (ids.length === 0) {
    ids = (await redis.lrange<string>(LEGACY_KEY_INDEX, 0, 499)) ?? [];
  }
  if (ids.length === 0) return [];

  // Upstash client typing for mget varies; normalize to a nullable list.
  const keys = (await redis.mget(...ids.map((id: string) => recordKeyFn(id)))) as Array<
    ClientApiKeyRecord | null
  >;
  return (keys ?? []).filter(Boolean) as ClientApiKeyRecord[];
}

function generateKey() {
  // 32 bytes URL-safe token
  return crypto.randomBytes(32).toString("base64url");
}

async function generateUniqueClientApiKey(redis: Redis): Promise<string> {
  // Collisions are astronomically unlikely, but enforce uniqueness defensively.
  const demoKey = process.env.DEMO_API_KEY?.trim() || null;
  for (let i = 0; i < 8; i += 1) {
    const k = generateKey();
    if (demoKey && k === demoKey) continue;
    const exists = (await redis.get(keyLookupKey(k))) as string | null;
    if (!exists) return k;
  }
  throw new Error("Could not generate a unique API key. Please try again.");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeContactEmailInput(raw: string | undefined): string | undefined {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) return undefined;
  if (!EMAIL_RE.test(t)) throw new Error("Enter a valid contact email.");
  return t;
}

export async function createClientKey(params: {
  clientName: string;
  contactEmail?: string;
  usageLimit: number;
  fashnApiKey?: string;
  /** Explicit billing anchor day 1–31; otherwise derived from `anchorSourceDate` or key creation instant. */
  billingAnchorDay?: number;
  /** When `billingAnchorDay` is omitted, anchor day is the UTC day-of-month of this instant (e.g. Stripe checkout). */
  anchorSourceDate?: Date;
}) {
  const clientName = params.clientName.trim();
  if (!clientName) throw new Error("Client name is required.");
  if (!Number.isFinite(params.usageLimit) || params.usageLimit <= 0) {
    throw new Error("Try-on limit must be a positive number.");
  }

  const contactEmail = normalizeContactEmailInput(params.contactEmail);
  if (!contactEmail) throw new Error("Contact email is required.");

  const redis = getRedis();
  const now = new Date().toISOString();

  let billingAnchor: number;
  if (typeof params.billingAnchorDay === "number" && params.billingAnchorDay >= 1 && params.billingAnchorDay <= 31) {
    billingAnchor = Math.floor(params.billingAnchorDay);
  } else {
    billingAnchor = billingAnchorDayFromUtcDate(params.anchorSourceDate ?? new Date());
  }

  const fashnApiKey =
    (params.fashnApiKey ? params.fashnApiKey.trim() : "") ||
    (process.env.FASHN_API_KEY ? process.env.FASHN_API_KEY.trim() : "");
  if (!fashnApiKey) {
    throw new Error("Missing Fashn.ai API key. Set FASHN_API_KEY in the server environment.");
  }
  const apiKey = await generateUniqueClientApiKey(redis);

  const rec: ClientApiKeyRecord = {
    id: crypto.randomUUID(),
    clientName,
    contactEmail,
    key: apiKey,
    fashnApiKey,
    usageLimit: Math.floor(params.usageLimit),
    usageCount: 0,
    billingAnchorDay: billingAnchor,
    createdAt: now,
  };

  // Persist record + add to index.
  await redis.set(recordKey(rec.id), rec);
  await redis.set(keyLookupKey(rec.key), rec.id);
  await redis.lpush(KEY_INDEX, rec.id);
  return rec;
}

export async function deleteClientKey(id: string) {
  const redis = getRedis();
  if (!id) throw new Error("Key id is required.");

  let rec = (await redis.get(recordKey(id))) as ClientApiKeyRecord | null;
  let legacy = false;
  if (!rec) {
    rec = (await redis.get(recordKeyLegacy(id))) as ClientApiKeyRecord | null;
    legacy = true;
  }
  if (!rec) throw new Error("Key id not found.");

  const indexKey = legacy ? LEGACY_KEY_INDEX : KEY_INDEX;
  const recordRedisKey = legacy ? recordKeyLegacy(id) : recordKey(id);
  const lookupDel = rec?.key
    ? legacy
      ? keyLookupKeyLegacy(rec.key)
      : keyLookupKey(rec.key)
    : null;

  await redis.lrem(indexKey, 0, id);
  await redis.del(recordRedisKey);
  if (lookupDel) await redis.del(lookupDel);
  await redis.del(`fit-room:tryon:products:${id}`);
  await redis.del(`fit-room:tryon:events:${id}`);
  await redis.del(`disquant:tryon:products:${id}`);
  await redis.del(`disquant:tryon:events:${id}`);
  await redis.srem("fit-room:analytics:clientStats:ids", id);
  await redis.del(`fit-room:analytics:clientStats:${id}`);
  await redis.srem("disquant:analytics:clientStats:ids", id);
  await redis.del(`disquant:analytics:clientStats:${id}`);
  return { ok: true as const };
}

export async function getClientByApiKey(apiKey: string) {
  const redis = getRedis();
  let id = (await redis.get(keyLookupKey(apiKey))) as string | null;
  let legacy = false;
  if (!id) {
    id = (await redis.get(keyLookupKeyLegacy(apiKey))) as string | null;
    legacy = true;
  }
  if (!id) return null;
  const recKey = legacy ? recordKeyLegacy(id) : recordKey(id);
  const rec = (await redis.get(recKey)) as ClientApiKeyRecord | null;
  if (!rec || rec.deletedAt) return null;
  const now = new Date();
  const after = applyAllDueMonthlyUsageResets(rec, now);
  if (monthlyBillingCycleChanged(rec, after)) {
    await redis.set(recKey, after);
  }
  return after;
}

export async function markClientKeyDeleted(params: { id: string; deletedAt?: string }): Promise<ClientApiKeyRecord> {
  const redis = getRedis();
  const bundle = await getRecordForMutation(params.id);
  if (!bundle) throw new Error("Client key not found.");
  const { rec, redisKey } = bundle;

  const now = params.deletedAt ?? new Date().toISOString();
  const next: ClientApiKeyRecord = { ...rec, deletedAt: now };
  await redis.set(redisKey, next);

  // Remove from active index so it disappears from the Clients list.
  const indexKey = redisKey.startsWith(KEY_PREFIX) ? KEY_INDEX : LEGACY_KEY_INDEX;
  await redis.lrem(indexKey, 0, rec.id);

  // Disable the API key so embeds can no longer use it.
  if (rec.key?.trim()) {
    const lookupKey = redisKey.startsWith(KEY_PREFIX) ? keyLookupKey(rec.key) : keyLookupKeyLegacy(rec.key);
    await redis.del(lookupKey).catch(() => {});
  }

  return next;
}

/** Load a client key record by internal id (e.g. retailer dashboard). */
export async function getClientKeyRecordById(id: string): Promise<ClientApiKeyRecord | null> {
  if (!id) return null;
  const bundle = await getRecordForMutation(id);
  if (!bundle) return null;
  const { rec, redisKey } = bundle;
  if (rec.deletedAt) return rec;
  const now = new Date();
  const after = applyAllDueMonthlyUsageResets(rec, now);
  if (monthlyBillingCycleChanged(rec, after)) {
    await getRedis().set(redisKey, after);
  }
  return after;
}

export async function assertClientCanUseByApiKey(apiKey: string) {
  const client = await getClientByApiKey(apiKey);
  if (!client) throw new Error("Invalid API key.");
  if (client.usageCount >= client.usageLimit) throw new Error("Try-on limit exceeded.");
  return client;
}

export async function incrementUsageOrThrow(id: string) {
  const redis = getRedis();
  const bundle = await getRecordForMutation(id);
  if (!bundle) throw new Error("Client key not found.");
  const { redisKey } = bundle;
  let rec = applyAllDueMonthlyUsageResets(bundle.rec, new Date());
  if (monthlyBillingCycleChanged(bundle.rec, rec)) {
    await redis.set(redisKey, rec);
  }
  if (rec.usageCount >= rec.usageLimit) throw new Error("Try-on limit exceeded.");
  const nextBase: ClientApiKeyRecord = { ...rec, usageCount: rec.usageCount + 1 };
  const resendConfigured = isFitRoomEmailConfigured();
  const reachedQuotaLimit = usageIncrementReachedQuotaLimit(rec, nextBase);
  const persistNinetyNine =
    !reachedQuotaLimit &&
    resendConfigured &&
    usageIncrementShouldPersistNinetyNinePctEmailFlag({ prev: rec, next: nextBase });
  const persistSeventyFive =
    !reachedQuotaLimit &&
    !persistNinetyNine &&
    resendConfigured &&
    usageIncrementShouldPersistSeventyFivePctEmailFlag({ prev: rec, next: nextBase });

  const next: ClientApiKeyRecord = {
    ...nextBase,
    ...(persistSeventyFive ? { usageSeventyFivePctEmailSentForLimit: nextBase.usageLimit } : null),
    ...(persistNinetyNine ? { usageNinetyNinePctEmailSentForLimit: nextBase.usageLimit } : null),
  };

  const atLimit = nextBase.usageCount >= nextBase.usageLimit && nextBase.usageLimit > 0;
  console.log("[fit-room][email-debug] incrementUsageOrThrow", {
    clientId: rec.id,
    resendConfigured,
    usageBefore: rec.usageCount,
    usageAfter: nextBase.usageCount,
    limit: nextBase.usageLimit,
    reachedFullLimit: atLimit,
    willQueue75PctEmail: persistSeventyFive,
    willQueue99PctEmail: persistNinetyNine,
  });

  await redis.set(redisKey, next);
  if (persistSeventyFive || persistNinetyNine) {
    console.log("[fit-room][email-debug] scheduling quota email(s)", {
      seventyFive: persistSeventyFive,
      ninetyNine: persistNinetyNine,
    });
    void import("@/lib/usageTryOnQuotaEmail").then((m) => {
      if (persistSeventyFive) m.sendTryOnUsageSeventyFivePctNoticeAsync({ client: next });
      if (persistNinetyNine) m.sendTryOnUsageNinetyNinePctNoticeAsync({ client: next });
    });
  }
  return next;
}

export async function resetUsage(id: string) {
  const redis = getRedis();
  const bundle = await getRecordForMutation(id);
  if (!bundle) throw new Error("Client key not found.");
  const { rec, redisKey } = bundle;
  const next: ClientApiKeyRecord = { ...rec, usageCount: 0 };
  delete next.usageSeventyFivePctEmailSentForLimit;
  delete next.usageNinetyNinePctEmailSentForLimit;
  await redis.set(redisKey, next);
  return next;
}

/** Add try-on quota to an existing client (e.g. after a one-time top-up payment). */
export async function incrementClientTryOnLimit(id: string, delta: number) {
  const redis = getRedis();
  if (!id) throw new Error("Key id is required.");
  if (!Number.isFinite(delta) || delta <= 0 || !Number.isInteger(delta)) {
    throw new Error("Top-up amount must be a positive whole number.");
  }

  const bundle = await getRecordForMutation(id);
  if (!bundle) throw new Error("Client key not found.");
  const { rec, redisKey } = bundle;
  if (rec.deletedAt) throw new Error("This API key is no longer active.");

  let cur = applyAllDueMonthlyUsageResets(rec, new Date());
  if (monthlyBillingCycleChanged(rec, cur)) {
    await redis.set(redisKey, cur);
  }

  const next: ClientApiKeyRecord = {
    ...cur,
    usageLimit: cur.usageLimit + delta,
  };
  await redis.set(redisKey, next);
  return next;
}

export async function updateClientKey(params: {
  id: string;
  clientName: string;
  contactEmail?: string;
  usageLimit: number;
  fashnApiKey?: string;
}) {
  const redis = getRedis();
  const id = params.id;
  if (!id) throw new Error("Key id is required.");

  const clientName = params.clientName.trim();
  if (!clientName) throw new Error("Client name is required.");
  if (!Number.isFinite(params.usageLimit) || params.usageLimit <= 0) {
    throw new Error("Try-on limit must be a positive number.");
  }

  const bundle = await getRecordForMutation(id);
  if (!bundle) throw new Error("Client key not found.");
  const { rec, redisKey } = bundle;

  const next: ClientApiKeyRecord = {
    ...rec,
    clientName,
    usageLimit: Math.floor(params.usageLimit),
    ...(params.fashnApiKey && params.fashnApiKey.trim()
      ? { fashnApiKey: params.fashnApiKey.trim() }
      : null),
  };

  if (params.contactEmail !== undefined) {
    const normalized = normalizeContactEmailInput(params.contactEmail);
    if (normalized) next.contactEmail = normalized;
    else delete next.contactEmail;
  }
  await redis.set(redisKey, next);
  return next;
}

