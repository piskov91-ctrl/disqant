/**
 * Deletes all retailer accounts and sessions from Upstash Redis (keys matching `disquant:retailer:*`).
 *
 * Usage (from repo root, with env loaded):
 *   export $(grep -v '^#' .env.local | xargs)   # or set KV_REST_* manually
 *   node scripts/reset-retailer-auth.mjs
 *
 * Requires: KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_*).
 */
import { Redis } from "@upstash/redis";

const LUA = `
local keys = redis.call('KEYS', ARGV[1])
local n = 0
for i = 1, #keys do
  redis.call('DEL', keys[i])
  n = n + 1
end
return n
`;

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  console.error(
    "Missing Redis credentials. Set UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL / KV_REST_API_TOKEN.",
  );
  process.exit(1);
}

const redis = new Redis({ url, token });

const deleted = await redis.eval(LUA, [], ["disquant:retailer:*"]);
console.log(`Removed ${deleted} key(s) matching disquant:retailer:*`);
console.log("Retailer auth reset complete. Existing browser cookies are now invalid.");
