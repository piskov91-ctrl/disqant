import { getRedis } from "@/lib/apiKeyStore";
import { getRequestClientIp } from "@/lib/platformAnalytics";
import { DEMO_OWN_TRYON_LIMIT } from "@/lib/demoOwnTryOnLimit";

export const runtime = "nodejs";

/** Per-IP counter of demo own-product try-ons. */
const ipKey = (ip: string) => `fit-room:demo:own-tryon:ip:${ip}`;

/** Keep the limit "sticky" for a while, then let it reset so the demo stays usable long-term. */
const KEY_TTL_SEC = 60 * 60 * 24 * 30;

function parseCount(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function payload(used: number) {
  const remaining = Math.max(0, DEMO_OWN_TRYON_LIMIT - used);
  return { used, remaining, limit: DEMO_OWN_TRYON_LIMIT };
}

/** Returns how many own-product try-ons this IP has used (no mutation). */
export async function GET(req: Request) {
  const ip = getRequestClientIp(req);
  let used = 0;
  try {
    used = parseCount(await getRedis().get(ipKey(ip)));
  } catch {
    // If Redis is unavailable, do not block the demo (localStorage still gates the browser).
    used = 0;
  }
  return Response.json(payload(used));
}

/** Increments this IP's counter (called after a successful own-product try-on) and returns the new totals. */
export async function POST(req: Request) {
  const ip = getRequestClientIp(req);
  try {
    const redis = getRedis();
    const key = ipKey(ip);
    const used = parseCount(await redis.incr(key));
    await redis.expire(key, KEY_TTL_SEC);
    return Response.json(payload(used));
  } catch {
    // Redis failure should not break the user's try-on; report a permissive state.
    return Response.json(payload(0));
  }
}
