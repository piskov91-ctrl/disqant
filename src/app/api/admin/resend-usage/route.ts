import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";

export const runtime = "nodejs";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";

/** Display caps aligned with Resend free transactional tier (docs). */
const RESEND_DISPLAY_DAILY_LIMIT = 100;
const RESEND_DISPLAY_MONTHLY_LIMIT = 3000;

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

function parseQuotaHeader(headers: Headers, name: string): number | null {
  const raw = headers.get(name);
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    return Response.json(
      { error: "RESEND_API_KEY is not set in the server environment." },
      { status: 503 },
    );
  }

  let res: Response;
  try {
    res = await fetch(RESEND_EMAILS_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not reach Resend API." },
      { status: 502 },
    );
  }

  const dailyUsed = parseQuotaHeader(res.headers, "x-resend-daily-quota");
  const monthlyUsed = parseQuotaHeader(res.headers, "x-resend-monthly-quota");

  const text = await res.text();

  if (!res.ok) {
    let message = `Resend API returned ${res.status}.`;
    if (text) {
      try {
        const body = JSON.parse(text) as { message?: unknown };
        if (typeof body.message === "string" && body.message.trim()) {
          message = body.message.trim();
        }
      } catch {
        /* ignore */
      }
    }
    return Response.json(
      {
        error: message,
        dailyUsed,
        monthlyUsed,
        dailyLimit: RESEND_DISPLAY_DAILY_LIMIT,
        monthlyLimit: RESEND_DISPLAY_MONTHLY_LIMIT,
      },
      { status: 502 },
    );
  }

  return Response.json({
    dailyUsed,
    monthlyUsed,
    dailyLimit: RESEND_DISPLAY_DAILY_LIMIT,
    monthlyLimit: RESEND_DISPLAY_MONTHLY_LIMIT,
  });
}
