import { getRedis } from "@/lib/apiKeyStore";

const DAY_PREFIX = "fit-room:email-sent:day:";
const MONTH_PREFIX = "fit-room:email-sent:month:";

/** TTL so inactive keys expire (UTC calendar keys roll over by date string). */
const DAY_KEY_TTL_SEC = 60 * 60 * 72;
const MONTH_KEY_TTL_SEC = 60 * 60 * 24 * 45;

function utcYyyyMmDd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function utcYyyyMm(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function fitRoomEmailSentDayKey(d = new Date()) {
  return `${DAY_PREFIX}${utcYyyyMmDd(d)}`;
}

export function fitRoomEmailSentMonthKey(d = new Date()) {
  return `${MONTH_PREFIX}${utcYyyyMm(d)}`;
}

/**
 * Increment Redis counters after a successful `sendFitRoomMail` send.
 * Swallows Redis errors so email delivery is never affected.
 */
export async function incrementFitRoomEmailSentCounters(): Promise<void> {
  const redis = getRedis();
  const dayKey = fitRoomEmailSentDayKey();
  const monthKey = fitRoomEmailSentMonthKey();
  await redis.incr(dayKey);
  await redis.expire(dayKey, DAY_KEY_TTL_SEC);
  await redis.incr(monthKey);
  await redis.expire(monthKey, MONTH_KEY_TTL_SEC);
}

function parseRedisCount(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function getFitRoomEmailSentCounts(): Promise<{ emailsSentToday: number; emailsSentThisMonth: number }> {
  const redis = getRedis();
  const now = new Date();
  const [dayRaw, monthRaw] = await Promise.all([
    redis.get(fitRoomEmailSentDayKey(now)),
    redis.get(fitRoomEmailSentMonthKey(now)),
  ]);
  return {
    emailsSentToday: parseRedisCount(dayRaw),
    emailsSentThisMonth: parseRedisCount(monthRaw),
  };
}
