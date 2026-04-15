import crypto from "node:crypto";
import { Redis } from "@upstash/redis";

export type ClientApiKeyRecord = {
  id: string;
  clientName: string;
  key: string;
  usageLimit: number;
  usageCount: number;
  createdAt: string; // ISO
};

const KEY_INDEX = "disquant:clientKeys:index"; // list of ids (newest first)
const KEY_PREFIX = "disquant:clientKeys:byId:"; // + id

function recordKey(id: string) {
  return `${KEY_PREFIX}${id}`;
}

let redisSingleton: Redis | null = null;

function getRedis() {
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

export async function createClientKey(params: { clientName: string; usageLimit: number }) {
  const clientName = params.clientName.trim();
  if (!clientName) throw new Error("Client name is required.");
  if (!Number.isFinite(params.usageLimit) || params.usageLimit <= 0) {
    throw new Error("Usage limit must be a positive number.");
  }

  const redis = getRedis();
  const now = new Date().toISOString();

  const rec: ClientApiKeyRecord = {
    id: crypto.randomUUID(),
    clientName,
    key: generateKey(),
    usageLimit: Math.floor(params.usageLimit),
    usageCount: 0,
    createdAt: now,
  };

  // Persist record + add to index.
  await redis.set(recordKey(rec.id), rec);
  await redis.lpush(KEY_INDEX, rec.id);
  return rec;
}

export async function deleteClientKey(id: string) {
  const redis = getRedis();
  if (!id) throw new Error("Key id is required.");

  // Remove id from index and delete the record.
  await redis.lrem(KEY_INDEX, 0, id);
  await redis.del(recordKey(id));
  return { ok: true as const };
}

