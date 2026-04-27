import { getRedis } from "./apiKeyStore";

function demoDayKey(d = new Date()) {
  return `disquant:analytics:demo:day:${d.toISOString().slice(0, 10)}`;
}

function demoMonthKey(d = new Date()) {
  return `disquant:analytics:demo:month:${d.toISOString().slice(0, 7)}`;
}

const TRYON_TOTAL = "disquant:analytics:tryon:total";
const TRYON_RETAILER = "disquant:analytics:tryon:retailer";
const TRYON_VISITOR = "disquant:analytics:tryon:visitor";

export type PlatformAnalyticsSummary = {
  demoVisitsToday: number;
  demoVisitsThisMonth: number;
  tryOnsTotal: number;
  tryOnsRetailer: number;
  tryOnsVisitor: number;
};

function num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** One demo page load (client beacons from /demo). */
export async function recordDemoPageLoad(): Promise<void> {
  try {
    const redis = getRedis();
    const d = new Date();
    await Promise.all([redis.incr(demoDayKey(d)), redis.incr(demoMonthKey(d))]);
  } catch (e) {
    console.error("[platformAnalytics] recordDemoPageLoad failed", e);
  }
}

/**
 * Successful try-on completion. `isRetailer` = request included `x-api-key` / client key
 * (embedded widget / retailer); otherwise counted as demo / regular visitor usage.
 */
export async function recordTryOnCompleted(isRetailer: boolean): Promise<void> {
  try {
    const redis = getRedis();
    await Promise.all([
      redis.incr(TRYON_TOTAL),
      redis.incr(isRetailer ? TRYON_RETAILER : TRYON_VISITOR),
    ]);
  } catch (e) {
    console.error("[platformAnalytics] recordTryOnCompleted failed", e);
  }
}

export async function getPlatformAnalyticsSummary(): Promise<PlatformAnalyticsSummary> {
  try {
    const redis = getRedis();
    const d = new Date();
    const [demoToday, demoMonth, tryOnsTotal, tryOnsRetailer, tryOnsVisitor] = await Promise.all([
      redis.get(demoDayKey(d)),
      redis.get(demoMonthKey(d)),
      redis.get(TRYON_TOTAL),
      redis.get(TRYON_RETAILER),
      redis.get(TRYON_VISITOR),
    ]);
    return {
      demoVisitsToday: num(demoToday),
      demoVisitsThisMonth: num(demoMonth),
      tryOnsTotal: num(tryOnsTotal),
      tryOnsRetailer: num(tryOnsRetailer),
      tryOnsVisitor: num(tryOnsVisitor),
    };
  } catch (e) {
    console.error("[platformAnalytics] getPlatformAnalyticsSummary failed", e);
    return {
      demoVisitsToday: 0,
      demoVisitsThisMonth: 0,
      tryOnsTotal: 0,
      tryOnsRetailer: 0,
      tryOnsVisitor: 0,
    };
  }
}
