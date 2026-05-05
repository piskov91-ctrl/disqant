/**
 * Sets contactEmail on the demo/test client record in Upstash Redis so 80% quota
 * reminder emails include that address (see usageTryOnQuotaEmail.ts).
 *
 * Resolves the client in this order:
 *   1. FIT_ROOM_DEMO_TEST_CLIENT_KEY or DISQUANT_DEMO_TEST_CLIENT_KEY → lookup by API key
 *   2. First client whose clientName matches /test/i (index order)
 *
 * Usage (repo root, env loaded):
 *   export $(grep -v '^#' .env.local | xargs)
 *   node scripts/set-test-client-contact-email.mjs piskov91@gmail.com
 *
 * Requires: KV_REST_API_URL + KV_REST_API_TOKEN
 */
import { Redis } from "@upstash/redis";

const NEW_INDEX = "fit-room:clientKeys:index";
const LEGACY_INDEX = "disquant:clientKeys:index";
const NEW_PREFIX = "fit-room:clientKeys:byId:";
const LEGACY_PREFIX = "disquant:clientKeys:byId:";
const NEW_BY_KEY = "fit-room:clientKeys:byKey:";
const LEGACY_BY_KEY = "disquant:clientKeys:byKey:";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const emailArg = process.argv[2]?.trim() || "";

if (!url || !token) {
  console.error("Missing KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_* aliases).");
  process.exit(1);
}

if (!EMAIL_RE.test(emailArg)) {
  console.error("Usage: node scripts/set-test-client-contact-email.mjs <valid-email>");
  process.exit(1);
}

const redis = new Redis({ url, token });

let ids = (await redis.lrange(NEW_INDEX, 0, 499)) ?? [];
if (ids.length === 0) {
  ids = (await redis.lrange(LEGACY_INDEX, 0, 499)) ?? [];
}

if (!ids.length) {
  console.error("No client keys in Redis index.");
  process.exit(1);
}

async function getRecord(id) {
  const fromNew = await redis.get(`${NEW_PREFIX}${id}`);
  if (fromNew) return { rec: fromNew, redisKey: `${NEW_PREFIX}${id}` };
  const fromLegacy = await redis.get(`${LEGACY_PREFIX}${id}`);
  if (fromLegacy) return { rec: fromLegacy, redisKey: `${LEGACY_PREFIX}${id}` };
  return null;
}

async function byApiKey(key) {
  let cid = await redis.get(`${NEW_BY_KEY}${key}`);
  if (!cid) cid = await redis.get(`${LEGACY_BY_KEY}${key}`);
  if (!cid || typeof cid !== "string") return null;
  return getRecord(cid);
}

/**
 * @returns {Promise<{rec: object, redisKey: string} | null>}
 */
async function pickTarget() {
  const envKey =
    process.env.FIT_ROOM_DEMO_TEST_CLIENT_KEY?.trim() ||
    process.env.DISQUANT_DEMO_TEST_CLIENT_KEY?.trim() ||
    "";
  if (envKey) {
    const hit = await byApiKey(envKey);
    if (hit) {
      console.log(`Using client from FIT_ROOM_DEMO_TEST_CLIENT_KEY / key lookup (${hit.rec.clientName}).`);
      return hit;
    }
    console.warn("Env demo test key did not resolve a record; falling back to name / index.");
  }

  const testMatches = [];
  for (const id of ids) {
    const bundle = await getRecord(id);
    if (bundle && /test/i.test(bundle.rec.clientName || "")) {
      testMatches.push(bundle);
    }
  }
  if (testMatches.length > 0) {
    const bundle = testMatches[0];
    console.log(`Using client matching /test/i: "${bundle.rec.clientName}" (${bundle.rec.id}).`);
    return bundle;
  }

  if (ids.length === 1) {
    const only = await getRecord(ids[0]);
    if (only) {
      console.log(`Using the only indexed client: "${only.rec.clientName}" (${only.rec.id}).`);
      return only;
    }
  }

  const summaries = [];
  for (const id of ids) {
    const bundle = await getRecord(id);
    if (bundle) summaries.push(`${bundle.rec.clientName} (${bundle.rec.id})`);
  }
  console.error("No demo env key match, no 'test' in client name, and multiple clients (or no records).");
  console.error("Indexed clients:", summaries.join("; ") || "(none)");
  console.error("Set FIT_ROOM_DEMO_TEST_CLIENT_KEY to the API key string, or add 'test' to the client name.");
  return null;
}

const bundle = await pickTarget();
if (!bundle) {
  console.error("Could not load any client record.");
  process.exit(1);
}

const next = { ...bundle.rec, contactEmail: emailArg };
await redis.set(bundle.redisKey, next);

console.log("Updated contactEmail:", emailArg);
console.log("client id:", next.id, "clientName:", next.clientName);
