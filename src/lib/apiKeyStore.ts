import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type ClientApiKeyRecord = {
  id: string;
  clientName: string;
  key: string;
  usageLimit: number;
  usageCount: number;
  createdAt: string; // ISO
};

type StoreFile = {
  version: 1;
  keys: ClientApiKeyRecord[];
};

const STORE_PATH = path.join(process.cwd(), "data", "api-keys.json");

async function readStore(): Promise<StoreFile> {
  const raw = await fs.readFile(STORE_PATH, "utf8");
  const parsed = JSON.parse(raw) as StoreFile;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.keys)) {
    throw new Error("Invalid api-keys.json format");
  }
  return parsed;
}

async function writeStore(next: StoreFile) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
}

export async function listClientKeys() {
  const store = await readStore();
  return store.keys;
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

  const store = await readStore();
  const now = new Date().toISOString();

  const rec: ClientApiKeyRecord = {
    id: crypto.randomUUID(),
    clientName,
    key: generateKey(),
    usageLimit: Math.floor(params.usageLimit),
    usageCount: 0,
    createdAt: now,
  };

  store.keys.unshift(rec);
  await writeStore(store);
  return rec;
}

