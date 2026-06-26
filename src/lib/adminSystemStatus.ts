import { getRedis } from "@/lib/apiKeyStore";

const FASHN_CREDITS_URL = "https://api.fashn.ai/v1/credits";
const RESEND_DOMAINS_URL = "https://api.resend.com/domains";

export type AdminSystemServiceCheck = {
  id: "tryOnApi" | "fashnApi" | "redis" | "resend";
  label: string;
  ok: boolean;
  error?: string;
};

export type AdminSystemStatusResult = {
  checkedAt: string;
  services: AdminSystemServiceCheck[];
};

export function resolveAdminSystemStatusOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

async function checkTryOnApi(origin: string): Promise<Pick<AdminSystemServiceCheck, "ok" | "error">> {
  try {
    const res = await fetch(`${origin}/api/try-on`, {
      method: "OPTIONS",
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: `OPTIONS /api/try-on returned ${res.status}.` };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not reach /api/try-on.",
    };
  }
}

async function checkFashnApi(): Promise<Pick<AdminSystemServiceCheck, "ok" | "error">> {
  const apiKey = (process.env.FASHN_API_KEY || "").trim();
  if (!apiKey) {
    return { ok: false, error: "FASHN_API_KEY is not set in the server environment." };
  }

  let res: Response;
  try {
    res = await fetch(FASHN_CREDITS_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not reach Fashn API.",
    };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text.trim();
    if (message) {
      try {
        const parsed = JSON.parse(message) as { error?: unknown };
        if (typeof parsed.error === "string") message = parsed.error;
        else if (
          parsed.error != null &&
          typeof parsed.error === "object" &&
          "message" in parsed.error &&
          typeof (parsed.error as { message?: unknown }).message === "string"
        ) {
          message = String((parsed.error as { message: string }).message);
        }
      } catch {
        // keep raw text
      }
    }
    return {
      ok: false,
      error: message || `Fashn /credits failed (${res.status}).`,
    };
  }

  return { ok: true };
}

async function checkRedis(): Promise<Pick<AdminSystemServiceCheck, "ok" | "error">> {
  try {
    const pong = await getRedis().ping();
    if (pong !== "PONG") {
      return { ok: false, error: `Unexpected Redis ping response: ${String(pong)}` };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Could not reach Redis (check UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).",
    };
  }
}

async function checkResend(): Promise<Pick<AdminSystemServiceCheck, "ok" | "error">> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not set in the server environment." };
  }

  let res: Response;
  try {
    res = await fetch(RESEND_DOMAINS_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not reach Resend API.",
    };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text.trim();
    if (message) {
      try {
        const parsed = JSON.parse(message) as { message?: unknown; error?: unknown };
        if (typeof parsed.message === "string") message = parsed.message;
        else if (typeof parsed.error === "string") message = parsed.error;
      } catch {
        // keep raw text
      }
    }
    return {
      ok: false,
      error: message || `Resend API failed (${res.status}).`,
    };
  }

  return { ok: true };
}

export async function runAdminSystemStatusChecks(request: Request): Promise<AdminSystemStatusResult> {
  const origin = resolveAdminSystemStatusOrigin(request);
  const [tryOnApi, fashnApi, redis, resend] = await Promise.all([
    checkTryOnApi(origin),
    checkFashnApi(),
    checkRedis(),
    checkResend(),
  ]);

  return {
    checkedAt: new Date().toISOString(),
    services: [
      { id: "tryOnApi", label: "Main API (/api/try-on)", ...tryOnApi },
      { id: "fashnApi", label: "Fashn.ai API", ...fashnApi },
      { id: "redis", label: "Redis (Upstash)", ...redis },
      { id: "resend", label: "Resend email", ...resend },
    ],
  };
}
