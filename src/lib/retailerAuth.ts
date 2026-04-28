import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  deleteClientKey,
  getClientKeyRecordById,
  getRedis,
  type ClientApiKeyRecord,
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
      return { ...u, clientId: u.clientId ?? null };
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === "object") {
    const u = raw as RetailerUser;
    return { ...u, clientId: u.clientId ?? null };
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
  companyName: string;
  /** Normalized URL or empty string if omitted at signup. */
  websiteUrl: string;
  passwordSalt: string;
  passwordHash: string;
  /** Set when the account has an API key / active plan (admin or checkout). */
  clientId: string | null;
  createdAt: string;
};

export type RetailerPublic = Omit<RetailerUser, "passwordSalt" | "passwordHash">;

export function toPublicRetailer(u: RetailerUser): RetailerPublic {
  const { passwordSalt: _s, passwordHash: _h, ...rest } = u;
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
  return row?.user ?? null;
}

export async function findRetailerByEmail(email: string): Promise<RetailerUser | null> {
  const redis = getRedis();
  const norm = normalizeRetailerEmail(email);
  let id = redisUserIdFromIndex(await redis.get(emailIndexKey(norm)));
  if (!id) id = redisUserIdFromIndex(await redis.get(emailIndexKeyLegacy(norm)));
  if (!id) return null;
  return getRetailerById(id);
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
