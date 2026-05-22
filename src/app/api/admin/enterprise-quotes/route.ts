import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import {
  deleteEnterpriseQuote,
  getUnreadEnterpriseQuoteCount,
  listEnterpriseQuotes,
  markAllEnterpriseQuotesRead,
} from "@/lib/enterpriseQuoteInquiriesStore";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const url = new URL(req.url);
    if (url.searchParams.get("badge") === "1") {
      const unreadCount = await getUnreadEnterpriseQuoteCount();
      return Response.json({ unreadCount });
    }

    const [unreadCount, quotes] = await Promise.all([
      getUnreadEnterpriseQuoteCount(),
      listEnterpriseQuotes(200),
    ]);
    return Response.json({ unreadCount, quotes });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not read enterprise quotes from Redis (check KV_REST_API_URL / KV_REST_API_TOKEN).",
      },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const markAllRead =
    typeof body === "object" &&
    body !== null &&
    (body as { markAllRead?: unknown }).markAllRead === true;

  if (markAllRead) {
    try {
      await markAllEnterpriseQuotesRead();
      const [unreadCount, quotes] = await Promise.all([
        getUnreadEnterpriseQuoteCount(),
        listEnterpriseQuotes(200),
      ]);
      return Response.json({ ok: true, unreadCount, quotes });
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "Could not mark submissions as read." },
        { status: 503 },
      );
    }
  }

  const wantDelete =
    typeof body === "object" &&
    body !== null &&
    (body as { delete?: unknown }).delete === true;

  if (wantDelete) {
    const deleteId =
      typeof body === "object" &&
      body !== null &&
      "id" in body &&
      typeof (body as { id: unknown }).id === "string"
        ? (body as { id: string }).id.trim()
        : "";

    if (!deleteId) {
      return Response.json({ error: "Missing submission id." }, { status: 400 });
    }

    try {
      const ok = await deleteEnterpriseQuote(deleteId);
      if (!ok) return Response.json({ error: "Submission not found." }, { status: 404 });
      const [unreadCount, quotes] = await Promise.all([
        getUnreadEnterpriseQuoteCount(),
        listEnterpriseQuotes(200),
      ]);
      return Response.json({ ok: true, unreadCount, quotes });
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "Could not delete submission." },
        { status: 503 },
      );
    }
  }

  return Response.json({ error: "Invalid request body." }, { status: 400 });
}
