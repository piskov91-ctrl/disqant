import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";

export const runtime = "nodejs";

const RESEND_DOMAINS_URL = "https://api.resend.com/domains";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    return Response.json(
      { error: "RESEND_API_KEY is not set in the server environment.", apiKeyValid: false },
      { status: 503 },
    );
  }

  let res: Response;
  try {
    res = await fetch(RESEND_DOMAINS_URL, {
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

  let domainCount: number | null = null;
  if (text) {
    try {
      const body = JSON.parse(text) as { data?: unknown };
      if (Array.isArray(body.data)) {
        domainCount = body.data.length;
      }
    } catch {
      /* ignore */
    }
  }

  return Response.json({
    apiKeyValid: true,
    domainCount,
  });
}
