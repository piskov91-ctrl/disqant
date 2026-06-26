import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import {
  getUnreadTryOnErrorLogCount,
  listTryOnErrorLogs,
  markAllTryOnErrorLogsRead,
} from "@/lib/tryOnErrorLogStore";

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
      const unreadCount = await getUnreadTryOnErrorLogCount();
      return Response.json({ unreadCount });
    }

    const [unreadCount, logs] = await Promise.all([
      getUnreadTryOnErrorLogCount(),
      listTryOnErrorLogs(200),
    ]);
    return Response.json({ unreadCount, logs });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not read try-on error logs from Redis (check KV_REST_API_URL / KV_REST_API_TOKEN).",
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

  if (!markAllRead) {
    return Response.json({ error: "Unsupported action." }, { status: 400 });
  }

  try {
    await markAllTryOnErrorLogsRead();
    const [unreadCount, logs] = await Promise.all([
      getUnreadTryOnErrorLogCount(),
      listTryOnErrorLogs(200),
    ]);
    return Response.json({ ok: true, unreadCount, logs });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not mark error logs as read." },
      { status: 503 },
    );
  }
}
