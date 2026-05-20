import { cookies } from "next/headers";
import { ADMIN_AUTH_COOKIE, isAdminAuthorizedCookieValue } from "@/lib/adminAuth";
import {
  approveSubscriptionsFeedback,
  getPendingSubscriptionsFeedbackCount,
  listPendingSubscriptionsFeedback,
  rejectSubscriptionsFeedback,
  type SubscriptionsFeedbackRecord,
} from "@/lib/subscriptionsFeedbackStore";

export const runtime = "nodejs";

async function requireAdmin(): Promise<boolean> {
  const jar = await cookies();
  return isAdminAuthorizedCookieValue(jar.get(ADMIN_AUTH_COOKIE)?.value);
}

/** Redact payloads for logs / accidental exposure beyond admin. */
function sanitize(rows: SubscriptionsFeedbackRecord[]) {
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    rating: r.rating,
    message: r.message,
    storeName: r.storeName,
    status: r.status,
  }));
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) return Response.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const url = new URL(req.url);
    if (url.searchParams.get("badge") === "1") {
      const pendingCount = await getPendingSubscriptionsFeedbackCount();
      return Response.json({ pendingCount });
    }

    const pending = await listPendingSubscriptionsFeedback(200);
    return Response.json({ pending: sanitize(pending) });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not load subscription reviews from Redis (check KV_REST_API_URL / KV_REST_API_TOKEN).",
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

  const b =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  const action = typeof b.action === "string" ? b.action.trim().toLowerCase() : "";
  const id = typeof b.id === "string" ? b.id.trim() : "";

  if (!id.length || (action !== "approve" && action !== "reject")) {
    return Response.json({ error: "Expected { action: \"approve\"|\"reject\", id }." }, { status: 400 });
  }

  try {
    if (action === "approve") {
      await approveSubscriptionsFeedback(id);
    } else {
      await rejectSubscriptionsFeedback(id);
    }

    const [pendingCount, pending] = await Promise.all([
      getPendingSubscriptionsFeedbackCount(),
      listPendingSubscriptionsFeedback(200),
    ]);

    return Response.json({
      ok: true,
      pendingCount,
      pending: sanitize(pending),
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Action failed." }, { status: 400 });
  }
}
