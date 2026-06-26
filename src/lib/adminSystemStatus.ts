import { getRedis } from "@/lib/apiKeyStore";

const FASHN_CREDITS_URL = "https://api.fashn.ai/v1/credits";
const RESEND_DOMAINS_URL = "https://api.resend.com/domains";
const RESEND_EMAILS_URL = "https://api.resend.com/emails";

/** Below this balance, Fashn shows a yellow low-credits warning (Try-On Max ≈ 2 credits / try-on). */
export const FASHN_LOW_CREDITS_THRESHOLD = 100;

export type AdminSystemServiceState = "ok" | "warning" | "error";

export type AdminSystemServiceCheck = {
  id: "tryOnApi" | "fashnApi" | "redis" | "resend";
  label: string;
  state: AdminSystemServiceState;
  message: string;
  creditsTotal?: number;
};

export type AdminSystemStatusResult = {
  checkedAt: string;
  services: AdminSystemServiceCheck[];
};

type FashnCreditsPayload = {
  credits?: {
    total?: number;
    subscription?: number;
    on_demand?: number;
  };
};

export function resolveAdminSystemStatusOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

function parseFashnErrorMessage(text: string, status: number, data?: { error?: unknown }): string {
  let message = text.trim();
  if (data) {
    if (typeof data.error === "string") message = data.error;
    else if (
      data.error != null &&
      typeof data.error === "object" &&
      "message" in data.error &&
      typeof (data.error as { message?: unknown }).message === "string"
    ) {
      message = String((data.error as { message: string }).message);
    }
  }
  return message.trim() || `Fashn /credits failed (${status}).`;
}

function parseFashnCreditsTotal(data: FashnCreditsPayload): number | null {
  const c = data.credits;
  const total = typeof c?.total === "number" && Number.isFinite(c.total) ? c.total : null;
  const subscription =
    typeof c?.subscription === "number" && Number.isFinite(c.subscription) ? c.subscription : null;
  const onDemand = typeof c?.on_demand === "number" && Number.isFinite(c.on_demand) ? c.on_demand : null;
  return total ?? (subscription != null && onDemand != null ? subscription + onDemand : null);
}

function extractResendErrorMessage(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as { message?: unknown; error?: unknown; name?: unknown };
    if (typeof parsed.message === "string") return parsed.message.trim();
    if (typeof parsed.error === "string") return parsed.error.trim();
    if (parsed.error != null && typeof parsed.error === "object" && "message" in parsed.error) {
      const nested = (parsed.error as { message?: unknown }).message;
      if (typeof nested === "string") return nested.trim();
    }
  } catch {
    // keep raw text
  }
  return trimmed;
}

function resendKeyCanSendEmails(status: number, message: string): boolean {
  if (status === 422 || status === 400) return true;
  if (status === 401 && /restricted to only send emails/i.test(message)) return true;
  return false;
}

async function checkTryOnApi(origin: string): Promise<Pick<AdminSystemServiceCheck, "state" | "message">> {
  try {
    const res = await fetch(`${origin}/api/try-on`, {
      method: "OPTIONS",
      cache: "no-store",
    });
    if (!res.ok) {
      return { state: "error", message: `OPTIONS /api/try-on returned ${res.status}.` };
    }
    return { state: "ok", message: "Operational" };
  } catch (e) {
    return {
      state: "error",
      message: e instanceof Error ? e.message : "Could not reach /api/try-on.",
    };
  }
}

async function checkFashnApi(): Promise<Pick<AdminSystemServiceCheck, "state" | "message" | "creditsTotal">> {
  const apiKey = (process.env.FASHN_API_KEY || "").trim();
  if (!apiKey) {
    return { state: "error", message: "FASHN_API_KEY is not set in the server environment." };
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
      state: "error",
      message: e instanceof Error ? e.message : "Could not reach Fashn API.",
    };
  }

  const text = await res.text().catch(() => "");
  let data: FashnCreditsPayload & { error?: unknown } = {};
  if (text) {
    try {
      data = JSON.parse(text) as FashnCreditsPayload & { error?: unknown };
    } catch {
      return { state: "error", message: `Fashn credits response was not JSON (${res.status}).` };
    }
  }

  if (!res.ok) {
    return {
      state: "error",
      message: parseFashnErrorMessage(text, res.status, data),
    };
  }

  const creditsTotal = parseFashnCreditsTotal(data);
  if (creditsTotal == null) {
    return { state: "error", message: "Fashn returned no usable credit fields." };
  }

  const formatted = creditsTotal.toLocaleString("en-GB");

  if (creditsTotal <= 0) {
    return { state: "error", message: "0 credits remaining.", creditsTotal };
  }

  if (creditsTotal <= FASHN_LOW_CREDITS_THRESHOLD) {
    return {
      state: "warning",
      message: `${formatted} credits remaining (low)`,
      creditsTotal,
    };
  }

  return {
    state: "ok",
    message: `${formatted} credits remaining`,
    creditsTotal,
  };
}

async function checkRedis(): Promise<Pick<AdminSystemServiceCheck, "state" | "message">> {
  try {
    const pong = await getRedis().ping();
    if (pong !== "PONG") {
      return { state: "error", message: `Unexpected Redis ping response: ${String(pong)}` };
    }
    return { state: "ok", message: "Operational" };
  } catch (e) {
    return {
      state: "error",
      message:
        e instanceof Error
          ? e.message
          : "Could not reach Redis (check UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).",
    };
  }
}

async function checkResend(): Promise<Pick<AdminSystemServiceCheck, "state" | "message">> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { state: "error", message: "RESEND_API_KEY is not set in the server environment." };
  }

  const authHeaders = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  let sendRes: Response;
  try {
    // Empty body triggers validation errors (422) when the key can authenticate for send.
    sendRes = await fetch(RESEND_EMAILS_URL, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({}),
      cache: "no-store",
    });
  } catch (e) {
    return {
      state: "error",
      message: e instanceof Error ? e.message : "Could not reach Resend API.",
    };
  }

  const sendText = await sendRes.text().catch(() => "");
  const sendMessage = extractResendErrorMessage(sendText);

  if (resendKeyCanSendEmails(sendRes.status, sendMessage)) {
    return { state: "ok", message: "Operational" };
  }

  if (sendRes.status === 403) {
    return { state: "error", message: sendMessage || "Invalid Resend API key." };
  }

  // Send-only keys return 401 on read endpoints; treat that as operational.
  try {
    const domainsRes = await fetch(RESEND_DOMAINS_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (domainsRes.ok) {
      return { state: "ok", message: "Operational" };
    }

    const domainsText = await domainsRes.text().catch(() => "");
    const domainsMessage = extractResendErrorMessage(domainsText);
    if (resendKeyCanSendEmails(domainsRes.status, domainsMessage)) {
      return { state: "ok", message: "Operational" };
    }
  } catch {
    // fall through to send error below
  }

  if (sendRes.status === 401) {
    return { state: "error", message: sendMessage || "Invalid Resend API key." };
  }

  return {
    state: "error",
    message: sendMessage || `Resend send check failed (${sendRes.status}).`,
  };
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
