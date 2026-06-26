import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import {
  clearAllTryOnErrorLogs,
  deleteTryOnErrorLog,
  getUnreadTryOnErrorLogCount,
  listTryOnErrorLogs,
  markAllTryOnErrorLogsRead,
} from "@/lib/tryOnErrorLogStore";

export const runtime = "nodejs";

async function requireAdmin() {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

async function listLogsPayload() {
  const [unreadCount, logs] = await Promise.all([
    getUnreadTryOnErrorLogCount(),
    listTryOnErrorLogs(200),
  ]);
  return { unreadCount, logs };
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const url = new URL(req.url);
    if (url.searchParams.get("badge") === "1") {
      const unreadCount = await getUnreadTryOnErrorLogCount();
      return Response.json({ unreadCount });
    }

    const { unreadCount, logs } = await listLogsPayload();
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

  const clearAll =
    typeof body === "object" &&
    body !== null &&
    (body as { clearAll?: unknown }).clearAll === true;

  if (clearAll) {
    try {
      await clearAllTryOnErrorLogs();
      const { unreadCount, logs } = await listLogsPayload();
      return Response.json({ ok: true, unreadCount, logs });
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "Could not clear error logs." },
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
      return Response.json({ error: "Missing log id." }, { status: 400 });
    }

    try {
      const ok = await deleteTryOnErrorLog(deleteId);
      if (!ok) return Response.json({ error: "Log entry not found." }, { status: 404 });
      const { unreadCount, logs } = await listLogsPayload();
      return Response.json({ ok: true, unreadCount, logs });
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "Could not delete log entry." },
        { status: 503 },
      );
    }
  }

  const markAllRead =
    typeof body === "object" &&
    body !== null &&
    (body as { markAllRead?: unknown }).markAllRead === true;

  if (markAllRead) {
    try {
      await markAllTryOnErrorLogsRead();
      const { unreadCount, logs } = await listLogsPayload();
      return Response.json({ ok: true, unreadCount, logs });
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "Could not mark error logs as read." },
        { status: 503 },
      );
    }
  }

  return Response.json({ error: "Unsupported action." }, { status: 400 });
}
