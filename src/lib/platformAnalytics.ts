import { randomUUID } from "node:crypto";
import { getRedis, listClientKeys } from "./apiKeyStore";
import {
  WEAR_ME_TIMELINE_DAYS,
  busySlotsFromHourlyTotals,
  buildLastNDatesUtcDescending,
  emptyBusySlots,
  emptyWearMeRetailDashboardStats,
  isoDayUtcShortUk,
  partOfDayFromHour,
  utcDayStartMs,
  weekdaysMondayFirstBars,
} from "./wearMeRetailDashboardStats";
import type { WearMeRetailDashboardStats } from "./wearMeRetailDashboardStats";

/** HttpOnly cookie set on /demo so try-ons can attribute demo usage to the same visitor. */
export const DEMO_ANALYTICS_SESSION_COOKIE = "fit-room_demo_sid";

function demoDayKey(d = new Date()) {
  return `fit-room:analytics:demo:day:${d.toISOString().slice(0, 10)}`;
}

function demoMonthKey(d = new Date()) {
  return `fit-room:analytics:demo:month:${d.toISOString().slice(0, 7)}`;
}

const TRYON_TOTAL = "fit-room:analytics:tryon:total";
const TRYON_RETAILER = "fit-room:analytics:tryon:retailer";
const TRYON_VISITOR = "fit-room:analytics:tryon:visitor";

/** All completed try-ons, UTC hour 0–23 → count (Redis hash field = hour). */
const TRYON_GLOBAL_HOUR_UTC = "fit-room:analytics:tryon:global:hourUtc";
/** All completed try-ons, UTC weekday 0=Sun … 6=Sat → count. */
const TRYON_GLOBAL_WEEKDAY_UTC = "fit-room:analytics:tryon:global:weekdayUtc";

function tryOnClientHourKey(clientId: string) {
  return `fit-room:analytics:tryon:client:${clientId}:hourUtc`;
}
function tryOnClientWeekdayKey(clientId: string) {
  return `fit-room:analytics:tryon:client:${clientId}:weekdayUtc`;
}

const CLIENT_STATS_PREFIX = "fit-room:analytics:clientStats:";
const CLIENT_STATS_INDEX = "fit-room:analytics:clientStats:ids";

const DEMO_VISITOR_PREFIX = "fit-room:analytics:demoVisitor:";
const DEMO_VISITOR_INDEX = "fit-room:analytics:demoVisitor:index";

const DEMO_VISITOR_DETAIL_LIMIT = 250;

export type ClientAnalyticsRow = {
  kind: "client";
  clientId: string;
  clientName: string;
  visits: number;
  tryOns: number;
  lastActive: string | null;
};

export type DemoVisitorAnalyticsRow = {
  kind: "demo";
  label: string;
  sessionId: string | null;
  lastIp: string;
  visits: number;
  tryOns: number;
  lastActive: string | null;
};

export type TryOnTimingBuckets = {
  /** Length 24: index = UTC hour 0–23. */
  tryOnByHourUtc: number[];
  /** Length 7: index = JS getUTCDay() 0=Sun … 6=Sat. */
  tryOnByWeekdayUtc: number[];
};

export type {
  WearMeBusyTimeSlot,
  WearMeDailyTryOnPoint,
  WearMeRetailDashboardStats,
  WearMeWeekdayBar,
} from "./wearMeRetailDashboardStats";

async function retailerTryOnsFromStatsHash(clientId: string): Promise<number> {
  try {
    const h = (await getRedis().hgetall(`${CLIENT_STATS_PREFIX}${clientId.trim()}`)) as Record<
      string,
      string
    > | null;
    return h?.tryOns != null ? num(h.tryOns) : 0;
  } catch {
    return 0;
  }
}

/**
 * Try-on aggregates for Wear Me Stats: 30‑day timeline, best time-of-day blocks, weekdays, hero total.
 * Recent slices use whichever events fall in that window inside the capped event log (`TRYON_EVENT_LOG_SCAN_CAP`).
 * When the recent window looks empty but lifetime timing buckets exist, time-of-day and weekday summaries fall back
 * to Redis timing histograms (all time since tracking started).
 */
export async function getWearMeRetailDashboardStats(clientId: string): Promise<WearMeRetailDashboardStats> {
  if (!clientId?.trim()) {
    return emptyWearMeRetailDashboardStats();
  }

  const id = clientId.trim();
  const redis = getRedis();
  const [timing, statsTotal, rawLines] = await Promise.all([
    getTryOnTimingForClient(id),
    retailerTryOnsFromStatsHash(id),
    redis.lrange(tryOnEventsListKey(id), 0, TRYON_EVENT_LOG_SCAN_CAP - 1),
  ]);
  const eventLines = Array.isArray(rawLines)
    ? (rawLines as unknown[]).map((line) => String(line ?? "")).filter(Boolean)
    : [];

  const hourlyTotalLifetime = timing.tryOnByHourUtc.reduce((a, b) => a + b, 0);
  const allTimeTryOnTotal = Math.max(statsTotal, hourlyTotalLifetime);

  const dateKeysOrdered = buildLastNDatesUtcDescending(WEAR_ME_TIMELINE_DAYS);
  const windowStartMs = Date.parse(`${dateKeysOrdered[0]}T00:00:00.000Z`);
  const nowUtc = new Date();
  const windowEndExclusive = utcDayStartMs(
    nowUtc.getUTCFullYear(),
    nowUtc.getUTCMonth(),
    nowUtc.getUTCDate() + 1,
  );

  const dailyCounts = new Map<string, number>();
  for (const dk of dateKeysOrdered) dailyCounts.set(dk, 0);

  const recentBuckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const recentWeekdaySunFirst = Array.from({ length: 7 }, () => 0);

  for (const line of eventLines) {
    try {
      const o = JSON.parse(line) as { at?: string };
      const atRaw = o?.at?.trim();
      if (!atRaw) continue;
      const ms = Date.parse(atRaw);
      if (!Number.isFinite(ms)) continue;

      const ymd =
        /^(\d{4}-\d{2}-\d{2})/.exec(new Date(ms).toISOString())?.[1];
      if (!ymd) continue;
      if (ms >= windowStartMs && ms < windowEndExclusive) {
        const dayCnt = dailyCounts.get(ymd);
        if (dayCnt !== undefined) dailyCounts.set(ymd, dayCnt + 1);
        const h = new Date(ms).getUTCHours();
        recentBuckets[partOfDayFromHour(h)] += 1;
        const wd = new Date(ms).getUTCDay();
        recentWeekdaySunFirst[wd] += 1;
      }
    } catch {
      /* skip */
    }
  }

  const dailyTryOnsLast30 = dateKeysOrdered.map((date) => ({
    date,
    shortLabel: isoDayUtcShortUk(date),
    count: dailyCounts.get(date) ?? 0,
  }));

  const recentSlotTotal =
    recentBuckets.morning + recentBuckets.afternoon + recentBuckets.evening + recentBuckets.night;
  const busyTimeSlots =
    recentSlotTotal > 0 ? emptyBusySlots(recentBuckets) : busySlotsFromHourlyTotals(timing.tryOnByHourUtc);

  const recentWeekSum = recentWeekdaySunFirst.reduce((a, b) => a + b, 0);
  const weekdaysMondayFirst =
    recentWeekSum > 0 ? weekdaysMondayFirstBars(recentWeekdaySunFirst) : weekdaysMondayFirstBars(timing.tryOnByWeekdayUtc);

  return {
    allTimeTryOnTotal,
    dailyTryOnsLast30,
    busyTimeSlots,
    weekdaysMondayFirst,
  };
}

export type PlatformAnalyticsSummary = {
  demoVisitsToday: number;
  demoVisitsThisMonth: number;
  tryOnsTotal: number;
  tryOnsRetailer: number;
  tryOnsVisitor: number;
  clients: ClientAnalyticsRow[];
  demoVisitors: DemoVisitorAnalyticsRow[];
} & TryOnTimingBuckets;

function num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function hashToBuckets(h: Record<string, string> | null | undefined, length: number): number[] {
  if (!h) return Array.from({ length }, () => 0);
  return Array.from({ length }, (_, i) => num(h[String(i)]));
}

async function loadGlobalTryOnTiming(redis: ReturnType<typeof getRedis>): Promise<TryOnTimingBuckets> {
  const [hHour, hWeek] = await Promise.all([
    redis.hgetall(TRYON_GLOBAL_HOUR_UTC),
    redis.hgetall(TRYON_GLOBAL_WEEKDAY_UTC),
  ]);
  return {
    tryOnByHourUtc: hashToBuckets(hHour as Record<string, string> | null, 24),
    tryOnByWeekdayUtc: hashToBuckets(hWeek as Record<string, string> | null, 7),
  };
}

function tryOnEventsListKey(clientId: string) {
  return `fit-room:tryon:events:${clientId}`;
}

const TRYON_EVENT_LOG_SCAN_CAP = 25_000;

/** Rebuild hour/weekday histograms from stored try-on event log (ISO `at` timestamps) when Redis timing hashes are empty. */
function timingBucketsFromEventJsonLines(lines: string[]): TryOnTimingBuckets {
  const tryOnByHourUtc = Array.from({ length: 24 }, () => 0);
  const tryOnByWeekdayUtc = Array.from({ length: 7 }, () => 0);
  for (const line of lines) {
    try {
      const o = JSON.parse(line) as { at?: string };
      const at = o?.at?.trim();
      if (!at) continue;
      const d = new Date(at);
      if (!Number.isFinite(d.getTime())) continue;
      tryOnByHourUtc[d.getUTCHours()] += 1;
      tryOnByWeekdayUtc[d.getUTCDay()] += 1;
    } catch {
      /* skip bad row */
    }
  }
  return { tryOnByHourUtc, tryOnByWeekdayUtc };
}

/** Per-client try-on timing (all try-ons billed to this client id). */
export async function getTryOnTimingForClient(clientId: string): Promise<TryOnTimingBuckets> {
  if (!clientId) {
    return {
      tryOnByHourUtc: Array.from({ length: 24 }, () => 0),
      tryOnByWeekdayUtc: Array.from({ length: 7 }, () => 0),
    };
  }
  try {
    const redis = getRedis();
    const [hHour, hWeek, eventLinesRaw] = await Promise.all([
      redis.hgetall(tryOnClientHourKey(clientId)),
      redis.hgetall(tryOnClientWeekdayKey(clientId)),
      redis.lrange(tryOnEventsListKey(clientId), 0, TRYON_EVENT_LOG_SCAN_CAP - 1),
    ]);
    const eventLines = Array.isArray(eventLinesRaw)
      ? (eventLinesRaw as unknown[]).map((line) => String(line ?? "")).filter(Boolean)
      : [];
    const fromHash: TryOnTimingBuckets = {
      tryOnByHourUtc: hashToBuckets(hHour as Record<string, string> | null, 24),
      tryOnByWeekdayUtc: hashToBuckets(hWeek as Record<string, string> | null, 7),
    };
    const hashTotal =
      fromHash.tryOnByHourUtc.reduce((a, b) => a + b, 0) + fromHash.tryOnByWeekdayUtc.reduce((a, b) => a + b, 0);
    if (hashTotal > 0) return fromHash;

    const fromEvents = timingBucketsFromEventJsonLines(eventLines);
    const evTotal =
      fromEvents.tryOnByHourUtc.reduce((a, b) => a + b, 0) + fromEvents.tryOnByWeekdayUtc.reduce((a, b) => a + b, 0);
    if (evTotal > 0) return fromEvents;

    return fromHash;
  } catch (e) {
    console.error("[platformAnalytics] getTryOnTimingForClient failed", e);
    return {
      tryOnByHourUtc: Array.from({ length: 24 }, () => 0),
      tryOnByWeekdayUtc: Array.from({ length: 7 }, () => 0),
    };
  }
}

/** Global UTC try-on timing histograms (all completed try-ons). */
export async function getGlobalTryOnTiming(): Promise<TryOnTimingBuckets> {
  try {
    const redis = getRedis();
    return await loadGlobalTryOnTiming(redis);
  } catch (e) {
    console.error("[platformAnalytics] getGlobalTryOnTiming failed", e);
    return {
      tryOnByHourUtc: Array.from({ length: 24 }, () => 0),
      tryOnByWeekdayUtc: Array.from({ length: 7 }, () => 0),
    };
  }
}

/** Best-effort client IP for analytics (Vercel / proxies). */
export function getRequestClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 128);
  return "unknown";
}

function isLikelySessionId(value: string): boolean {
  const v = value.trim();
  if (v.length < 8 || v.length > 128) return false;
  if (!/^[a-zA-Z0-9._-]+$/.test(v)) return false;
  return true;
}

export function readDemoSessionFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(/(?:^|;\s*)fit-room_demo_sid=([^;]+)/i);
  if (!m?.[1]) return null;
  const raw = decodeURIComponent(m[1]!.trim());
  return isLikelySessionId(raw) ? raw : null;
}

/** Set-Cookie header value (full header value after `Set-Cookie: `). */
export function buildDemoSessionSetCookie(sessionId: string): string {
  const parts = [
    `${DEMO_ANALYTICS_SESSION_COOKIE}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "Max-Age=31536000",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

function demoVisitorRedisKey(visitorId: string) {
  return `${DEMO_VISITOR_PREFIX}${visitorId}`;
}

function demoVisitorLabel(visitorId: string, lastIp: string): string {
  if (visitorId.startsWith("ip:")) {
    const ip = visitorId.slice(3) || lastIp || "unknown";
    return `IP ${ip} (no session cookie)`;
  }
  const short = visitorId.length > 12 ? `${visitorId.slice(0, 8)}…` : visitorId;
  return `Session ${short} · IP ${lastIp || "—"}`;
}

async function bumpClientVisit(clientId: string, clientName: string, at: string) {
  const redis = getRedis();
  const key = `${CLIENT_STATS_PREFIX}${clientId}`;
  await redis.hincrby(key, "visits", 1);
  await redis.hset(key, { clientName, lastActive: at });
  await redis.sadd(CLIENT_STATS_INDEX, clientId);
}

async function bumpClientTryOn(clientId: string, clientName: string, at: string) {
  const redis = getRedis();
  const key = `${CLIENT_STATS_PREFIX}${clientId}`;
  await redis.hincrby(key, "tryOns", 1);
  await redis.hset(key, { clientName, lastActive: at });
  await redis.sadd(CLIENT_STATS_INDEX, clientId);
}

async function bumpDemoVisitorVisit(visitorId: string, ip: string, at: string, atMs: number) {
  const redis = getRedis();
  const key = demoVisitorRedisKey(visitorId);
  await redis.hincrby(key, "visits", 1);
  await redis.hset(key, { lastIp: ip, lastActive: at });
  await redis.zadd(DEMO_VISITOR_INDEX, { score: atMs, member: visitorId });
}

async function bumpDemoVisitorTryOn(visitorId: string, ip: string, at: string, atMs: number) {
  const redis = getRedis();
  const key = demoVisitorRedisKey(visitorId);
  await redis.hincrby(key, "tryOns", 1);
  await redis.hset(key, { lastIp: ip, lastActive: at });
  await redis.zadd(DEMO_VISITOR_INDEX, { score: atMs, member: visitorId });
}

/** Widget / embed: one visit beacon per page load (requires valid client API key). */
export async function recordClientKeyVisit(clientId: string, clientName: string): Promise<void> {
  try {
    const at = new Date();
    const iso = at.toISOString();
    await bumpClientVisit(clientId, clientName, iso);
  } catch (e) {
    console.error("[platformAnalytics] recordClientKeyVisit failed", e);
  }
}

/** One demo page load: global day/month + per-visitor visit row. */
export async function recordDemoPageLoad(params: {
  visitorSessionId: string;
  ip: string;
}): Promise<void> {
  try {
    const redis = getRedis();
    const d = new Date();
    const iso = d.toISOString();
    const atMs = d.getTime();
    await Promise.all([
      redis.incr(demoDayKey(d)),
      redis.incr(demoMonthKey(d)),
      bumpDemoVisitorVisit(params.visitorSessionId, params.ip, iso, atMs),
    ]);
  } catch (e) {
    console.error("[platformAnalytics] recordDemoPageLoad failed", e);
  }
}

/**
 * Successful try-on completion.
 * Retailer: increments global retailer totals and per-client try-ons (name stored with stats).
 * Demo / visitor: increments global visitor totals and per-demo-visitor try-ons (session cookie or IP).
 */
export async function recordTryOnCompleted(params: {
  isRetailer: boolean;
  clientId: string;
  clientName: string;
  demoSessionId: string | null;
  demoIp: string;
}): Promise<void> {
  try {
    const redis = getRedis();
    const now = new Date();
    const at = now.toISOString();
    const atMs = now.getTime();
    const { isRetailer, clientId, clientName, demoSessionId, demoIp } = params;

    await Promise.all([
      redis.incr(TRYON_TOTAL),
      redis.incr(isRetailer ? TRYON_RETAILER : TRYON_VISITOR),
    ]);

    const hourUtc = now.getUTCHours();
    const weekdayUtc = now.getUTCDay();

    const globalTiming = [
      redis.hincrby(TRYON_GLOBAL_HOUR_UTC, String(hourUtc), 1),
      redis.hincrby(TRYON_GLOBAL_WEEKDAY_UTC, String(weekdayUtc), 1),
    ];
    const clientTiming = isRetailer
      ? [
          redis.hincrby(tryOnClientHourKey(clientId), String(hourUtc), 1),
          redis.hincrby(tryOnClientWeekdayKey(clientId), String(weekdayUtc), 1),
        ]
      : [];

    if (isRetailer) {
      await Promise.all([bumpClientTryOn(clientId, clientName, at), ...globalTiming, ...clientTiming]);
    } else {
      const sid = demoSessionId?.trim() || null;
      const visitorId =
        sid && isLikelySessionId(sid) ? sid : `ip:${demoIp.replace(/[^\d.a-fA-F:]/g, "_").slice(0, 120) || "unknown"}`;
      await Promise.all([bumpDemoVisitorTryOn(visitorId, demoIp, at, atMs), ...globalTiming]);
    }
  } catch (e) {
    console.error("[platformAnalytics] recordTryOnCompleted failed", e);
  }
}

export async function getPlatformAnalyticsSummary(): Promise<PlatformAnalyticsSummary> {
  try {
    const redis = getRedis();
    const d = new Date();
    const [demoToday, demoMonth, tryOnsTotal, tryOnsRetailer, tryOnsVisitor, allClients] =
      await Promise.all([
        redis.get(demoDayKey(d)),
        redis.get(demoMonthKey(d)),
        redis.get(TRYON_TOTAL),
        redis.get(TRYON_RETAILER),
        redis.get(TRYON_VISITOR),
        listClientKeys(),
      ]);

    const clientRows: ClientAnalyticsRow[] = [];
    for (const c of allClients) {
      const h = (await redis.hgetall(`${CLIENT_STATS_PREFIX}${c.id}`)) as Record<string, string> | null;
      const visits = h && "visits" in h ? num(h.visits) : 0;
      const tryOns = h && "tryOns" in h ? num(h.tryOns) : 0;
      const lastActive = h?.lastActive?.trim() || null;
      clientRows.push({
        kind: "client",
        clientId: c.id,
        clientName: c.clientName,
        visits,
        tryOns,
        lastActive,
      });
    }
    clientRows.sort((a, b) => {
      const ta = a.lastActive ? Date.parse(a.lastActive) : 0;
      const tb = b.lastActive ? Date.parse(b.lastActive) : 0;
      return tb - ta;
    });

    const visitorIds = (await redis.zrange(DEMO_VISITOR_INDEX, 0, DEMO_VISITOR_DETAIL_LIMIT - 1, {
      rev: true,
    })) as string[];

    const demoVisitors: DemoVisitorAnalyticsRow[] = [];
    for (const visitorId of visitorIds) {
      const h = (await redis.hgetall(demoVisitorRedisKey(visitorId))) as Record<string, string> | null;
      if (!h || Object.keys(h).length === 0) continue;
      const lastIp = (h.lastIp || "").trim() || "—";
      const lastActive = h.lastActive?.trim() || null;
      const visits = num(h.visits);
      const tryOns = num(h.tryOns);
      const sessionId = visitorId.startsWith("ip:") ? null : visitorId;
      demoVisitors.push({
        kind: "demo",
        label: demoVisitorLabel(visitorId, lastIp),
        sessionId,
        lastIp,
        visits,
        tryOns,
        lastActive,
      });
    }

    const timing = await loadGlobalTryOnTiming(redis);

    return {
      demoVisitsToday: num(demoToday),
      demoVisitsThisMonth: num(demoMonth),
      tryOnsTotal: num(tryOnsTotal),
      tryOnsRetailer: num(tryOnsRetailer),
      tryOnsVisitor: num(tryOnsVisitor),
      clients: clientRows,
      demoVisitors,
      ...timing,
    };
  } catch (e) {
    console.error("[platformAnalytics] getPlatformAnalyticsSummary failed", e);
    return {
      demoVisitsToday: 0,
      demoVisitsThisMonth: 0,
      tryOnsTotal: 0,
      tryOnsRetailer: 0,
      tryOnsVisitor: 0,
      clients: [],
      demoVisitors: [],
      tryOnByHourUtc: Array.from({ length: 24 }, () => 0),
      tryOnByWeekdayUtc: Array.from({ length: 7 }, () => 0),
    };
  }
}

/** Create a new demo session id when cookie is absent. */
export function newDemoSessionId(): string {
  return randomUUID();
}
