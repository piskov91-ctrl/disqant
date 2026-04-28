import { getRedis, listClientKeys } from "./apiKeyStore";
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

function tryonProductsKey(clientId: string) {
  return `fit-room:tryon:products:${clientId}`;
}

/** Pre-rename product zset; merged on read with {@link tryonProductsKey} for continuity after rebrand. */
function tryonProductsKeyLegacy(clientId: string) {
  return `disquant:tryon:products:${clientId}`;
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
      redis.zincrby(tryonProductsKey(id), 1, productImageUrl),
      redis.lpush(`fit-room:tryon:events:${id}`, payload),
    ]);
    await redis.ltrim(`fit-room:tryon:events:${id}`, 0, EVENTS_MAX - 1);
  } catch (e) {
    console.error("[tryOnAnalytics] record failed", e);
  }
}

/**
 * Returns the top N product image URLs by try-on count for a client.
 */
function parseZrangeWithScores(raw: unknown, maxPairs: number): TopTryOnProduct[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === "object" && raw[0] !== null && "member" in (raw[0] as object)) {
    return (raw as { member: string; score: number }[])
      .slice(0, maxPairs)
      .map((r) => ({
        productImageUrl: r.member,
        tryOnCount: Math.round(Number(r.score)),
      }));
  }
  if (raw.length % 2 !== 0) return [];
  const out: TopTryOnProduct[] = [];
  const cap = Math.min(maxPairs, Math.floor(raw.length / 2));
  for (let i = 0; i < cap; i++) {
    out.push({
      productImageUrl: String(raw[i * 2]),
      tryOnCount: Math.round(Number(raw[i * 2 + 1])),
    });
  }
  return out;
}

function mergeZrangeIntoCounts(map: Map<string, number>, raw: unknown) {
  for (const r of parseZrangeWithScores(raw, 1_000_000)) {
    map.set(r.productImageUrl, (map.get(r.productImageUrl) ?? 0) + r.tryOnCount);
  }
}

export async function getTopTryOnProducts(
  clientId: string,
  limit = 5,
): Promise<TopTryOnProduct[]> {
  const redis = getRedis();
  const fetchCap = Math.min(2000, Math.max(limit * 8, limit));
  try {
    const [newRaw, oldRaw] = await Promise.all([
      redis.zrange(tryonProductsKey(clientId), 0, fetchCap - 1, {
        rev: true,
        withScores: true,
      }) as unknown,
      redis.zrange(tryonProductsKeyLegacy(clientId), 0, fetchCap - 1, {
        rev: true,
        withScores: true,
      }) as unknown,
    ]);
    const map = new Map<string, number>();
    mergeZrangeIntoCounts(map, newRaw);
    mergeZrangeIntoCounts(map, oldRaw);
    return Array.from(map.entries())
      .map(([productImageUrl, tryOnCount]) => ({ productImageUrl, tryOnCount }))
      .sort((a, b) => b.tryOnCount - a.tryOnCount)
      .slice(0, limit);
  } catch (e) {
    console.error("[tryOnAnalytics] getTop failed", e);
  }
  return [];
}

/** All ranked product URLs for a client (most popular first). Capped for payload safety. */
export async function getAllTryOnProducts(clientId: string, max = 2000): Promise<TopTryOnProduct[]> {
  if (!clientId) return [];
  const redis = getRedis();
  const cap = Math.min(max, 5000);
  try {
    const [newRaw, oldRaw] = await Promise.all([
      redis.zrange(tryonProductsKey(clientId), 0, cap - 1, {
        rev: true,
        withScores: true,
      }) as unknown,
      redis.zrange(tryonProductsKeyLegacy(clientId), 0, cap - 1, {
        rev: true,
        withScores: true,
      }) as unknown,
    ]);
    const map = new Map<string, number>();
    mergeZrangeIntoCounts(map, newRaw);
    mergeZrangeIntoCounts(map, oldRaw);
    return Array.from(map.entries())
      .map(([productImageUrl, tryOnCount]) => ({ productImageUrl, tryOnCount }))
      .sort((a, b) => b.tryOnCount - a.tryOnCount)
      .slice(0, max);
  } catch (e) {
    console.error("[tryOnAnalytics] getAllTryOnProducts failed", e);
  }
  return [];
}

/** Merge product counts across all API key clients; most popular first. */
export async function getAllTryOnProductsAggregated(maxProducts = 800): Promise<TopTryOnProduct[]> {
  try {
    const clients = await listClientKeys();
    const merged = new Map<string, number>();
    for (const c of clients) {
      const rows = await getAllTryOnProducts(c.id, 4000);
      for (const r of rows) {
        merged.set(r.productImageUrl, (merged.get(r.productImageUrl) ?? 0) + r.tryOnCount);
      }
    }
    return Array.from(merged.entries())
      .map(([productImageUrl, tryOnCount]) => ({ productImageUrl, tryOnCount }))
      .sort((a, b) => b.tryOnCount - a.tryOnCount)
      .slice(0, maxProducts);
  } catch (e) {
    console.error("[tryOnAnalytics] getAllTryOnProductsAggregated failed", e);
  }
  return [];
}

/** Human-readable label for analytics (from URL or upload bucket). */
export function productDisplayName(productImageUrl: string): string {
  if (productImageUrl === LOCAL_OR_UNKNOWN_PRODUCT) return "Custom upload / unknown product";
  try {
    const u = new URL(productImageUrl);
    const seg = u.pathname.split("/").filter(Boolean).pop();
    if (seg) {
      let decoded = seg;
      try {
        decoded = decodeURIComponent(seg);
      } catch {
        /* keep raw */
      }
      return decoded.length > 96 ? `${decoded.slice(0, 93)}…` : decoded;
    }
    return u.hostname;
  } catch {
    return productImageUrl.length > 96 ? `${productImageUrl.slice(0, 93)}…` : productImageUrl;
  }
}
