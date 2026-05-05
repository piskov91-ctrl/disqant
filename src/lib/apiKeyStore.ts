import crypto from "node:crypto";
import { Redis } from "@upstash/redis";
import { isFitRoomSmtpConfigured } from "@/lib/fitRoomSmtp";
import { usageIncrementShouldPersistEightyPctEmailFlag } from "@/lib/usageTryOnQuotaEmailPolicy";

export type ClientApiKeyRecord = {
  id: string;
  clientName: string;
  /** When set, 80% try-on reminders go here (SMTP). Otherwise linked retailer signup emails are used. */
  billingEmail?: string;
  key: string;
  fashnApiKey: string;
  usageLimit: number;
  usageCount: number;
  /** When equal to usageLimit, the 80% try-on quota email was already sent for this limit tier (reset on usage reset). */
  usageEightPctEmailSentForLimit?: number;
  createdAt: string; // ISO
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

export function normalizeClientBillingEmailInput(raw: string | undefined): string | undefined {
  const t = (raw ?? "").trim();
  if (!t) return undefined;
  if (t.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
    throw new Error("Invalid billing email address.");
  }
  return t;
}

export async function createClientKey(params: {
  clientName: string;
  usageLimit: number;
  billingEmail?: string;
  fashnApiKey?: string;
}) {
  const clientName = params.clientName.trim();
  if (!clientName) throw new Error("Client name is required.");
  if (!Number.isFinite(params.usageLimit) || params.usageLimit <= 0) {
    throw new Error("Try-on limit must be a positive number.");
  }

  const redis = getRedis();
  const now = new Date().toISOString();

  const fashnApiKey =
    (params.fashnApiKey ? params.fashnApiKey.trim() : "") ||
    (process.env.FASHN_API_KEY ? process.env.FASHN_API_KEY.trim() : "");
  if (!fashnApiKey) {
    throw new Error("Missing Fashn.ai API key. Set FASHN_API_KEY in the server environment.");
  }

  const billingRaw = params.billingEmail;
  const billingEmail =
    billingRaw !== undefined
      ? normalizeClientBillingEmailInput(String(billingRaw).trim() || undefined)
      : undefined;

  const rec: ClientApiKeyRecord = {
    id: crypto.randomUUID(),
    clientName,
    key: generateKey(),
    fashnApiKey,
    usageLimit: Math.floor(params.usageLimit),
    usageCount: 0,
    ...(billingEmail ? { billingEmail } : null),
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
  return (await redis.get(recKey)) as ClientApiKeyRecord | null;
}

/** Load a client key record by internal id (e.g. retailer dashboard). */
export async function getClientKeyRecordById(id: string): Promise<ClientApiKeyRecord | null> {
  if (!id) return null;
  const redis = getRedis();
  const rec = (await redis.get(recordKey(id))) as ClientApiKeyRecord | null;
  if (rec) return rec;
  return (await redis.get(recordKeyLegacy(id))) as ClientApiKeyRecord | null;
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
  const { rec, redisKey } = bundle;
  if (rec.usageCount >= rec.usageLimit) throw new Error("Try-on limit exceeded.");
  const nextBase: ClientApiKeyRecord = { ...rec, usageCount: rec.usageCount + 1 };
  const persistCandidate = usageIncrementShouldPersistEightyPctEmailFlag({
    prev: rec,
    next: nextBase,
  });
  const persistEighty = persistCandidate && isFitRoomSmtpConfigured();
  const next: ClientApiKeyRecord = persistEighty
    ? { ...nextBase, usageEightPctEmailSentForLimit: nextBase.usageLimit }
    : nextBase;
  await redis.set(redisKey, next);
  if (persistEighty) {
    void import("@/lib/usageTryOnQuotaEmail").then((m) => m.sendTryOnLimitEightyPctNoticeAsync({ client: next }));
  }
  return next;
}

export async function resetUsage(id: string) {
  const redis = getRedis();
  const bundle = await getRecordForMutation(id);
  if (!bundle) throw new Error("Client key not found.");
  const { rec, redisKey } = bundle;
  const next: ClientApiKeyRecord = { ...rec, usageCount: 0 };
  delete next.usageEightPctEmailSentForLimit;
  await redis.set(redisKey, next);
  return next;
}

export async function updateClientKey(params: {
  id: string;
  clientName: string;
  usageLimit: number;
  billingEmail: string | undefined;
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

  const billingEmailNormalized = normalizeClientBillingEmailInput(
    (params.billingEmail ?? "").trim() || undefined,
  );

  const next: ClientApiKeyRecord = {
    ...rec,
    clientName,
    usageLimit: Math.floor(params.usageLimit),
    ...(params.fashnApiKey && params.fashnApiKey.trim()
      ? { fashnApiKey: params.fashnApiKey.trim() }
      : null),
    ...(billingEmailNormalized ? { billingEmail: billingEmailNormalized } : null),
  };
  if (!billingEmailNormalized) {
    delete next.billingEmail;
  }
  await redis.set(redisKey, next);
  return next;
}

