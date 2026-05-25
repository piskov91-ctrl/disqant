import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  deleteClientKey,
  getClientKeyRecordById,
  getRedis,
  type ClientApiKeyRecord,
  markClientKeyDeleted,
} from "@/lib/apiKeyStore";
import { validateRetailerPasswordStrength } from "@/lib/retailerPasswordPolicy";

export const RETAILER_SESSION_COOKIE = "fit-room_retailer_session";

/** Session cookies from before the Fit Room rename; browsers may still send these until the next login. */
export const LEGACY_RETAILER_SESSION_COOKIE_NAMES = [
  "disquant_retailer_session",
  "disqant_retailer_session",
] as const;

const RETAILER_SESSION_REDIS_TTL_SEC = 60 * 60 * 24 * 14; // server-side token expiry; browser cookie is session-only

/**
 * Use `AUTH_INSECURE_COOKIE=1` when running `next start` (production NODE_ENV) over **http** locally;
 * otherwise `Secure` cookies are not stored and login loops back to `/login`.
 */
function retailerSessionCookieSecure(): boolean {
  if (process.env.AUTH_INSECURE_COOKIE === "1") return false;
  return process.env.NODE_ENV === "production";
}

const USER_PREFIX = "fit-room:retailer:user:";
const EMAIL_INDEX = "fit-room:retailer:email:";
const SESS_PREFIX = "fit-room:retailer:session:";

/** Pre-rename Upstash keys; accounts and sessions created before the rebrand still live here. */
const LEGACY_USER_PREFIX = "disquant:retailer:user:";
const LEGACY_EMAIL_INDEX = "disquant:retailer:email:";
const LEGACY_SESS_PREFIX = "disquant:retailer:session:";

function userKey(id: string) {
  return `${USER_PREFIX}${id}`;
}
function userKeyLegacy(id: string) {
  return `${LEGACY_USER_PREFIX}${id}`;
}
function emailIndexKey(email: string) {
  return `${EMAIL_INDEX}${email}`;
}
function emailIndexKeyLegacy(email: string) {
  return `${LEGACY_EMAIL_INDEX}${email}`;
}
function sessionKey(token: string) {
  return `${SESS_PREFIX}${token}`;
}
function sessionKeyLegacy(token: string) {
  return `${LEGACY_SESS_PREFIX}${token}`;
}

/**
 * Signup used to auto-create an API key with this limit (via RETAILER_SIGNUP_TRYON_LIMIT, default 500).
 * Those links are removed from signup; strip any still stored on retailer accounts so the dashboard
 * shows the welcome / choose-a-plan state instead of a trial key.
 */
const LEGACY_SIGNUP_AUTO_TRYON_LIMIT = 500;
const LEGACY_SIGNUP_TIME_SKEW_MS = 15_000;

function clientLooksLikeLegacyAutoSignupKey(user: RetailerUser, client: ClientApiKeyRecord): boolean {
  if (client.usageLimit !== LEGACY_SIGNUP_AUTO_TRYON_LIMIT) return false;
  const tu = Date.parse(user.createdAt);
  const tc = Date.parse(client.createdAt);
  if (!Number.isFinite(tu) || !Number.isFinite(tc)) return false;
  return Math.abs(tu - tc) <= LEGACY_SIGNUP_TIME_SKEW_MS;
}

/**
 * If this account still points at an auto-provisioned signup client, unlink (and delete that client key).
 */
async function detachLegacySignupClientIfPresent(
  user: RetailerUser,
  userRedisKey: string,
): Promise<RetailerUser> {
  const cid = user.clientId?.trim();
  if (!cid) return user;

  const client = await getClientKeyRecordById(cid);
  if (!client) {
    const cleared: RetailerUser = { ...user, clientId: null };
    await getRedis().set(userRedisKey, JSON.stringify(cleared));
    return cleared;
  }

  if (!clientLooksLikeLegacyAutoSignupKey(user, client)) return user;

  const cleared: RetailerUser = { ...user, clientId: null };
  await getRedis().set(userRedisKey, JSON.stringify(cleared));
  await deleteClientKey(cid).catch(() => {});
  return cleared;
}

function parseRetailerUserRaw(raw: unknown): RetailerUser | null {
  if (typeof raw === "string") {
    try {
      const u = JSON.parse(raw) as RetailerUser;
      return {
        ...u,
        clientId: u.clientId ?? null,
        storeName: typeof u.storeName === "string" ? u.storeName : "",
      };
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === "object") {
    const u = raw as RetailerUser;
    return {
      ...u,
      clientId: u.clientId ?? null,
      storeName: typeof u.storeName === "string" ? u.storeName : "",
    };
  }
  return null;
}

/** Resolve stored user record; `legacy` drives which email index keys to use on profile update. */
async function loadRetailerRecord(
  id: string,
): Promise<{ user: RetailerUser; userRedisKey: string; legacy: boolean } | null> {
  if (!id) return null;
  const redis = getRedis();
  const kn = userKey(id);
  const rawNew = await redis.get(kn);
  if (rawNew != null) {
    const parsed = parseRetailerUserRaw(rawNew);
    if (!parsed) return null;
    const user = await detachLegacySignupClientIfPresent(parsed, kn);
    return { user, userRedisKey: kn, legacy: false };
  }
  const kl = userKeyLegacy(id);
  const rawLeg = await redis.get(kl);
  if (rawLeg == null) return null;
  const parsed = parseRetailerUserRaw(rawLeg);
  if (!parsed) return null;
  const user = await detachLegacySignupClientIfPresent(parsed, kl);
  return { user, userRedisKey: kl, legacy: true };
}

/** First non-empty session token from Fit Room or legacy cookie names. */
export function retailerSessionTokenFromCookieStore(
  jar: Awaited<ReturnType<typeof cookies>>,
): string | undefined {
  const primary = jar.get(RETAILER_SESSION_COOKIE)?.value?.trim();
  if (primary) return primary;
  for (const name of LEGACY_RETAILER_SESSION_COOKIE_NAMES) {
    const t = jar.get(name)?.value?.trim();
    if (t) return t;
  }
  return undefined;
}

export type RetailerUser = {
  id: string;
  /** Present for accounts created after registration form update. */
  firstName?: string;
  lastName?: string;
  email: string;
  /** Public store label used for API client keys in admin; required for new signups. */
  storeName: string;
  companyName: string;
  /** Normalized URL or empty string if omitted at signup. */
  websiteUrl: string;
  passwordSalt: string;
  passwordHash: string;
  /** Set when the account has an API key / active plan (admin or checkout). */
  clientId: string | null;
  createdAt: string;
  /** Soft-delete timestamp; deleted accounts are hidden from login/session and shown in admin recovery. */
  deletedAt?: string | null;
  /** Stripe subscription id after subscription checkout fulfillment (used for self-serve cancel). */
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  /** ISO instant when the retailer confirmed cancellation (subscription remains active until {@link subscriptionAccessUntil}). */
  subscriptionCanceledAt?: string | null;
  /** ISO instant (UTC) when plan access ends after a scheduled Stripe cancellation. */
  subscriptionAccessUntil?: string | null;
  cancellationReason?: string | null;
  cancellationComments?: string | null;
};

export type RetailerPublic = Omit<RetailerUser, "passwordSalt" | "passwordHash" | "stripeSubscriptionId" | "stripeCustomerId">;

/**
 * Retailer-facing try-on **purchases** (Stripe Checkout): only when Stripe subscription access is currently valid.
 *
 * Ineligible (`false`): never subscribed ({@link RetailerUser.stripeSubscriptionId} missing), billing access ended
 * ({@link RetailerUser.subscriptionAccessUntil} in the past when set), cancellation recorded without a remaining access
 * end date, or ambiguous legacy cancellation without `subscriptionAccessUntil`.
 *
 * Eligible during cancel-at-period-end only while {@link RetailerUser.subscriptionAccessUntil} is still in the future.
 */
export function retailerEligibleForTryOnTopUps(
  user: Pick<RetailerUser, "stripeSubscriptionId" | "subscriptionCanceledAt" | "subscriptionAccessUntil">,
): boolean {
  if (!user.stripeSubscriptionId?.trim()) return false;

  const untilRaw = user.subscriptionAccessUntil?.trim();
  if (untilRaw) {
    const endMs = Date.parse(untilRaw);
    if (Number.isFinite(endMs) && endMs <= Date.now()) return false;
    return true;
  }

  if (user.subscriptionCanceledAt?.trim()) return false;

  return true;
}

export function toPublicRetailer(u: RetailerUser): RetailerPublic {
  const {
    passwordSalt: _s,
    passwordHash: _h,
    stripeSubscriptionId: _sid,
    stripeCustomerId: _cid,
    ...rest
  } = u;
  return rest;
}

export function normalizeRetailerEmail(email: string) {
  return email.trim().toLowerCase();
}

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const HASH_BYTES = 64;

export function hashRetailerPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, HASH_BYTES, SCRYPT_PARAMS);
  return { salt: salt.toString("base64url"), hash: hash.toString("base64url") };
}

export function verifyRetailerPassword(password: string, saltB64: string, hashB64: string) {
  const salt = Buffer.from(saltB64, "base64url");
  const expected = Buffer.from(hashB64, "base64url");
  const hash = crypto.scryptSync(password, salt, HASH_BYTES, SCRYPT_PARAMS);
  if (hash.length !== expected.length) return false;
  return crypto.timingSafeEqual(hash, expected);
}

function normalizeWebsiteUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t.includes("://") ? t : `https://${t}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Empty string if blank; normalized URL if valid; throws if non-empty but invalid. */
function normalizeOptionalWebsiteUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const n = normalizeWebsiteUrl(t);
  if (!n) {
    throw new Error("Website URL is not valid. Leave blank or enter a full URL (e.g. https://example.com).");
  }
  return n;
}

export async function getRetailerById(id: string): Promise<RetailerUser | null> {
  const row = await loadRetailerRecord(id);
  const user = row?.user ?? null;
  if (!user) return null;
  if (user.deletedAt) return null;
  return user;
}

/** Associates a retailer dashboard account with a Fit Room client API key record (after checkout or admin assignment). */
export async function linkRetailerToClientId(retailerUserId: string, clientApiKeyRecordId: string): Promise<void> {
  const row = await loadRetailerRecord(retailerUserId.trim());
  if (!row) throw new Error("Retailer account not found.");
  const cid = clientApiKeyRecordId.trim();
  if (!cid) throw new Error("Client id is required.");

  const next: RetailerUser = { ...row.user, clientId: cid };
  await getRedis().set(row.userRedisKey, JSON.stringify(next));
}

/** Persist Stripe ids after subscription checkout (webhook fulfillment). */
export async function attachStripeBillingIds(
  retailerUserId: string,
  ids: { stripeSubscriptionId?: string | null; stripeCustomerId?: string | null },
): Promise<void> {
  const row = await loadRetailerRecord(retailerUserId.trim());
  if (!row) throw new Error("Retailer account not found.");

  const next: RetailerUser = {
    ...row.user,
    ...(ids.stripeSubscriptionId !== undefined
      ? { stripeSubscriptionId: ids.stripeSubscriptionId?.trim() || null }
      : {}),
    ...(ids.stripeCustomerId !== undefined ? { stripeCustomerId: ids.stripeCustomerId?.trim() || null } : {}),
  };
  await getRedis().set(row.userRedisKey, JSON.stringify(next));
}

/** After Stripe `cancel_at_period_end`, store cancellation metadata for dashboard + emails. */
export async function persistSubscriptionCancellationSchedule(params: {
  retailerUserId: string;
  subscriptionAccessUntil: string;
  subscriptionCanceledAt: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  cancellationReason: string;
  cancellationComments: string;
}): Promise<void> {
  const row = await loadRetailerRecord(params.retailerUserId.trim());
  if (!row) throw new Error("Retailer account not found.");

  const next: RetailerUser = {
    ...row.user,
    subscriptionAccessUntil: params.subscriptionAccessUntil,
    subscriptionCanceledAt: params.subscriptionCanceledAt,
    cancellationReason: params.cancellationReason,
    cancellationComments: params.cancellationComments.slice(0, 2000),
    ...(params.stripeSubscriptionId !== undefined
      ? { stripeSubscriptionId: params.stripeSubscriptionId?.trim() || null }
      : {}),
    ...(params.stripeCustomerId !== undefined
      ? { stripeCustomerId: params.stripeCustomerId?.trim() || null }
      : {}),
  };
  await getRedis().set(row.userRedisKey, JSON.stringify(next));
}

export async function findRetailerByEmail(email: string): Promise<RetailerUser | null> {
  const redis = getRedis();
  const norm = normalizeRetailerEmail(email);
  let id = redisUserIdFromIndex(await redis.get(emailIndexKey(norm)));
  if (!id) id = redisUserIdFromIndex(await redis.get(emailIndexKeyLegacy(norm)));
  if (!id) return null;
  const u = await getRetailerById(id);
  if (!u || u.deletedAt) return null;
  return u;
}

export async function deleteRetailerAccount(params: {
  userId: string;
  /** Current session token (if available) so we can invalidate it server-side. */
  sessionToken?: string;
}): Promise<void> {
  const row = await loadRetailerRecord(params.userId.trim());
  if (!row) throw new Error("Account not found.");

  const redis = getRedis();
  const emailNorm = normalizeRetailerEmail(row.user.email);
  const emailIdxKey = row.legacy ? emailIndexKeyLegacy(emailNorm) : emailIndexKey(emailNorm);

  const now = new Date().toISOString();

  const linkedClientId = row.user.clientId?.trim() || "";
  const clientRec = linkedClientId ? await getClientKeyRecordById(linkedClientId).catch(() => null) : null;
  const remainingTryOns =
    clientRec && Number.isFinite(clientRec.usageLimit) && Number.isFinite(clientRec.usageCount)
      ? Math.max(0, clientRec.usageLimit - clientRec.usageCount)
      : null;

  // Persist a dedicated recovery record (used by the Admin Recovery tab).
  await redis.set(
    `fit-room:recovery:${row.user.id}`,
    JSON.stringify({
      userId: row.user.id,
      storeName: row.user.storeName,
      email: row.user.email,
      deletedAt: now,
      clientId: linkedClientId || null,
      remainingTryOns,
    }),
  );

  const next: RetailerUser = {
    ...row.user,
    deletedAt: now,
    // Ensure credentials cannot be used even if indexes are re-created.
    passwordSalt: "",
    passwordHash: "",
  };
  await redis.set(row.userRedisKey, JSON.stringify(next));
  // Remove email index so the email can be reused for a new signup if desired.
  await redis.del(emailIdxKey).catch(() => {});

  // Soft-delete linked client key record so it moves to recovery and is not usable by embeds.
  if (linkedClientId) {
    await markClientKeyDeleted({ id: linkedClientId, deletedAt: now }).catch(() => {});
  }

  const t = params.sessionToken?.trim();
  if (t) {
    await redis.del(sessionKey(t)).catch(() => {});
    await redis.del(sessionKeyLegacy(t)).catch(() => {});
  }
}

export type DeletedRetailerAccountRow = {
  userId: string;
  email: string;
  storeName: string;
  companyName: string;
  clientId: string | null;
  deletedAt: string;
};

export type RetailerRecoveryRecord = {
  userId: string;
  storeName: string;
  email: string;
  deletedAt: string;
  clientId: string | null;
  remainingTryOns: number | null;
};

export async function listRetailerRecoveryRecords(limit = 250): Promise<RetailerRecoveryRecord[]> {
  const redis = getRedis();

  const keys = (await redis.keys("fit-room:recovery:*")) as string[];
  console.log(
    "[listRetailerRecoveryRecords] redis.keys('fit-room:recovery:*') count=%s keys=%o",
    keys.length,
    keys,
  );

  const rows: RetailerRecoveryRecord[] = [];
  if (keys.length === 0) {
    console.log("[listRetailerRecoveryRecords] no keys matched; returning []");
    return rows;
  }

  const vals = await redis.mget(...keys);
  console.log("[recovery] raw mget values:", JSON.stringify(vals));

  for (const raw of vals as Array<unknown>) {
    if (raw == null || typeof raw !== "object") continue;
    const p = raw as Partial<RetailerRecoveryRecord>;
    if (!p.userId || !p.deletedAt) continue;
    rows.push({
      userId: String(p.userId),
      storeName: String(p.storeName ?? ""),
      email: String(p.email ?? ""),
      deletedAt: String(p.deletedAt),
      clientId: p.clientId ? String(p.clientId) : null,
      remainingTryOns:
        typeof p.remainingTryOns === "number" && Number.isFinite(p.remainingTryOns) ? p.remainingTryOns : null,
    });
  }

  rows.sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : a.deletedAt > b.deletedAt ? -1 : 0));
  const result = rows.slice(0, limit);
  console.log("[listRetailerRecoveryRecords] returning %s row(s): %o", result.length, result);
  return result;
}

/** Removes the admin Recovery-tab snapshot only (`fit-room:recovery:{userId}`). Does not restore the account. */
export async function deleteRetailerRecoveryRecord(userId: string): Promise<void> {
  const id = userId.trim();
  if (!id) throw new Error("User id is required.");
  await getRedis().del(`fit-room:recovery:${id}`);
}

export async function listDeletedRetailerAccounts(limit = 200): Promise<DeletedRetailerAccountRow[]> {
  const redis = getRedis();

  type RedisScanResult = [number, string[]];
  type RedisScanFn = (
    cursor: number,
    opts: { match: string; count?: number },
  ) => Promise<RedisScanResult>;

  async function scanPrefix(prefix: string): Promise<DeletedRetailerAccountRow[]> {
    const rows: DeletedRetailerAccountRow[] = [];
    let cursor = 0;
    while (rows.length < limit) {
      const res = await (redis as unknown as { scan: RedisScanFn }).scan(cursor, {
        match: `${prefix}*`,
        count: 200,
      });
      cursor = res[0];
      const keys = res[1] ?? [];
      if (keys.length > 0) {
        const vals = (await redis.mget(...keys)) as Array<string | RetailerUser | null>;
        for (const raw of vals) {
          const u = parseRetailerUserRaw(raw);
          if (!u?.deletedAt) continue;
          rows.push({
            userId: u.id,
            email: u.email,
            storeName: u.storeName,
            companyName: u.companyName,
            clientId: u.clientId ?? null,
            deletedAt: u.deletedAt,
          });
          if (rows.length >= limit) break;
        }
      }
      if (cursor === 0) break;
    }
    return rows;
  }

  const merged = [...(await scanPrefix(USER_PREFIX)), ...(await scanPrefix(LEGACY_USER_PREFIX))];
  merged.sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : a.deletedAt > b.deletedAt ? -1 : 0));
  return merged.slice(0, limit);
}

export type RetailerEmailForQuotaNotice = {
  /** Redis retailer user row id (`RetailerUser.id`). */
  userId: string;
  email: string;
  storeName: string;
};

/**
 * End of yesterday in UTC (`23:59:59.999Z` on calendar yesterday) — always &lt;= `Date.now()` for eligibility checks.
 */
export function subscriptionAccessUntilYesterdayUtcIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}

/**
 * ADMIN / QA ONLY — writes {@link RetailerUser.subscriptionAccessUntil} on the Redis retailer record (typically to
 * simulate lapsed Stripe access for dashboard top-up UX).
 */
export async function adminSetRetailSubscriptionAccessUntilUtc(
  retailerUserId: string,
  subscriptionAccessUntilIsoUtc: string,
): Promise<void> {
  const row = await loadRetailerRecord(retailerUserId.trim());
  if (!row) throw new Error("Retailer account not found.");
  if (row.user.deletedAt) throw new Error("Retailer account is deleted.");
  const next: RetailerUser = {
    ...row.user,
    subscriptionAccessUntil: subscriptionAccessUntilIsoUtc.trim(),
  };
  await getRedis().set(row.userRedisKey, JSON.stringify(next));
}

/**
 * Finds retailer accounts pointing at `clientId` via Redis SCAN over user records.
 */
export async function listRetailersLinkedToClientId(
  clientId: string,
): Promise<RetailerEmailForQuotaNotice[]> {
  const cid = clientId.trim();
  if (!cid) return [];

  const redis = getRedis();
  const merged = new Map<string, RetailerEmailForQuotaNotice>();

  async function scanBucket(matchLiteralPrefix: string) {
    let cursor = 0;
    for (;;) {
      const tuple = await redis.scan(cursor, { match: `${matchLiteralPrefix}*`, count: 200 });
      const nextRaw = tuple[0] as unknown;
      const cursorNum =
        typeof nextRaw === "string"
          ? parseInt(nextRaw, 10)
          : typeof nextRaw === "number" && Number.isFinite(nextRaw)
            ? nextRaw
            : 0;
      const keys = (tuple[1] ?? []) as string[];
      for (const key of keys) {
        const raw = await redis.get(key);
        const u = parseRetailerUserRaw(raw);
        if (!u?.email?.trim() || u.clientId?.trim() !== cid) continue;
        merged.set(u.id, {
          userId: u.id,
          email: u.email.trim(),
          storeName: typeof u.storeName === "string" ? u.storeName : "",
        });
      }
      if (!Number.isFinite(cursorNum) || cursorNum === 0) break;
      cursor = cursorNum;
    }
  }

  await scanBucket(USER_PREFIX);
  await scanBucket(LEGACY_USER_PREFIX);

  return [...merged.values()];
}

/** Email index stores a UUID string; Upstash may return string or (rarely) another shape. */
function redisUserIdFromIndex(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    return s.length > 0 ? s : null;
  }
  return null;
}

export async function registerRetailer(params: {
  firstName: string;
  lastName: string;
  storeName: string;
  /** Display/organization name; may be empty (API client label falls back to full name). */
  companyName: string;
  email: string;
  websiteUrl: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
}): Promise<RetailerUser> {
  if (!params.agreeTerms) {
    throw new Error("You must accept the Terms & Conditions.");
  }
  if (!params.agreePrivacy) {
    throw new Error("You must accept the Privacy Policy.");
  }
  if (params.password !== params.confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  const firstName = params.firstName.trim();
  if (!firstName || firstName.length > 100) {
    throw new Error("First name is required (max 100 characters).");
  }
  const lastName = params.lastName.trim();
  if (!lastName || lastName.length > 100) {
    throw new Error("Last name is required (max 100 characters).");
  }

  const email = normalizeRetailerEmail(params.email);
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address.");
  }
  const storeName = params.storeName.trim();
  if (!storeName) {
    throw new Error("Store name is required.");
  }
  if (storeName.length > 200) {
    throw new Error("Store name must be at most 200 characters.");
  }
  const companyName = params.companyName.trim();
  if (companyName.length > 200) {
    throw new Error("Company name must be at most 200 characters.");
  }

  let websiteUrl: string;
  try {
    websiteUrl = normalizeOptionalWebsiteUrl(params.websiteUrl);
  } catch (e) {
    throw e instanceof Error ? e : new Error("Invalid website URL.");
  }

  const password = params.password;
  const pwdErr = validateRetailerPasswordStrength(password);
  if (pwdErr) {
    throw new Error(pwdErr);
  }

  const redis = getRedis();
  const takenNew = redisUserIdFromIndex(await redis.get(emailIndexKey(email)));
  const takenLegacy = redisUserIdFromIndex(await redis.get(emailIndexKeyLegacy(email)));
  if (takenNew || takenLegacy) {
    throw new Error("An account with this email already exists.");
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { salt, hash } = hashRetailerPassword(password);
  const user: RetailerUser = {
    id,
    firstName,
    lastName,
    email,
    storeName,
    companyName: companyName,
    websiteUrl,
    passwordSalt: salt,
    passwordHash: hash,
    clientId: null,
    createdAt: now,
  };

  try {
    await redis.set(emailIndexKey(email), id);
    await redis.set(userKey(id), JSON.stringify(user));
  } catch (e) {
    await redis.del(emailIndexKey(email));
    throw e instanceof Error ? e : new Error("Registration failed.");
  }

  return user;
}

/** True if either key namespace maps this email to a user id other than `exceptUserId`. */
async function retailerEmailInUseByOther(emailNorm: string, exceptUserId: string): Promise<boolean> {
  const redis = getRedis();
  const idN = redisUserIdFromIndex(await redis.get(emailIndexKey(emailNorm)));
  const idL = redisUserIdFromIndex(await redis.get(emailIndexKeyLegacy(emailNorm)));
  if (idN && idN !== exceptUserId) return true;
  if (idL && idL !== exceptUserId) return true;
  return false;
}

export async function updateRetailerProfile(params: {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  storeName: string;
  companyName: string;
  websiteUrl: string;
}): Promise<RetailerUser> {
  const row = await loadRetailerRecord(params.userId);
  if (!row) {
    throw new Error("Account not found.");
  }
  const existing = row.user;
  const userRedisKey = row.userRedisKey;
  const legacy = row.legacy;
  const emailIdx = (e: string) => (legacy ? emailIndexKeyLegacy(e) : emailIndexKey(e));

  const firstName = params.firstName.trim();
  if (!firstName || firstName.length > 100) {
    throw new Error("First name is required (max 100 characters).");
  }
  const lastName = params.lastName.trim();
  if (!lastName || lastName.length > 100) {
    throw new Error("Last name is required (max 100 characters).");
  }

  const email = normalizeRetailerEmail(params.email);
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address.");
  }

  const storeName = params.storeName.trim();
  if (!storeName) {
    throw new Error("Store name is required.");
  }
  if (storeName.length > 200) {
    throw new Error("Store name must be at most 200 characters.");
  }

  const companyName = params.companyName.trim();
  if (companyName.length > 200) {
    throw new Error("Company name must be at most 200 characters.");
  }

  let websiteUrl: string;
  try {
    websiteUrl = normalizeOptionalWebsiteUrl(params.websiteUrl);
  } catch (e) {
    throw e instanceof Error ? e : new Error("Invalid website URL.");
  }

  const redis = getRedis();
  const prevEmail = normalizeRetailerEmail(existing.email);

  if (email !== prevEmail) {
    if (await retailerEmailInUseByOther(email, existing.id)) {
      throw new Error("An account with this email already exists.");
    }
  }

  const next: RetailerUser = {
    ...existing,
    firstName,
    lastName,
    email,
    storeName,
    companyName,
    websiteUrl,
  };

  try {
    if (email !== prevEmail) {
      await redis.del(emailIdx(prevEmail));
      await redis.set(emailIdx(email), existing.id);
    }
    await redis.set(userRedisKey, JSON.stringify(next));
  } catch (e) {
    if (email !== prevEmail) {
      await redis.set(emailIdx(prevEmail), existing.id).catch(() => {});
      await redis.del(emailIdx(email)).catch(() => {});
    }
    throw e instanceof Error ? e : new Error("Could not save profile.");
  }

  return next;
}

export async function createRetailerSessionToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  const redis = getRedis();
  await redis.set(sessionKey(token), userId, { ex: RETAILER_SESSION_REDIS_TTL_SEC });
  return token;
}

export async function getUserIdFromSessionToken(token: string | undefined): Promise<string | null> {
  if (!token?.trim()) return null;
  const redis = getRedis();
  const t = token.trim();
  const raw =
    (await redis.get(sessionKey(t))) ?? (await redis.get(sessionKeyLegacy(t)));
  return parseSessionUserId(raw);
}

/** Session value is a plain user id; accept legacy JSON payloads and object-shaped values from the client. */
function parseSessionUserId(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    if (s.startsWith("{")) {
      try {
        const p = JSON.parse(s) as { userId?: unknown };
        return typeof p.userId === "string" ? p.userId : null;
      } catch {
        return null;
      }
    }
    return s;
  }
  if (typeof raw === "object" && raw !== null && "userId" in raw) {
    const u = (raw as { userId: unknown }).userId;
    return typeof u === "string" ? u : null;
  }
  return null;
}

export async function destroyRetailerSessionToken(token: string) {
  if (!token.trim()) return;
  const redis = getRedis();
  const t = token.trim();
  await redis.del(sessionKey(t));
  await redis.del(sessionKeyLegacy(t));
}

export async function getRetailerSessionUser(): Promise<RetailerUser | null> {
  const jar = await cookies();
  const token = retailerSessionTokenFromCookieStore(jar);
  const userId = await getUserIdFromSessionToken(token);
  if (!userId) return null;
  return getRetailerById(userId);
}

export async function setRetailerSessionCookie(token: string) {
  const jar = await cookies();
  const secure = retailerSessionCookieSecure();
  jar.set({
    name: RETAILER_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    // Session cookie: no Max-Age — discarded when the browser ends the session (varies by browser / "restore session").
  });
  const clear = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 0,
  };
  for (const name of LEGACY_RETAILER_SESSION_COOKIE_NAMES) {
    jar.set({ name, value: "", ...clear });
  }
}

/** Prefer this in Route Handlers — pairs the cookie with the returned {@link NextResponse} (reliable Set-Cookie). */
export function applyRetailerSessionToNextResponse(res: NextResponse, token: string) {
  const secure = retailerSessionCookieSecure();
  res.cookies.set(RETAILER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
  });
  const expired = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 0,
  };
  for (const name of LEGACY_RETAILER_SESSION_COOKIE_NAMES) {
    res.cookies.set(name, "", expired);
  }
}

export function clearRetailerSessionOnNextResponse(res: NextResponse) {
  const secure = retailerSessionCookieSecure();
  const expired = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 0,
  };
  res.cookies.set(RETAILER_SESSION_COOKIE, "", expired);
  for (const name of LEGACY_RETAILER_SESSION_COOKIE_NAMES) {
    res.cookies.set(name, "", expired);
  }
}

export async function clearRetailerSessionCookie() {
  const jar = await cookies();
  const secure = retailerSessionCookieSecure();
  const expired = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 0,
  };
  jar.set({
    name: RETAILER_SESSION_COOKIE,
    value: "",
    ...expired,
  });
  for (const name of LEGACY_RETAILER_SESSION_COOKIE_NAMES) {
    jar.set({ name, value: "", ...expired });
  }
}

const PASSWORD_RESET_PREFIX = "fit-room:retailer:pwd-reset:";
const PASSWORD_RESET_TTL_SEC = 60 * 60;

/**
 * Stores a one-time token (1 hour) for self-service password reset. Does not reveal whether the user exists.
 */
export async function createRetailerPasswordResetToken(userId: string): Promise<string> {
  const id = userId.trim();
  if (!id) throw new Error("User id is required.");
  const token = crypto.randomBytes(32).toString("base64url");
  await getRedis().set(`${PASSWORD_RESET_PREFIX}${token}`, JSON.stringify({ userId: id }), {
    ex: PASSWORD_RESET_TTL_SEC,
  });
  return token;
}

/**
 * Sets a new password using a valid token, then deletes the token.
 */
export async function resetRetailerPasswordWithToken(token: string, newPassword: string): Promise<void> {
  const t = token.trim();
  if (!t) {
    throw new Error("Reset link is invalid.");
  }
  const key = `${PASSWORD_RESET_PREFIX}${t}`;
  const redis = getRedis();
  const raw = await redis.get(key);
  if (raw == null || typeof raw !== "string") {
    throw new Error("This reset link is invalid or has expired. Request a new one from the login page.");
  }
  let userId: string;
  try {
    const p = JSON.parse(raw) as { userId?: unknown };
    if (typeof p.userId !== "string" || !p.userId.trim()) throw new Error("bad");
    userId = p.userId.trim();
  } catch {
    throw new Error("This reset link is invalid or has expired.");
  }

  const pwdErr = validateRetailerPasswordStrength(newPassword);
  if (pwdErr) {
    throw new Error(pwdErr);
  }

  const row = await loadRetailerRecord(userId);
  if (!row?.user || row.user.deletedAt) {
    await redis.del(key).catch(() => {});
    throw new Error("This reset link is invalid or has expired.");
  }

  const { salt, hash } = hashRetailerPassword(newPassword);
  const next: RetailerUser = { ...row.user, passwordSalt: salt, passwordHash: hash };
  await redis.set(row.userRedisKey, JSON.stringify(next));
  await redis.del(key);
}
