import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRedis } from "@/lib/apiKeyStore";
import { RETAILER_PASSWORD_MAX, RETAILER_PASSWORD_MIN } from "@/lib/retailerPasswordPolicy";

export const RETAILER_SESSION_COOKIE = "disquant_retailer_session";

const SESSION_TTL_SEC = 60 * 60 * 24 * 14; // 14 days

/**
 * Use `AUTH_INSECURE_COOKIE=1` when running `next start` (production NODE_ENV) over **http** locally;
 * otherwise `Secure` cookies are not stored and login loops back to `/login`.
 */
function retailerSessionCookieSecure(): boolean {
  if (process.env.AUTH_INSECURE_COOKIE === "1") return false;
  return process.env.NODE_ENV === "production";
}

const USER_PREFIX = "disquant:retailer:user:";
const EMAIL_INDEX = "disquant:retailer:email:";
const SESS_PREFIX = "disquant:retailer:session:";

function userKey(id: string) {
  return `${USER_PREFIX}${id}`;
}
function emailIndexKey(email: string) {
  return `${EMAIL_INDEX}${email}`;
}
function sessionKey(token: string) {
  return `${SESS_PREFIX}${token}`;
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
  if (!id) return null;
  const redis = getRedis();
  const raw = await redis.get(userKey(id));
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const u = JSON.parse(raw) as RetailerUser;
      return { ...u, clientId: u.clientId ?? null };
    } catch {
      return null;
    }
  }
  const u = raw as RetailerUser;
  return { ...u, clientId: u.clientId ?? null };
}

export async function findRetailerByEmail(email: string): Promise<RetailerUser | null> {
  const redis = getRedis();
  const rawId = await redis.get(emailIndexKey(normalizeRetailerEmail(email)));
  const id = redisUserIdFromIndex(rawId);
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
  if (password.length < RETAILER_PASSWORD_MIN) {
    throw new Error(`Password must be at least ${RETAILER_PASSWORD_MIN} characters.`);
  }
  if (password.length > RETAILER_PASSWORD_MAX) {
    throw new Error(`Password must be at most ${RETAILER_PASSWORD_MAX} characters.`);
  }

  const redis = getRedis();
  const taken = await redis.get(emailIndexKey(email));
  if (taken) {
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

export async function createRetailerSessionToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  const redis = getRedis();
  await redis.set(sessionKey(token), userId, { ex: SESSION_TTL_SEC });
  return token;
}

export async function getUserIdFromSessionToken(token: string | undefined): Promise<string | null> {
  if (!token?.trim()) return null;
  const redis = getRedis();
  const raw = await redis.get(sessionKey(token.trim()));
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
  await getRedis().del(sessionKey(token.trim()));
}

export async function getRetailerSessionUser(): Promise<RetailerUser | null> {
  const jar = await cookies();
  const token = jar.get(RETAILER_SESSION_COOKIE)?.value;
  const userId = await getUserIdFromSessionToken(token);
  if (!userId) return null;
  return getRetailerById(userId);
}

export async function setRetailerSessionCookie(token: string) {
  const jar = await cookies();
  jar.set({
    name: RETAILER_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: retailerSessionCookieSecure(),
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

/** Prefer this in Route Handlers — pairs the cookie with the returned {@link NextResponse} (reliable Set-Cookie). */
export function applyRetailerSessionToNextResponse(res: NextResponse, token: string) {
  res.cookies.set(RETAILER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: retailerSessionCookieSecure(),
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export function clearRetailerSessionOnNextResponse(res: NextResponse) {
  res.cookies.set(RETAILER_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: retailerSessionCookieSecure(),
    path: "/",
    maxAge: 0,
  });
}

export async function clearRetailerSessionCookie() {
  const jar = await cookies();
  jar.set({
    name: RETAILER_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: retailerSessionCookieSecure(),
    path: "/",
    maxAge: 0,
  });
}
