import crypto from "node:crypto";
import { kv } from "@vercel/kv";

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

export async function listClientKeys() {
  // Read IDs from index, then mget full records.
  const ids = (await kv.lrange<string>(KEY_INDEX, 0, 499)) ?? [];
  if (ids.length === 0) return [];

  const keys = await kv.mget(...ids.map((id: string) => recordKey(id)));
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
  await kv.set(recordKey(rec.id), rec);
  await kv.lpush(KEY_INDEX, rec.id);
  return rec;
}

