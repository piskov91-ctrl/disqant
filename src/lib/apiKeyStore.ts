import crypto from "node:crypto";
import { Redis } from "@upstash/redis";

export type ClientApiKeyRecord = {
  id: string;
  clientName: string;
  key: string;
  fashnApiKey: string;
  usageLimit: number;
  usageCount: number;
  createdAt: string; // ISO
};

const KEY_INDEX = "disquant:clientKeys:index"; // list of ids (newest first)
const KEY_PREFIX = "disquant:clientKeys:byId:"; // + id
const KEY_BY_KEY_PREFIX = "disquant:clientKeys:byKey:"; // + apiKey -> id

function recordKey(id: string) {
  return `${KEY_PREFIX}${id}`;
}

function keyLookupKey(apiKey: string) {
  return `${KEY_BY_KEY_PREFIX}${apiKey}`;
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
  // Read IDs from index, then mget full records.
  const redis = getRedis();
  const ids = (await redis.lrange<string>(KEY_INDEX, 0, 499)) ?? [];
  if (ids.length === 0) return [];

  // Upstash client typing for mget varies; normalize to a nullable list.
  const keys = (await redis.mget(...ids.map((id: string) => recordKey(id)))) as Array<
    ClientApiKeyRecord | null
  >;
  return (keys ?? []).filter(Boolean) as ClientApiKeyRecord[];
}

function generateKey() {
  // 32 bytes URL-safe token
  return crypto.randomBytes(32).toString("base64url");
}

export async function createClientKey(params: {
  clientName: string;
  usageLimit: number;
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

  const rec: ClientApiKeyRecord = {
    id: crypto.randomUUID(),
    clientName,
    key: generateKey(),
    fashnApiKey,
    usageLimit: Math.floor(params.usageLimit),
    usageCount: 0,
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

  const rec = (await redis.get(recordKey(id))) as ClientApiKeyRecord | null;

  // Remove id from index and delete the record.
  await redis.lrem(KEY_INDEX, 0, id);
  await redis.del(recordKey(id));
  if (rec?.key) await redis.del(keyLookupKey(rec.key));
  await redis.del(`disquant:tryon:products:${id}`);
  await redis.del(`disquant:tryon:events:${id}`);
  await redis.srem("disquant:analytics:clientStats:ids", id);
  await redis.del(`disquant:analytics:clientStats:${id}`);
  return { ok: true as const };
}

export async function getClientByApiKey(apiKey: string) {
  const redis = getRedis();
  const id = (await redis.get(keyLookupKey(apiKey))) as string | null;
  if (!id) return null;
  const rec = (await redis.get(recordKey(id))) as ClientApiKeyRecord | null;
  return rec;
}

/** Load a client key record by internal id (e.g. retailer dashboard). */
export async function getClientKeyRecordById(id: string): Promise<ClientApiKeyRecord | null> {
  if (!id) return null;
  const redis = getRedis();
  const rec = (await redis.get(recordKey(id))) as ClientApiKeyRecord | null;
  return rec ?? null;
}

export async function assertClientCanUseByApiKey(apiKey: string) {
  const client = await getClientByApiKey(apiKey);
  if (!client) throw new Error("Invalid API key.");
  if (client.usageCount >= client.usageLimit) throw new Error("Try-on limit exceeded.");
  return client;
}

export async function incrementUsageOrThrow(id: string) {
  const redis = getRedis();
  const rec = (await redis.get(recordKey(id))) as ClientApiKeyRecord | null;
  if (!rec) throw new Error("Client key not found.");
  if (rec.usageCount >= rec.usageLimit) throw new Error("Try-on limit exceeded.");
  const next: ClientApiKeyRecord = { ...rec, usageCount: rec.usageCount + 1 };
  await redis.set(recordKey(id), next);
  return next;
}

export async function resetUsage(id: string) {
  const redis = getRedis();
  const rec = (await redis.get(recordKey(id))) as ClientApiKeyRecord | null;
  if (!rec) throw new Error("Client key not found.");
  const next: ClientApiKeyRecord = { ...rec, usageCount: 0 };
  await redis.set(recordKey(id), next);
  return next;
}

export async function updateClientKey(params: {
  id: string;
  clientName: string;
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

  const rec = (await redis.get(recordKey(id))) as ClientApiKeyRecord | null;
  if (!rec) throw new Error("Client key not found.");

  const next: ClientApiKeyRecord = {
    ...rec,
    clientName,
    usageLimit: Math.floor(params.usageLimit),
    ...(params.fashnApiKey && params.fashnApiKey.trim()
      ? { fashnApiKey: params.fashnApiKey.trim() }
      : null),
  };
  await redis.set(recordKey(id), next);
  return next;
}

