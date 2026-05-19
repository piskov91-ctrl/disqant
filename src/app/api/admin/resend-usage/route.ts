import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";

export const runtime = "nodejs";

const RESEND_EMAILS_URL = "https://api.resend.com/emails?limit=1";

function parseQuotaHeader(value: string | null): number | null {
  if (value == null || value === "") return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const apiKey = (process.env.RESEND_FULL_API_KEY || "").trim();
  if (!apiKey) {
    return Response.json(
      {
        error: "RESEND_FULL_API_KEY is not set in the server environment.",
        apiKeyValid: false,
      },
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
      {
        error: e instanceof Error ? e.message : "Could not reach Resend API.",
        apiKeyValid: false,
      },
      { status: 502 },
    );
  }

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
    return Response.json({ error: message, apiKeyValid: false }, { status: 502 });
  }

  const dailySent = parseQuotaHeader(res.headers.get("x-resend-daily-quota"));
  const monthlySent = parseQuotaHeader(res.headers.get("x-resend-monthly-quota"));

  return Response.json({
    apiKeyValid: true,
    dailySent,
    monthlySent,
  });
}
