import { getRedis } from "./apiKeyStore";
import { LOCAL_OR_UNKNOWN_PRODUCT } from "./tryOnConstants";

export { LOCAL_OR_UNKNOWN_PRODUCT } from "./tryOnConstants";

const PRODUCT_URL_MAX = 2000;
const EVENTS_MAX = 10_000;

export type TryOnEventRecord = {
  clientId: string;
  productImageUrl: string;
  at: string;
};

export type TopTryOnProduct = {
  productImageUrl: string;
  tryOnCount: number;
};

/**
 * Normalizes a product image URL for storage and counting.
 * Non-http(s) or empty values map to `LOCAL_OR_UNKNOWN_PRODUCT`.
 */
export function normalizeProductImageUrl(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return LOCAL_OR_UNKNOWN_PRODUCT;
  if (s.length > PRODUCT_URL_MAX) return s.slice(0, PRODUCT_URL_MAX);
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return LOCAL_OR_UNKNOWN_PRODUCT;
    return u.toString();
  } catch {
    return LOCAL_OR_UNKNOWN_PRODUCT;
  }
}

/**
 * Records a completed try-on: increments per-URL score and appends an audit event (timestamp + URL + client id).
 */
export async function recordTryOnProductUsage(params: {
  clientId: string;
  productImageUrl: string;
  at: string; // ISO
}): Promise<void> {
  const redis = getRedis();
  const productImageUrl = normalizeProductImageUrl(params.productImageUrl);
  const id = params.clientId;
  const line: TryOnEventRecord = {
    clientId: id,
    productImageUrl,
    at: params.at,
  };
  const payload = JSON.stringify(line);
  try {
    await Promise.all([
      redis.zincrby(`disquant:tryon:products:${id}`, 1, productImageUrl),
      redis.lpush(`disquant:tryon:events:${id}`, payload),
    ]);
    await redis.ltrim(`disquant:tryon:events:${id}`, 0, EVENTS_MAX - 1);
  } catch (e) {
    console.error("[tryOnAnalytics] record failed", e);
  }
}

/**
 * Returns the top N product image URLs by try-on count for a client.
 */
export async function getTopTryOnProducts(
  clientId: string,
  limit = 5,
): Promise<TopTryOnProduct[]> {
  const redis = getRedis();
  const key = `disquant:tryon:products:${clientId}`;
  try {
    const raw = (await redis.zrange(key, 0, limit - 1, {
      rev: true,
      withScores: true,
    })) as unknown;

    if (Array.isArray(raw) && raw.length > 0) {
      if (typeof raw[0] === "object" && raw[0] !== null && "member" in (raw[0] as object)) {
        return (raw as { member: string; score: number }[]).map((r) => ({
          productImageUrl: r.member,
          tryOnCount: Math.round(Number(r.score)),
        }));
      }
      if (raw.length % 2 === 0) {
        const out: TopTryOnProduct[] = [];
        for (let i = 0; i < raw.length; i += 2) {
          out.push({
            productImageUrl: String(raw[i]),
            tryOnCount: Math.round(Number(raw[i + 1])),
          });
        }
        return out;
      }
    }
  } catch (e) {
    console.error("[tryOnAnalytics] getTop failed", e);
  }
  return [];
}
